# フェーズ①: Next.js版 会議室予約アプリ 実装PLAN

> react-router版（ver3）と**同じ機能**のアプリを Next.js (App Router) で作り直す。
> 目的は Next.js の学習であり、機能追加ではない。UI・見た目・Tailwindのクラスは ver3 からそのまま流用する。

---

## 0. 全体像（3フェーズの中でのこのPLANの位置）

| フェーズ | 内容 | 主に学ぶこと |
|---|---|---|
| **① 今回** | Next.js版アプリ作成（DBはSupabaseのまま） | App Router / Server Component / Server Actions |
| ② 次 | DBを Supabase → SQLite に変更 | サーバー側のDB接続、SQL、トランザクション |
| ③ その次 | Googleアカウントでログイン | 認証（Auth.js）、OAuth、セッション、Googleカレンダー連携の下地 |

**このPLANの設計上の最重要ポイント**は、②③を見据えて **「データアクセス層（`src/lib/bookings.ts`）を1枚挟む」** こと。
フェーズ①ではその中身がSupabase呼び出しだが、フェーズ②では**このファイルだけを差し替えれば SQLite に移行できる**状態にしておく。画面側（page/component）は一切触らずに済む。ここを最初に分けておくかどうかが、②で楽をできるかの分かれ目になる。

**フェーズ①でやらないこと**（意図的に後回し）:
- 認証、ログイン、ユーザー管理 → ③
- SQLite、DBスキーマの変更 → ②（**フェーズ①ではSupabase側は一切変更しない**。既存の `rooms` / `bookings` テーブルと `create_booking` / `update_booking` / `delete_booking` RPC をそのまま使う）
- 本番デプロイの自動化 → 「9. デプロイについて」を参照。フェーズ①は**ローカル開発で完結**させる
- テストの導入、機能追加（繰り返し予約・通知など）

---

## 1. Context: 何が本質的に変わるのか

ver3（react-router版）の構造は、CLAUDE.md にある通り「**`App` がデータの持ち主になり、`Outlet` の `context` で子ルートにデータを配る**」というもの。

```
main.tsx → AppRoutes.tsx → App.tsx（state を全部持つ）
                              ├─ useEffect で supabase から fetch
                              ├─ useState: rooms, bookings, editingBooking, errorMessage
                              └─ <Outlet context={bookingContext} /> で子に配る
```

これは「**ブラウザの中だけで完結するアプリ**」の作り方だ。ブラウザが空のHTMLを受け取り、JSを実行し、そこから初めてSupabaseにデータを取りに行く。だから `useEffect` が必要で、データを1箇所（App）に集めて配る必要があった。

Next.js（App Router）はここが根本から違う。**ページのコンポーネントがサーバー上で実行され、データを取得し終えたHTMLがブラウザに届く**。すると：

- `useEffect` でのデータ取得が**不要**になる。`async function Page() { const rooms = await getRooms() }` と書くだけ。
- `rooms` / `bookings` の `useState` が**消える**。サーバーが毎回取ってくるので、クライアントに保持する必要がない。
- **`BookingContext` と `useOutletContext` の仕組みごと不要**になる。各ページが自分で必要なデータを取るので、親から配ってもらう必要がない。ver3で一番苦労した「Contextでデータを配る」構造が、Next.jsでは**そもそも問題として存在しない**。
- 逆に、`useState` / `onClick` / `onChange` を使いたいコンポーネントには **`'use client'`** という宣言が必要になる。「どこまでがサーバーで、どこからがブラウザか」という**新しい境界線**を意識することが、Next.js学習の中心になる。
- データの更新（作成・編集・削除）は **Server Actions** で行う。「ボタンを押したらサーバー上の関数が直接呼ばれる」という、fetch も API ルートも書かない仕組み。
- 更新後の画面反映は `setBookings([...bookings, newBooking])` のような**手動のstate更新ではなく**、`revalidatePath()` で「サーバーに再取得させる」形になる。

**ゴール**: ver3 と見た目・機能が同じアプリを、上の仕組みで作り直す。「同じものを別の作り方で作る」ので、差分がそのまま学習内容になる。

---

## 2. 学習テーマ一覧

| # | テーマ | 使うAPI / 記法 | 登場ステップ |
|---|---|---|---|
| 1 | ファイルベースルーティング | `app/new/page.tsx` の配置そのもの | Step 1 |
| 2 | 共通レイアウト | `app/layout.tsx` + `{children}` | Step 1 |
| 3 | Server Component でのデータ取得 | `export default async function Page()` + `await` | Step 2 |
| 4 | サーバー / クライアントの境界 | `'use client'`, `server-only` | Step 2 |
| 5 | URLクエリの読み取り（サーバー） | `searchParams` プロップ（**Promise**） | Step 3 |
| 6 | URLクエリの書き込み（クライアント） | `useRouter().push()`, `useSearchParams()` | Step 3 |
| 7 | アクティブなリンクの判定 | `usePathname()` + `<Link>` | Step 1 |
| 8 | データ更新 | Server Actions（`'use server'`） | Step 4 |
| 9 | 更新後の再描画 | `revalidatePath()`, `router.refresh()` | Step 4 |
| 10 | フォームの状態管理 | `useActionState()`, `useFormStatus()` | Step 4 |
| 11 | プログラムからの画面遷移 | `redirect()`（サーバー） / `useRouter()`（クライアント） | Step 4 |
| 12 | ローディングとエラーのUI | `loading.tsx`, `error.tsx`, `not-found.tsx`, `<Suspense>` | Step 6 |

---

## 3. 対応表: react-router版 → Next.js版（★このPLANの核心）

**移行作業中は常にこの表を見ながら進めること。**

| ver3（react-router版） | Next.js版 | 補足 |
|---|---|---|
| `main.tsx`（`createRoot` + `BrowserRouter`） | **不要**（削除） | フレームワークが描画とルーティングの土台を持つ |
| `index.html` | **不要**（`app/layout.tsx` が `<html>` を持つ） | メタ情報は `export const metadata` |
| `AppRoutes.tsx` の `<Route>` 定義 | **不要**。ファイルの配置場所がそのままURL | `app/schedule/page.tsx` → `/schedule` |
| `App.tsx`（レイアウトルート） | `app/layout.tsx` | ただし**stateは持てない**（Server Component） |
| `<Outlet />` | `{children}` | |
| `<Outlet context={...}>` / `useOutletContext()` | **不要**。各ページが自分で `await getRooms()` | ver3最大の仕掛けが丸ごと消える |
| `types/booking.ts` の `BookingContext` 型 | **削除** | `Room` / `Booking` 型はそのまま使う |
| `<NavLink>` + `isActive` | `<Link>` + `usePathname()` で自前判定 | `isActive` 相当は無いので自分で書く |
| `useNavigate()` | `useRouter().push()`（クライアント） / `redirect()`（サーバー） | |
| `useSearchParams()`（読み書き両方） | 読み: `page` の `searchParams` プロップ / 書き: `useRouter().push()` | Next の `useSearchParams()` は**読み取り専用** |
| `linkWithDate()` ヘルパー | ほぼ同じものが必要（`?date=` の引き継ぎ） | 考え方は完全に流用できる |
| `useEffect(() => { fetchRooms() }, [])` | `const rooms = await getRooms()` | useEffect自体が不要になる |
| `useState<Booking[]>` で保持 | **保持しない**。サーバーが毎回渡す | |
| `supabase.rpc(...)` をクライアントから呼ぶ | Server Action の中から呼ぶ | 鍵がブラウザに出なくなる |
| `setBookings([...bookings, newBooking])` | `revalidatePath('/schedule')` | 「自分で足す」→「取り直させる」 |
| `<Route path="*" element={<Navigate to="/new" />} />` | 存在しないURLは**自動で404**。`not-found.tsx` で見た目を作る | 挙動が変わる点（後述） |
| `public/.htaccess` の rewrite | **不要** | SPAフォールバックはNext.jsの守備範囲 |
| `vite.config.ts` の `base: '/conferenceRoom/'` | **不要**（ローカル開発では） | サブパス配信が必要なら `basePath` |
| `import.meta.env.VITE_*` | `process.env.*` | `NEXT_PUBLIC_` を付けない＝サーバー限定 |

---

## 4. 決定事項（このPLANの前提）

実装前に迷わないよう、判断が必要な箇所を先に決めておく。

1. **App Router を使う**（`pages/` ではなく `app/`）。今のNext.jsの標準であり、Server Components / Server Actions はこちらにしかない。
2. **新しいディレクトリ・新しいGitリポジトリで作る**。`~/Documents/Conference_room_booking_next/` を想定。`create-next-app` が独自のディレクトリ構成を作るため、ver3 のリポジトリに混ぜると両方が読みにくくなる。ver3 は**手を触れずに残し、いつでも見比べられる状態**にしておくこと（これが一番の教材になる）。
3. **Supabaseへのアクセスはサーバー側だけに限定する**。`NEXT_PUBLIC_` を付けない環境変数にして、ブラウザに鍵を出さない。これはセキュリティ上の改善であると同時に、フェーズ②（SQLiteはサーバーからしか触れない）への必然的な布石。
4. **データアクセス層 `src/lib/bookings.ts` を必ず作る**。page や component から `supabase` を直接呼ばない。フェーズ②で差し替えるのはこのファイルだけ、という状態を維持する。
5. **Supabase側は変更しない**。既存の `rooms` / `bookings` テーブルと3つのRPCをそのまま使う。ver3 とNext.js版が同じデータを見ることになるので、動作比較もしやすい。
6. **編集モーダルの開閉stateは `RoomSchedule`（クライアントコンポーネント）が持つ**。ver3 では `App` が `editingBooking` を持っていたが、`app/layout.tsx` は Server Component なので state を持てない。1階層下ろす。
   （発展形として「編集画面をルートにする」`/schedule/[id]/edit` + Intercepting Routes という Next.js らしいやり方もあるが、フェーズ①ではやらない。Step 7 の任意課題とする。）
7. **フェーズ①はローカル開発で完結**。デプロイは「9. デプロイについて」の通り、XServerへのFTPデプロイは今回は引き継がない。

---

## 5. プロジェクト構成（完成形）

```
conference-room-booking-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← ver3 の App.tsx の「枠」部分（h1・タブバー）。Server Component
│   │   ├── page.tsx            ← "/" 。/new へリダイレクトするだけ
│   │   ├── globals.css         ← @import "tailwindcss";（ver3 の index.css と同じ）
│   │   ├── new/
│   │   │   └── page.tsx        ← ver3 の routes/NewBookingPage.tsx。async Server Component
│   │   ├── schedule/
│   │   │   └── page.tsx        ← ver3 の routes/SchedulePage.tsx。async Server Component
│   │   ├── loading.tsx         ← Step 6
│   │   ├── error.tsx           ← Step 6（'use client' 必須）
│   │   └── not-found.tsx       ← Step 6
│   ├── components/
│   │   ├── TabBar.tsx          ← 新規。'use client'（usePathname を使うため）
│   │   ├── DateSelect.tsx      ← ver3 から移植 + 'use client' + router.push
│   │   ├── BookingForm.tsx     ← ver3 から移植 + 'use client' + Server Action 呼び出し
│   │   ├── RoomSchedule.tsx    ← ver3 から移植 + 'use client' + モーダルstateを保持
│   │   └── EditBookingModal.tsx← ver3 から移植 + 'use client' + Server Action 呼び出し
│   ├── lib/
│   │   ├── supabase.ts         ← ver3 から移植（import.meta.env → process.env）
│   │   ├── bookings.ts         ★データアクセス層。フェーズ②で差し替える唯一のファイル
│   │   └── actions.ts          ★Server Actions（'use server'）
│   ├── types/
│   │   └── booking.ts          ← ver3 からコピー（BookingContext は削除）
│   └── utils/
│       └── datetime.ts         ← ver3 からそのままコピー（変更不要）
├── .env.local                  ← SUPABASE_URL / SUPABASE_ANON_KEY（gitignore済み）
├── next.config.ts
├── package.json
└── tsconfig.json
```

**ver3 からそのままコピーできるファイル**: `utils/datetime.ts`、`types/booking.ts`（`BookingContext` だけ削除）。
**JSXの中身（Tailwindのクラスや `<select>` の構造）は全コンポーネントでそのまま流用できる**。変わるのは「データがどこから来るか」と「送信時に何を呼ぶか」だけ。ここを理解しておくと移植作業が非常に楽になる。

---

## 6. 実装ステップ

各ステップの最後に必ず `npm run dev` でブラウザ確認をしてから次へ進むこと。まとめて書くとどこで壊れたか分からなくなる。

---

### Step 0: プロジェクト作成と下ごしらえ

```bash
cd ~/Documents
npx create-next-app@latest conference-room-booking-next
```

対話の回答:

| 質問 | 回答 |
|---|---|
| TypeScript | **Yes** |
| ESLint | **Yes** |
| Tailwind CSS | **Yes** |
| `src/` directory | **Yes** |
| App Router | **Yes** |
| import alias (`@/*`) | **Yes**（デフォルト） |
| その他（Turbopack / React Compiler など） | デフォルトのまま |

インストール後に `package.json` を開き、**Next.js のバージョンを確認する**（2026年8月時点の最新は 16.x）。このPLANは Next.js 15以降を前提にしている。特に **`searchParams` が Promise になったのは 15 から**なので、もし 14 系が入った場合は `await` が不要になる（公式ドキュメントで確認すること）。Tailwind は ver3 と同じ v4 が入るので、`globals.css` は `@import "tailwindcss";` の一行で ver3 と同じ書き味になる。

やること:
1. `src/utils/datetime.ts` を ver3 からコピー（**無変更**）
2. `src/types/booking.ts` を ver3 からコピーし、`BookingContext` インターフェースを**削除**
3. `.env.local` を作る（`VITE_` プレフィックスは付けない）:
   ```
   SUPABASE_URL=（ver3の .env と同じ値）
   SUPABASE_ANON_KEY=（ver3の .env と同じ値）
   ```
4. `npm install @supabase/supabase-js server-only`
   - `server-only` は「このファイルをクライアントコンポーネントからimportしたらビルドを失敗させる」ためだけのパッケージ。境界を間違えたときに**実行時ではなくビルド時に気づける**ので、学習中こそ入れておく価値がある。
5. `src/lib/supabase.ts` を作る:
   ```ts
   import 'server-only'
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_ANON_KEY!,
   )
   ```
   ver3 との違いは `import.meta.env.VITE_*` → `process.env.*` と、`import 'server-only'` の1行だけ。

**検証**: `npm run dev` → `http://localhost:3000` で Next.js の初期ページが出る。`.gitignore` に `.env.local` が入っていることを確認。

---

### Step 1: ルーティングと共通レイアウトだけを作る（データなし）

まずデータ取得を一切せず、**画面の骨組みとURL遷移だけ**を完成させる。ここで App Router のルーティングを体で覚える。

**`src/app/layout.tsx`** — ver3 の `App.tsx` の「枠」の部分に相当。

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import TabBar from '@/components/TabBar'
import './globals.css'

export const metadata: Metadata = {
  title: '会議室予約アプリ ver4（Next.js版）',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">ver4（Next.js版）</h1>
          <Suspense><TabBar /></Suspense>
          {children}
        </div>
      </body>
    </html>
  )
}
```

- `{children}` が ver3 の `<Outlet />` にあたる。
- `<Suspense>` で `TabBar` を包むのは**必須**。`useSearchParams()` を使うクライアントコンポーネントは Suspense 境界がないとビルドが失敗する（理由は「8. 落とし穴」を参照）。

**`src/components/TabBar.tsx`** — `NavLink` の代わり。

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export default function TabBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // ver3 の linkWithDate() と同じ役割：現在の ?date= を引き継ぐ
  const withDate = (href: string) => {
    const qs = searchParams.toString()
    return qs ? `${href}?${qs}` : href
  }
  const className = (href: string) =>
    pathname === href
      ? 'px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-bold'
      : 'px-4 py-2 text-gray-500 hover:text-gray-700'

  return (
    <div className="flex border-b mb-6">
      <Link href={withDate('/new')} className={className('/new')}>予約を作成</Link>
      <Link href={withDate('/schedule')} className={className('/schedule')}>スケジュール</Link>
    </div>
  )
}
```

ver3 との違いを意識すること: `NavLink` は `isActive` をフレームワークが計算してくれたが、Next.js の `<Link>` にその機能はないので `usePathname()` で自分で比較する。

**`src/app/page.tsx`** — ver3 の `<Route index element={<Navigate to="/new" replace />} />` に相当。

```tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/new')
}
```

**`src/app/new/page.tsx` / `src/app/schedule/page.tsx`** — この時点では `<h2>予約を作成</h2>` だけの仮実装で良い。

**検証**:
- `/` が `/new` にリダイレクトされる
- タブをクリックすると `/new` ⇄ `/schedule` が切り替わり、**選択中タブの下線スタイルが正しく当たる**
- `/hoge` を開くと Next.js のデフォルト404が出る（ver3 は `/new` にリダイレクトしていた。**挙動が変わる**が、これがNext.jsの標準。Step 6 で見た目を整える）
- `npm run build` が通る（ここで Suspense を忘れているとエラーになる。エラーを一度見ておくと理解が深まる）

---

### Step 2: Server Component でデータを表示する（読み取りのみ）

ここが Next.js の核心。`useEffect` を使わずにデータを表示する。

**`src/lib/bookings.ts`** ★フェーズ②で差し替える唯一のファイル

```ts
import 'server-only'
import { supabase } from './supabase'
import type { Room, Booking } from '@/types/booking'

export async function getRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms').select('*').order('name', { ascending: true })
  if (error) throw new Error('会議室の取得に失敗しました')
  return data as Room[]
}

export async function getBookingsForDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings').select('*')
    .eq('booking_date', date)
    .order('start_time', { ascending: true })
  if (error) throw new Error('予約の取得に失敗しました')
  return data as Booking[]
}
```

ver3 では `console.error` して黙って空配列のままだったが、ここでは **`throw` する**。Next.js では投げられたエラーを `error.tsx`（Step 6）が受け止めてくれるので、握りつぶすより素直な設計になる。

**`src/app/schedule/page.tsx`**

```tsx
import RoomSchedule from '@/components/RoomSchedule'
import { getRooms, getBookingsForDate } from '@/lib/bookings'
import { todayISO } from '@/utils/datetime'

export default async function SchedulePage() {
  const selectedDate = todayISO()   // Step 3 で searchParams から取るようにする
  // 2つのクエリは互いに独立なので並列で投げる（ver3 の useEffect 2本に相当）
  const [rooms, bookings] = await Promise.all([
    getRooms(),
    getBookingsForDate(selectedDate),
  ])

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">スケジュール</h2>
      <RoomSchedule rooms={rooms} bookings={bookings} />
    </div>
  )
}
```

`async function` であること、`await` していること、そして `useState` も `useEffect` も無いことを噛みしめる。**この関数はブラウザでは一度も実行されない。**

**`src/components/RoomSchedule.tsx`**: ver3 からコピーし、
- 先頭に `'use client'` を追加
- `onEdit` / `onDelete` プロップを**一旦削除**（Step 5 で戻す）
- JSXの「変更」「キャンセル」ボタンも一旦削除

**検証**:
- `/schedule` に今日の予約が表示される
- **ブラウザの DevTools → Network → ドキュメントのレスポンスを見る**。HTMLの中に会議室名や予約タイトルが**最初から入っている**ことを確認する。ver3 では空の `<div id="root">` だけだった。これがサーバーレンダリングの実物。
- DevTools → Network で `supabase.co` へのリクエストが**ブラウザから出ていない**ことを確認（サーバーが代わりに叩いている）
- 試しに `RoomSchedule.tsx` の `'use client'` を消してみて、何が起きるか観察する（`onClick` が無い今の状態ならエラーにならないはず。この境界の感覚が Step 4 以降で効いてくる）

---

### Step 3: `?date=` との連動

ver3 の `useSearchParams` による日付管理を、Next.js の「サーバーで読み、クライアントで書く」形に置き換える。

**サーバー側（読む）** — `src/app/schedule/page.tsx`

```tsx
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams        // ★Next.js 15以降は Promise。await が必要
  const selectedDate = date ?? todayISO()    // ver3 の `?? todayISO()` と同じ発想
  const [rooms, bookings] = await Promise.all([
    getRooms(),
    getBookingsForDate(selectedDate),
  ])
  ...
}
```

`src/app/new/page.tsx` も同様に `searchParams` を受け取り、`getRooms()` と `selectedDate` を `BookingForm` に渡す。

**クライアント側（書く）** — `src/components/DateSelect.tsx`

ver3 の `onChange` プロップを、`useRouter().push()` に置き換える。

```tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { formatWeekday, todayISO } from '@/utils/datetime'

export default function DateSelect({ value, label = '日付' }: { value: string; label?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  // 日付を変えると URL が変わり、サーバーがその日のデータで再レンダリングする
  const onChange = (date: string) => router.push(`${pathname}?date=${date}`)
  // ...JSXは ver3 の DateSelect.tsx をそのまま流用（曜日・今日バッジ含む）
}
```

`router.push()` の後に何が起きるかを理解すること: URLが変わる → Next.js がそのURLのページをサーバーに要求 → サーバーが新しい日付でDBを引いてレンダリング → 差分がクライアントに適用される。**ページ全体のリロードは起きない**が、データ取得はサーバーで走っている。ver3 の「`setSelectedDate` → `useEffect` → `fetch`」と結果は同じで、経路がまったく違う。

**ついでにここで ver3 のリファクタ積み残しを片付ける**: ver3 では `SchedulePage` が「今日」バッジのために `DateSelect` を使わず `<input type="date">` を直書きしていた（CLAUDE.md に記載の未完了リファクタ）。`DateSelect` 側は既に曜日と「今日」の表示を持っているので、**Next.js版では両ページとも `<DateSelect />` を使う**形に統一する。

**検証**:
- `/schedule?date=2026-09-15` を直接アドレスバーに入れてリロード → その日の予約が出る
- 日付を変えるとURLが変わり、表示も変わる
- **タブを往復しても `?date=` が消えない**（`TabBar` の `withDate()` が効いている）
- ブラウザの戻る/進むで日付が正しく戻る
- `/schedule?date=hoge` のような不正な値でもクラッシュしない（DBが空を返すだけ、を確認）

---

### Step 4: Server Actions で予約を作成する

ここが2つ目の山場。**「フォームを送信したらサーバーの関数が直接呼ばれる」** という仕組みを体験する。

**`src/lib/bookings.ts` に追加**

```ts
export type BookingInput = {
  room_id: string
  booking_date: string
  start_time: string
  end_time: string
  reserver_name: string
  title: string
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_room_id: input.room_id,
    p_booking_date: input.booking_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_reserver_name: input.reserver_name,
    p_title: input.title,
  })
  if (error) throw new Error('この時間帯は既に予約されています')
  return data as Booking
}

// 重複チェック。ver3 では BookingForm と EditBookingModal に
// ほぼ同じコードが2箇所に散っていたが、ここに1本化する
export async function hasOverlap(
  input: Pick<BookingInput, 'room_id' | 'booking_date' | 'start_time' | 'end_time'>,
  excludeId?: string,
): Promise<boolean> { /* ver3 の some() のロジックをそのまま移植 */ }
```

**`src/lib/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createBooking, hasOverlap } from './bookings'

export type ActionState = { error: string } | null

export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = {
    room_id: String(formData.get('room_id') ?? ''),
    booking_date: String(formData.get('booking_date') ?? ''),
    start_time: String(formData.get('start_time') ?? ''),
    end_time: String(formData.get('end_time') ?? ''),
    reserver_name: String(formData.get('reserver_name') ?? ''),
    title: String(formData.get('title') ?? ''),
  }

  // ★バリデーションはサーバー側で必ずやり直す。
  //   クライアント側のチェックは「親切」であって「保証」ではない
  if (Object.values(input).some((v) => !v)) return { error: 'すべてのフィールドを入力してください' }
  if (input.end_time <= input.start_time) return { error: '終了時刻は開始時刻より後である必要があります' }
  if (await hasOverlap(input)) return { error: 'この時間帯は既に予約されています' }

  try {
    await createBooking(input)
  } catch (e) {
    return { error: e instanceof Error ? e.message : '予約の作成に失敗しました' }
  }

  revalidatePath('/schedule')                          // キャッシュを捨てて次回サーバーで取り直させる
  redirect(`/schedule?date=${input.booking_date}`)     // ★try の外。理由は「8. 落とし穴」
}
```

`revalidatePath` が ver3 の `setBookings([...bookings, newBooking])` の代わり。**手でstateに足すのではなく、「そのURLのデータはもう古い」とNext.jsに教えるだけ**。次にそのページが表示されるとき、サーバーが新しいデータで作り直す。

`redirect()` が ver3 の `navigate(linkWithDate('/schedule'))` の代わり。

**`src/components/BookingForm.tsx`**: ver3 からコピーして、
- 先頭に `'use client'`
- `supabase` の import を**削除**（クライアントから消える）
- `handleSubmit` を丸ごと削除し、`<form action={formAction}>` に置き換え
- 各 `<select>` / `<input>` に `name` 属性を付ける（`name="room_id"` など。FormDataのキーになる）
- 日付は `<input type="hidden" name="booking_date" value={selectedDate} />` で送る
- `errorMessage` / `onErrorChange` プロップは不要になり、`useActionState` に置き換わる:

```tsx
const [state, formAction, isPending] = useActionState(createBookingAction, null)
// state?.error でエラー表示、isPending で「作成中...」表示（ver3 の isLoading と同じ）
```

もし `useActionState` が難しく感じたら、**先に「`useState` でエラーを持ち、`onSubmit` の中で `await createBookingAction(...)` を直接呼ぶ」形で動かしてから** `useActionState` に書き換えても良い。Server Action はクライアントコンポーネントから**ただの async 関数のように呼べる**（内部で自動的にサーバーへのリクエストになる）ので、どちらでも動く。両方書いてみると `useActionState` が何を肩代わりしているかがよく分かる。

**残るローカルstate**: `startTime`（終了時刻の選択肢を絞り込むため）は `useState` のまま残す。「サーバーに持たせるもの」と「クライアントに残すもの」の線引きを考える良い題材。

**検証**:
- 予約を作成 → `/schedule?date=...` に遷移し、**作成した予約が表示されている**
- 重複する時間帯で作成 → エラーメッセージが出て、遷移しない
- 未入力で送信 → エラーメッセージが出る
- 送信中はボタンが「作成中...」になり押せない
- DevTools → Network で、送信時にブラウザから `supabase.co` ではなく**自分のサーバー宛にPOSTが飛んでいる**ことを確認する（これがServer Actionの正体）
- **JSを無効にしてもフォームが送信できるか試す**（`<form action={serverAction}>` はJSなしでも動く。ver3 では絶対に不可能だったこと）

---

### Step 5: 編集と削除

**`src/lib/bookings.ts`** に `updateBooking(id, input)` / `deleteBooking(id)` を追加（ver3 の `update_booking` / `delete_booking` RPC 呼び出しをそのまま移植）。

**`src/lib/actions.ts`** に `updateBookingAction` / `deleteBookingAction` を追加。どちらも最後に `revalidatePath('/schedule')`。

**削除**: `RoomSchedule.tsx`（クライアントコンポーネント）から Server Action を直接呼ぶ。

```tsx
const handleDelete = async (booking: Booking) => {
  if (!window.confirm(`「${booking.title}」の予約をキャンセルしますか？`)) return
  await deleteBookingAction(booking.id)
  // ★setBookings は無い。revalidatePath がサーバー側で効き、画面が自動で更新される
}
```

ver3 の `setBookings(bookings.filter(...))` が消えることを確認すること。**クライアントには消すべき配列がそもそも無い。**

**編集モーダル**: 決定事項6の通り、`editingBooking` state は `RoomSchedule` が持つ。

```tsx
'use client'
export default function RoomSchedule({ rooms, bookings }: Props) {
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  // ...一覧のJSXは ver3 のまま
  // 末尾に {editingBooking && <EditBookingModal ... onClose={() => setEditingBooking(null)} />}
}
```

`EditBookingModal.tsx` は ver3 からコピーし、`'use client'` を付け、`supabase.rpc` 呼び出しを `updateBookingAction` に差し替える。`onBookingUpdated` は**再取得をしない**（`revalidatePath` がやる）ので、モーダルを閉じるだけになる。ver3 では `fetchBookingsForDate(selectedDate)` を呼んでいた箇所が不要になる点を確認すること。

**検証**:
- 予約の「変更」→ モーダルが開き、既存値が入っている
- 更新 → モーダルが閉じ、**一覧が新しい内容に更新されている**
- 重複する時間に更新 → モーダル内にエラーが出て閉じない
- 「キャンセル」→ 確認ダイアログ → 削除され、一覧から消える
- 別の日付に変更した予約が、その日付のスケジュールに移動していること
- ここまでで **ver3 と機能が完全に一致**しているはず。2つのアプリを並べて開いて動作を見比べる

---

### Step 6: 仕上げ（ローディング・エラー・404）

Next.js が用意している「特別なファイル名」を使う。ver3 には対応物が無い、Next.js固有の学習項目。

1. **`src/app/loading.tsx`** — サーバーがデータを取得している間に出る。`<p className="text-gray-500">読み込み中...</p>` 程度で十分。日付を切り替えたときに一瞬表示される。
2. **`src/app/error.tsx`** — `getRooms()` などが `throw` したときに表示される。**`'use client'` が必須**で、`error` と `reset` を props で受け取る決まり。`.env.local` の `SUPABASE_URL` をわざと壊して発火させてみると理解が早い。
3. **`src/app/not-found.tsx`** — `/hoge` を開いたときの画面。ver3 では `/new` にリダイレクトしていたが、Next.jsでは「404を出す」のが標準。「予約を作成へ戻る」リンクを置いておけば実用上は同じ。
4. `layout.tsx` の `metadata` でタイトルを整える。
5. `npm run lint` と `npm run build` を通す。

**検証**: 上記1〜3がそれぞれ意図通り表示されること。`npm run build` のログで各ルートが `ƒ (Dynamic)` と表示されることを確認する（`searchParams` を使っているのでリクエストごとにサーバーで描画される、という意味）。

---

### Step 7: 任意課題（余力があれば）

フェーズ①の必須範囲ではないが、Next.jsの理解を深めるための課題。

- **編集をルート化する**: `/schedule/[id]/edit` を作り、動的ルート（`[id]`）と `params` を学ぶ。さらに Intercepting Routes（`(.)edit`）+ Parallel Routes を使うと「一覧の上にモーダルで重なるが、URLは変わり、リロードすると単独ページとして開く」という、Next.jsらしい挙動が作れる。**難易度は高い**ので、Step 6 まで完全に動いてから別ブランチで挑戦すること。
- **`RoomSchedule` を Server Component に戻す**: 一覧の描画はサーバーに任せ、「変更/キャンセル」ボタンだけを小さなクライアントコンポーネントに切り出す。「クライアントに送るJSを最小にする」という App Router の設計思想を体験できる。
- **`useFormStatus()`** を使った送信ボタンの分離。

---

## 7. React の基礎として押さえておくこと

ver3（純粋なReact）で身につけたもののうち、Next.js版でも**そのまま生き続けるもの**と、**使わなくなるもの**を意識しておくと、「Reactの知識」と「Next.jsの知識」の切り分けができる。

| ver3 で学んだこと | Next.js版での扱い |
|---|---|
| JSX、条件付きレンダリング、`map` でのリスト描画、`key` | **そのまま**。何も変わらない |
| props、分割代入、TypeScriptの型定義 | **そのまま**。むしろ出番が増える |
| `useState`（フォーム入力・モーダル開閉） | **残る**。ただしクライアントコンポーネント内に限定 |
| `useState`（サーバーのデータの保持） | **消える**。サーバーが持つ |
| `useEffect`（データ取得） | **消える**。これが最大の変化 |
| Context / `useOutletContext`（データを配る） | **消える**。各ページが自分で取る |
| イベントハンドラ、`e.preventDefault()` | フォームは `<form action={...}>` に置き換わるので出番が減る |

---

## 8. 落とし穴（ハマる前に読む）

Next.js特有で、かつ**エラーメッセージから原因が分かりにくい**ものを挙げる。

1. **`searchParams` / `params` は Promise（Next.js 15以降）**
   `searchParams.date` と書くと型エラーになる。`const { date } = await searchParams` が正解。ページ関数を `async` にする必要がある。

2. **`useSearchParams()` は `<Suspense>` で包まないとビルドが落ちる**
   `npm run dev` では動くのに `npm run build` で `useSearchParams() should be wrapped in a suspense boundary` と言われる典型パターン。`TabBar` が該当する（`layout.tsx` で既に `<Suspense>` で包む設計にしてある）。**dev で動いたからOK、ではない。こまめに `npm run build` を通すこと。**

3. **`redirect()` を `try/catch` の中で呼ばない**
   Next.js の `redirect()` は内部的に特別な例外を throw して実現されている。`try` の中で呼ぶと `catch` がそれを飲み込んでしまい、リダイレクトが起きない上に「予約の作成に失敗しました」のような誤ったエラーが出る。**必ず `try/catch` の外側で呼ぶ**（Step 4 のコードがそうなっている）。

4. **`'use client'` は「そのファイル以下すべて」に伝染する**
   `'use client'` を付けたファイルが import しているモジュールは、まとめてクライアントバンドルに入る。だから `lib/supabase.ts` や `lib/bookings.ts` をクライアントコンポーネントから import してはいけない（鍵が漏れる）。`import 'server-only'` を入れておくと、間違えたときにビルドが**明示的に**失敗して教えてくれる。

5. **`revalidatePath()` の呼び忘れ**
   作成・更新・削除が成功しているのに画面が変わらない、という現象になる。DBを直接見ると更新されている、という症状が出たらまずこれを疑う。逆に、モーダルを閉じるだけで済ませたいときは `router.refresh()` という手もあるので、両者の違いを一度試しておくと良い。

6. **`NEXT_PUBLIC_` を付けると鍵がブラウザに出る**
   Vite の `VITE_` の癖で反射的に接頭辞を付けたくなるが、**このアプリでは付けてはいけない**。付けなければ `process.env.X` はサーバーでしか読めず、クライアントでは `undefined` になる（それが正しい挙動）。

7. **日付・時刻のハイドレーション不一致**
   `BookingForm` はクライアントコンポーネントだが、**最初の1回はサーバーでもレンダリングされる**。`currentTimeJST()` を使った開始時刻の絞り込みは、サーバーで計算した時刻とブラウザで計算した時刻がズレると `Hydration failed` の警告が出る（分をまたいだ瞬間など）。`utils/datetime.ts` は `Asia/Tokyo` を明示しているのでタイムゾーン起因のズレは起きないが、**時刻そのもののズレは起こりうる**。警告が出たら、時刻フィルタを `useState` + `useEffect` でマウント後に適用する形に変える（これも「サーバーとクライアントの境界」を実感できる良い題材）。

8. **`app/layout.tsx` は state を持てない**
   Server Component なので `useState` が使えない。ver3 で `App` が持っていた `editingBooking` をそのまま移そうとすると詰まる。**state はクライアントコンポーネントに下ろす**（決定事項6）。

9. **サーバー側の `console.log` はターミナルに出る**
   ブラウザのコンソールを見ても何も出ていなくて焦る場面がある。Server Component / Server Action のログは `npm run dev` を実行しているターミナル側に出る。

---

## 9. デプロイについて（重要な方針変更）

ver3 は「ビルドして `dist/` を FTP で XServer に置く」構成だった。**Next.js版はこの方式を引き継げない。**

理由: Server Components と Server Actions は**Node.jsが動くサーバー**を必要とする。XServerの静的ホスティングにHTMLを置くだけでは動かない。`output: 'export'`（静的書き出し）にすれば置けるが、その場合 **Server Actions が使えなくなり、このPLANの学習内容がほぼ全部消える**。さらにフェーズ②（SQLite）もフェーズ③（認証）もサーバーが必須なので、ここで静的書き出しを選ぶと3フェーズ全体が破綻する。

**したがってフェーズ①では、デプロイを行わずローカル開発（`npm run dev`）で完結させる。**

デプロイもやりたい場合の選択肢（フェーズ①の必須範囲外）:
- **Vercel**: Next.jsの開発元。GitHubリポジトリを繋ぐだけでデプロイでき、環境変数もダッシュボードで設定するだけ。フェーズ①・③とは相性が良い。ただし**フェーズ②のSQLiteとは相性が悪い**（ファイルシステムが永続しないため、Turso等のマネージドSQLiteに載せ替える必要が出る）。
- **XServerのVPS等、Node.jsが動かせる環境**: 現行の契約内容次第。SQLiteのファイルをそのまま置けるので、フェーズ②まで見据えるならこちら。

**この判断はフェーズ②の入口で改めて行えばよい。**フェーズ①の時点で決める必要はないので、まずローカルで動かすことに集中する。

---

## 10. フェーズ②③への布石（今回やっておくこと）

今回の実装で、以下が自然に整う。**意識してこの形を守ること。**

**フェーズ②（SQLite化）に向けて**
- 画面側（`app/**` と `components/**`）は `lib/bookings.ts` の関数しか呼ばない。`supabase` を直接触っているファイルは `lib/supabase.ts` と `lib/bookings.ts` の2つだけ。→ **フェーズ②の作業は「`lib/bookings.ts` の中身を書き換える」だけになる**（`better-sqlite3` などに差し替え）。関数のシグネチャ（引数と戻り値の型）を変えなければ、`page.tsx` も component も1行も直さなくて済む。
- フェーズ②で追加で必要になるのは、Supabase の RPC が代行してくれていた処理を自分で書くこと: テーブル作成のSQL、重複予約を防ぐためのトランザクション、UUIDの採番。今回 `hasOverlap` をサーバー側に1本化しておくと、この移行が素直になる。

**フェーズ③（Googleログイン）に向けて**
- Server Actions が既に入口として存在しているので、「アクションの先頭でセッションを検証する」形で認証を差し込める。
- 現在フォームに手入力している `reserver_name` は、③ではログインユーザーの名前で置き換わる。→ **`BookingInput` を組み立てている場所を `lib/actions.ts` の1箇所に集約しておく**と、その時に直す箇所が1つで済む。
- 認証は Auth.js (NextAuth v5) の Google Provider が定番。Googleカレンダー連携まで見据えるなら、OAuth時に**カレンダーのスコープを要求してアクセストークンを保存する**必要があるので、③の設計時にそこを最初に確認すること。

---

## 11. 完了チェックリスト

フェーズ①完了の判定基準。**ver3 と挙動が同じであること**が基本線。

- [ ] `/` → `/new` にリダイレクトされる
- [ ] タブで `/new` ⇄ `/schedule` が切り替わり、選択中スタイルが当たる
- [ ] タブを往復しても `?date=` が保持される
- [ ] `/schedule?date=YYYY-MM-DD` を直接開いてリロードしても、その日の予約が表示される
- [ ] 日付を変えるとURLが変わり、その日の予約に切り替わる。戻る/進むも正しく動く
- [ ] 「今日」を選ぶと開始時刻の選択肢が現在時刻以降だけになる
- [ ] 予約を作成すると `/schedule` に遷移し、作成した予約が見えている
- [ ] 重複する時間帯・未入力・終了≦開始 でそれぞれエラーが出る
- [ ] 予約の変更（モーダル）・キャンセル（削除）が動き、一覧に即反映される
- [ ] `loading.tsx` / `error.tsx` / `not-found.tsx` が意図通り表示される
- [ ] **DevTools の Network に `supabase.co` へのリクエストが1件も出ていない**
- [ ] **DevTools でJSを無効にしても、スケジュールが表示される**
- [ ] `npm run build` と `npm run lint` が警告なく通る
- [ ] `supabase` を import しているファイルが `lib/` の中だけであることを確認（`grep -r "supabase" src/app src/components` が空）

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

会議室予約アプリ（Conference Room Booking）。React + TypeScript + Vite (v2, react-router版) のSPAで、Supabaseをバックエンドに使う。学習目的のプロジェクトで、コード中には日本語コメントで仕組みの解説が多数書かれている。

## Commands

```bash
npm run dev      # Vite dev server（/conferenceRoom/ を開く）
npm run build     # tsc -b && vite build → dist/ を生成
npm run lint      # eslint .
npm run preview   # ビルド後のプレビュー
```

テストは現状構成されていない。

### 環境変数

`.env` に以下が必要（`VITE_` プレフィックス必須、Viteの仕様でクライアントに露出する）:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Architecture

### ルーティングとデータフローの構造

このアプリの核となる設計は「`App` がレイアウトルート兼データ供給元になり、`Outlet` の `context` で子ルートにデータを配る」という構造。

```
main.tsx (BrowserRouter, base="/conferenceRoom/")
  └─ AppRoutes.tsx  … <Route> の入れ子でルート階層を定義するだけ
      └─ App.tsx     … レイアウトルート。★データの持ち主
          ├─ useState: rooms, bookings, editingBooking, errorMessage
          ├─ useSearchParams: selectedDate（URLの ?date= と同期。useStateではない）
          ├─ Supabase fetch: fetchRooms(), fetchBookingsForDate()
          ├─ <Outlet context={bookingContext} />  … 子ルートへ Context 経由でデータを渡す
          │   ├─ routes/NewBookingPage.tsx （path="new"）
          │   └─ routes/SchedulePage.tsx   （path="schedule"）
          └─ {editingBooking && <EditBookingModal />}  … 条件付き描画（Contextを使わずpropsで渡す）
```

- `App` と `NewBookingPage`/`SchedulePage` の間は **`useOutletContext<BookingContext>()`** でつながっており、props ではない。`<Route path="new" element={<NewBookingPage />} />` と React Router がJSXを生成するため、`App` から直接propsを渡す経路がなく、Context を使わざるを得ない構造になっている。
- `BookingContext` 型は `src/types/booking.ts` で定義。`App` が持つ9個の値・関数をまとめたもの。子ページはこの中から必要な分だけ分割代入で取り出す（`NewBookingPage` は6個、`SchedulePage` は6個、内訳が異なる）。
- `NewBookingPage`/`SchedulePage` からさらに下（`DateSelect`, `BookingForm`, `RoomSchedule`）へは通常の props リレーで渡している。Context が効くのは「ルート階層上の親子」だけで、それ以降は通常のReactと同じ。

### 選択日付の扱い

`selectedDate` は `useState` ではなく `useSearchParams` の `?date=` から読み書きする（`App.tsx`）。理由：タブ切り替えやブラウザの戻る/進むで選択日付を保持するため。`App.tsx` の `linkWithDate()` ヘルパーが、現在のクエリパラメータを引き継いだ `{ pathname, search }` オブジェクトを組み立て、`NavLink`/`navigate` に渡している。これを使わずタブ遷移すると `?date=` が失われ `todayISO()` にリセットされる。

### Supabase連携

- クライアント初期化: `src/utils/supabase.ts`
- 予約の作成・更新・削除は生SQLではなく **RPC（`create_booking` / `update_booking` / `delete_booking`）** 経由。重複チェックはクライアント側で一度行った上で、最終的な整合性はRPC側のエラーに委ねる二段構え。
- 型定義（`Room`, `Booking`, `BookingContext`）は `src/types/booking.ts` に集約。DBスキーマ自体はこのリポジトリに含まれない。

### 日時ユーティリティ

`src/utils/datetime.ts` に集約。すべてJST（`Asia/Tokyo`）基準で計算する点に注意（サーバー/クライアントのタイムゾーンに依存しない）。`TIME_SLOTS` は15分刻みの00:00〜23:45。

### デプロイ

`.github/workflows/deploy.yml` により `main` への push で自動デプロイ：`npm run build` → FTPで XServer（`xs205671.xsrv.jp/public_html/conferenceRoom/`）へ `dist/` をアップロード。Supabaseの鍵はGitHub Secretsから`Build`ステップの環境変数として渡される。

- `vite.config.ts` の `base: '/conferenceRoom/'` とデプロイ先パス、`public/.htaccess` の `RewriteBase /conferenceRoom/` は揃える必要がある（SPAのため、存在しないファイルパスはすべて `index.html` にフォールバックさせるrewriteルール）。
- `dist/` はビルド成果物だが、このリポジトリでは意図的にgit管理下にある（FTPデプロイ運用のため）。手動編集は次のビルドで失われるので不可。

### コンポーネント構成

- `routes/` — URLに対応するページコンポーネント。自身は状態を持たず、Contextから受け取ったデータを子コンポーネントに配るだけの薄い層。
- `components/` — 実際のUIロジック（フォームの状態管理、バリデーション、Supabase呼び出し）はここに集約。`BookingForm`（新規作成）と `EditBookingModal`（編集）は似た入力フォームだが別コンポーネントとして重複実装されている。
- `DateSelect` と `SchedulePage` 内の日付inputは、UIを揃える途中でリファクタリングが完了していない状態（`SchedulePage` は「今日」バッジ機能があるため `DateSelect` を使わず直書きしている）。

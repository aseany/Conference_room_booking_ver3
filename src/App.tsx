import { useState, useEffect } from 'react'
// Outlet	コンポーネント。子ルートの element を描画する差込口。 <Outlet context={bookingContext} /> の位置に、URL に応じて NewBookingPage か SchedulePage が入る。context prop で子ルートにデータを渡せる（子は useOutletContext() で受け取る）。
// NavLink	コンポーネント。<a> としてレンダリングされるが、クリックをフックしてリロードなしで URL を変える。Link との違いは、to と現在 URL を照合して isActive を出し、className/style に関数を渡せること（App.tsx:158,161 がこれを使ってタブの選択中スタイルを当てている）。
// useSearchParams	フック。URL の ? 以降を読み書きする。App.tsx:18 で [searchParams, setSearchParams] を取り、searchParams.get('date') で選択日付を読み、setSearchParams({ date }) で書く。useState と同じ形だが、保存先は React の内部状態ではなく URL。
// useNavigate	フック。navigate(...) 関数を返し、JSX ではなくコード内から画面遷移する。App.tsx:139 で、予約作成成功後に /schedule へ自動で飛ばすのに使っている。
import { Outlet, NavLink, useSearchParams, useNavigate } from 'react-router'
import { supabase } from './utils/supabase'
import type { Room, Booking, BookingContext } from './types/booking'
import EditBookingModal from './components/EditBookingModal'
import { todayISO } from './utils/datetime'

// v2(react-router版)より、App は画面を描くのをやめてレイアウトルート（共通の枠＋データ供給係）になる
function App() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const navigate = useNavigate()

  // ↓selectedDate は useState ではなく URL の ?date= から読み書きする。useSearchParams() は react-router が提供するフック(Hook)で、URLの「クエリパラメータ(?以降の部分)」を読み書きするための機能。
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDate = searchParams.get('date') ?? todayISO()
  // dateというkeyの無名オブジェクトを引数として渡している。{ date } はオブジェクトのショートハンド記法で、普通に書くと{ date: date }
  const setSelectedDate = (date: string) => setSearchParams({ date })

  const handleDeleteBooking = async (booking: Booking) => {
    if (!window.confirm(`「${booking.title}」の予約をキャンセルしますか？`)) {
      return
    }

    try {
      const { error } = await supabase.rpc('delete_booking', {
        p_booking_id: booking.id,
      })

      if (error) {
        console.error("削除エラー:", error)
        return
      }

      setBookings(bookings.filter(b => b.id !== booking.id))
    } catch (err) {
      console.error("削除エラー:", err)
    }
  }

  // --- 会議室一覧を取得 ---
  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('会議室取得エラー:', error)
    } else {
      setRooms(data as Room[])
    }
  }

  // --- 選択日の予約を取得 ---
  const fetchBookingsForDate = async (date: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('予約取得エラー:', error)
    } else {
      setBookings(data as Booking[])
    }
  }

  // アプリ起動時に会議室を取得
  useEffect(() => {
    fetchRooms()
  }, [])

  // 日付変更時に予約を取得
  useEffect(() => {
    fetchBookingsForDate(selectedDate)
  }, [selectedDate])

  // ↓現在の ?date= を引き継いでリンク先を組み立てる（引き継がないとタブ切り替えで日付が今日に戻る）
  // 例：linkWithDate('/new')　→ '/new?date=2026-08-23' を返す
  //   アプリが「現在選択されている日付」を保持する必要があるから
  // URLにパラメータとして含めることで、ブラウザの戻る・進むボタンでも日付が維持される
  const linkWithDate = (pathname: string) => ({
    pathname,
    search: searchParams.toString(),
    // useSearchParams は React Routerのフック（hook）で、URLのクエリパラメータを読み書きする。
    // http://localhost:5173/new?date=2026-08-23
    //                        ↓      ↓
    //                    pathname  search（クエリパラメータ）
    // ↓分割代入ではなくショートハンドプロパティ（オブジェクトの短縮記法） 
    // {
    //   pathname,
    //   search: searchParams.toString(),
    // }
    // // これは：
    // {
    //   pathname: pathname,
    //   search: searchParams.toString()
    // } と同じ意味
    // linkWithDate('/new') を呼ぶと：
    // {
    //   pathname: '/new',
    //   search: 'date=2026-08-23'
    // }

  });
  // 上記をreturnの省略をなしで書くと下記になる
  // const linkWithDate = (pathname: string) => {
  //   return {
  //     pathname,
  //     search: searchParams.toString(),
  //   }
  // }
  




  // 通常の書き方：
  // function func(arg) {
  //   console.log(arg.isActive)
  // }
// 分割代入の書き方：
// function func({ isActive }) {
//   console.log(isActive)  // 直接使える
// }
// アロー関数でも同じ：
// ({ isActive }) => console.log(isActive)

  const tabLinkClassName = ({ isActive }: { isActive: boolean }) =>
    // 三項演算子
    isActive
      ? 'px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-bold'
      : 'px-4 py-2 text-gray-500 hover:text-gray-700'

  const bookingContext: BookingContext = {
    // ↓短縮記法 プロパティ名と変数名が同じ時だけ片方を省略できる。短縮せずに書くと、rooms: rooms,
    // 青は変数　黄色は関数
    rooms,
    bookings,
    selectedDate,
    setSelectedDate,
    onBookingCreated: (newBooking) => {
      setBookings([...bookings, newBooking])
      setErrorMessage("")
      navigate(linkWithDate('/schedule'))
    },
    errorMessage,
    onErrorChange: setErrorMessage,
    onEdit: setEditingBooking,
    onDelete: handleDeleteBooking,
  }
  // ↓短縮せずに書くと以下
  // const bookingContext: BookingContext = {
  //   rooms: rooms,
  //   bookings: bookings,
  //   selectedDate: selectedDate,
  //   setSelectedDate: setSelectedDate,
  //   onBookingCreated: (newBooking) => {
  //     setBookings([...bookings, newBooking])
  //     setErrorMessage("")
  //     navigate(linkWithDate('/schedule'))
  //   },
  //   errorMessage: errorMessage,
  //   onErrorChange: setErrorMessage,
  //   onEdit: setEditingBooking,
  //   onDelete: handleDeleteBooking,
  // }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8"> ver3（react-router版）</h1>

      {/* タブバー：NavLink の isActive で選択中スタイルを当てる */}
      <div className="flex border-b mb-6">
      {/*NavLinkは React Routerが提供するコンポーネント。内部的には<a>タグになる。クリック時にevent.preventDefault()を自動実行し、ページリロードなしでURL切り替え。to=の path を比較し、その結果を classNameに渡す関数の引数として渡す。 Linkコンポーネントとの違いは、URLの変更だけではく、URLの判定も行うという点。LinkタグNavLinkタブ、共に、to={}の中身が文字列ならそのまま使う。オブジェクトなら、各プロパティを文字列としてつなぎ合わせる。
      今回の場合、Linkタグでもタブ切り替え、URL切りかえとしては動作するが、クラス名の切り替えが動かない。/}
      {/* to={linkWithDate('/new')}
        toプロパティ = 遷移先のパスを指定　linkWithDate('/new') = 関数呼び出し
        このプロジェクトで定義されている関数で、現在の日付をクエリパラメータとして自動的に追加： */}
        {/* { } は呼び出しの記号ではない。 これは JSX の記法で、「この中は JavaScript の式です」という意味。 */}
        {/* ①「予約を作成」をクリック
        ↓
        ② NavLink が URL を /new?date=... に変更（リロードなし）
              ↓
        ③ URL が変わったので React が再レンダリング
              ↓
        ④ NavLink が判定：to='/new' と 今のURL='/new' → 一致
              ↓
        ⑤ tabLinkClassName({ isActive: true }) を呼ぶ
              ↓
        ⑥ 'px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-bold' が返る
              ↓
        ⑦ <a class="...border-blue-500..."> になり、青い下線が付く */}

        <NavLink to={linkWithDate('/new')} className={tabLinkClassName}>
          予約を作成
        </NavLink>
        <NavLink to={linkWithDate('/schedule')} className={tabLinkClassName}>
          スケジュール
        </NavLink>
      </div>

      {/* Outlet はReact Router 「ここに子ルートのコンポーネントを描画してください」という場所の目印の位置に、URLに応じた子が入ります: */}
      {/* Outlet が値を Provider に置き、子ルート（NewBookingPage / SchedulePage）が useOutletContext() で読みに行く。 */}
      {/* contextとは：AppRouter.tsxで定義されてる親子関係は、propsではなく、contextでわたす */}
      <Outlet context={bookingContext} />

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          rooms={rooms}
          onClose={() => setEditingBooking(null)}
          onBookingUpdated={() => {
            fetchBookingsForDate(selectedDate)
            setEditingBooking(null)
          }}
        />
      )}
    </div>
  )
}

export default App

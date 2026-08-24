import { useState, useEffect } from 'react'
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

  // ↓selectedDate は useState ではなく URL の ?date= から読み書きする
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedDate = searchParams.get('date') ?? todayISO()
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
    // search: は React Router が提供するローケションオブジェクト(現在のURLに関する情報（パス、クエリ、ステートなど）を保持するオブジェクト)
    // useSearchParams は React Routerのフック（hook）で、URLのクエリパラメータを読み書きする。
    // http://localhost:5173/new?date=2026-08-23
    //                        ↓      ↓
    //                    pathname  search（クエリパラメータ）

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




  // 通常の書き方：
// function func(props) {
//   console.log(props.isActive)  // プロパティにアクセス
// }
// 分割代入の書き方：
// function func({ isActive }) {
//   console.log(isActive)  // 直接使える
// }
// アロー関数でも同じ：
// ({ isActive }) => console.log(isActive)

  const tabLinkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-bold'
      : 'px-4 py-2 text-gray-500 hover:text-gray-700'

  const bookingContext: BookingContext = {
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">会議室予約アプリ ver2（react-router版）</h1>

      {/* タブバー：NavLink の isActive で選択中スタイルを当てる */}
      <div className="flex border-b mb-6">
      {/*NavLinkは React Routerが提供するコンポーネント。内部的には<a>タグになる。クリック時にevent.preventDefault()を自動実行し、ページリロードなしでURL切り替え。to=の path を比較し、その結果を classNameに渡す関数の引数として渡す。 Linkコンポーネントとの違いは、URLの変更だけではく、URLの判定も行うという点*/}
      {/* to={linkWithDate('/new')}
        toプロパティ = 遷移先のパスを指定　linkWithDate('/new') = 関数呼び出し
        このプロジェクトで定義されている関数で、現在の日付をクエリパラメータとして自動的に追加： */}
        <NavLink to={linkWithDate('/new')} className={tabLinkClassName}>
          予約を作成
        </NavLink>
        <NavLink to={linkWithDate('/schedule')} className={tabLinkClassName}>
          スケジュール
        </NavLink>
      </div>

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

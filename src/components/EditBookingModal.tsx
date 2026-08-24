import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { TIME_SLOTS, todayISO, currentTimeJST } from '../utils/datetime'
import type { Room, Booking } from '../types/booking'

interface EditBookingModalProps {
  booking: Booking
  rooms: Room[]
  onClose: () => void
  onBookingUpdated: () => void
}

export default function EditBookingModal({
  booking,
  rooms,
  onClose,
  onBookingUpdated,
}: EditBookingModalProps) {
  // ここに state と処理を書いていく
const [roomId, setRoomId] = useState(booking.room_id)
const [bookingDate, setBookingDate] = useState(booking.booking_date)
const [startTime, setStartTime] = useState(booking.start_time.substring(0, 5))
const [endTime, setEndTime] = useState(booking.end_time.substring(0, 5))
const [reserverName, setReserverName] = useState(booking.reserver_name)
const [title, setTitle] = useState(booking.title)
const [errorMessage, setErrorMessage] = useState("")
const [isLoading, setIsLoading] = useState(false)

const availableStartTimes =
  // 選択している日付が、本日かどうか？を判定する3項演算子
  bookingDate === todayISO()
    ? TIME_SLOTS.filter((t) => t >= currentTimeJST() || t === startTime)
    : TIME_SLOTS

const availableEndTimes = startTime
  ? availableStartTimes.filter((t) => t > startTime)
  : availableStartTimes



const handleSubmit = async (e: React.FormEvent) => {
  // const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  // ↓e.preventDefault() でブラウザ標準のページリロード動作を止める
  e.preventDefault()
  setErrorMessage("")

  if (!roomId || !startTime || !endTime || !reserverName || !title) {
    setErrorMessage("すべてのフィールドを入力してください")
    return
  }

  if (endTime <= startTime) {
    setErrorMessage("終了時刻は開始時刻より後である必要があります")
    return
  }

  setIsLoading(true)

  try {
    // ↓分割代入 dateをexistingにリネームしている
    const { data: existing } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('room_id', roomId)
      .eq('booking_date', bookingDate)
    console.log('existing', existing)
    // ↓some() は配列のメソッド(JSの組み込みメソッド)で、「配列の中に条件を満たす要素が1つでもあるか」を判定し、true/false を返します。
    const hasOverlap = existing?.some(
      // ↑?は、（オプショナルチェイニング）
      (b) => b.id !== booking.id && startTime < b.end_time && endTime > b.start_time
      //  (b) => {
      //   console.log('b', b)
      //   return b.id !== booking.id && startTime < b.end_time && endTime > b.start_time
      // }
    )

    if (hasOverlap) {
      setErrorMessage("この時間帯は既に予約されています")
      setIsLoading(false)
      return
    }

    const { error } = await supabase.rpc('update_booking', {
      p_booking_id: booking.id,
      p_room_id: roomId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_reserver_name: reserverName,
      p_title: title,
    })

    // ↓分割代入使用せずに書くと
    // const result = await supabase.rpc('update_booking', {
    //   p_booking_id: booking.id,
    //   p_room_id: roomId,
    //   p_booking_date: bookingDate,
    //   p_start_time: startTime,
    //   p_end_time: endTime,
    //   p_reserver_name: reserverName,
    //   p_title: title,
    // })

    // const error = result.error

    if (error) {
      setErrorMessage("この時間帯は既に予約されています。ページを更新して再度お試しください。")
      setIsLoading(false)
      return
    }

    onBookingUpdated()
    onClose()
  } catch (err) {
    console.error("エラー:", err)
    setErrorMessage("予約の更新に失敗しました")
    setIsLoading(false)
  }
}


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">予約を編集</h2>
        {/* ここにフォームを書く */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">会議室</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">日付</label>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={todayISO()}
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">開始時刻</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">選択してください</option>
              {availableStartTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">終了時刻</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">選択してください</option>
              {availableEndTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">予約者名</label>
            <input
              type="text"
              value={reserverName}
              onChange={(e) => setReserverName(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="例：田中"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">会議タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="例：予算会議"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              // ↓disabled はHTMLの標準属性で、true のときそのボタンが**クリック不可（押せない）**にな
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? "更新中..." : "更新"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
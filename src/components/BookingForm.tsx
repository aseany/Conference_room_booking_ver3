import React, { useState } from 'react'
import { supabase } from '../utils/supabase'
import type { Room, Booking } from '../types/booking'
import { TIME_SLOTS, todayISO, currentTimeJST } from '../utils/datetime'

// ↓親から受け取るデータの型を定義
interface BookingFormProps {
  rooms: Room[]
  selectedDate: string
  onBookingCreated: (booking: Booking) => void
  errorMessage: string
  onErrorChange: (message: string) => void
}

// // 15分刻みの時刻スロット（00:00〜23:45）を生成
// const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
//   const h = String(Math.floor(i / 4)).padStart(2, "0")
//   const m = String((i % 4) * 15).padStart(2, "0")
//   return `${h}:${m}`
// })

// // 今日の日付をJSTで取得
// function todayISO() {
//   return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
// }

// // 現在時刻をJSTで"HH:MM"形式で取得
// function currentTimeJST() {
//   return new Date().toLocaleTimeString('en-GB', {
//     timeZone: 'Asia/Tokyo',
//     hour: '2-digit',
//     minute: '2-digit',
//   })
// }

export default function BookingForm({
  rooms,
  selectedDate,
  onBookingCreated,
  errorMessage,
  onErrorChange,
}: BookingFormProps) {
  const [roomId, setRoomId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [reserverName, setReserverName] = useState("")
  const [title, setTitle] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // 選択日が今日の場合、現在時刻より前の開始時刻を選択肢から除外
  const availableStartTimes =
    selectedDate === todayISO()
      ? TIME_SLOTS.filter((t) => t >= currentTimeJST())
      : TIME_SLOTS

  // 終了時刻は開始時刻より後（15分刻みなので次のスロット以降）のみ選択可能
  const availableEndTimes = startTime
    ? availableStartTimes.filter((t) => t > startTime)
    : availableStartTimes
    // let availableStartTimes: string[]
    // if (selectedDate === todayISO()) {
    //   availableStartTimes = TIME_SLOTS.filter((t) => t >= currentTimeJST())
    // } else {
    //   availableStartTimes = TIME_SLOTS
    // }

  const handleSubmit = async (e: React.FormEvent) => {
    // ↓ページをリロードするのを防ぐ　通常、フォームを送信するとリロードされてしまうので。
    e.preventDefault()
    onErrorChange("")

    // バリデーション
    if (!roomId || !startTime || !endTime || !reserverName || !title) {
      onErrorChange("すべてのフィールドを入力してください")
      return
    }

    if (endTime <= startTime) {
      onErrorChange("終了時刻は開始時刻より後である必要があります")
      return
    }

    setIsLoading(true)

    try {
      // クライアント側の重複チェック
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('room_id', roomId)
        .eq('booking_date', selectedDate)

      const hasOverlap = existing?.some(
        (b) => startTime < b.end_time && endTime > b.start_time
      )

      if (hasOverlap) {
        onErrorChange("この時間帯は既に予約されています")
        setIsLoading(false)
        return
      }

      // RPC経由で予約を作成
      const { data, error } = await supabase.rpc('create_booking', {
        p_room_id: roomId,
        p_booking_date: selectedDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_reserver_name: reserverName,
        p_title: title,
      })

      if (error) {
        onErrorChange("この時間帯は既に予約されています。ページを更新して再度お試しください。")
        setIsLoading(false)
        return
      }

      // 成功時：フォームをリセットして新規予約をstateに追加
      onBookingCreated(data as Booking)
      setRoomId("")
      setStartTime("")
      setEndTime("")
      setReserverName("")
      setTitle("")
      setIsLoading(false)
    } catch (err) {
      console.error("エラー:", err)
      onErrorChange("予約の作成に失敗しました")
      setIsLoading(false)
    }
  }
 
  
  return (
    <form onSubmit={handleSubmit} className="rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">会議室</label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">選択してください</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isLoading ? "作成中..." : "予約を作成"}
      </button>
    </form>
  )
}

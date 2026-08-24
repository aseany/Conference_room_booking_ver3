// import React from 'react'
import type { Room, Booking } from '../types/booking'

// ↓RoomSchedule コンポーネントが受け取る props（親から渡されるデータ）の型を定義(ヴァニラJSではinterfaceは使えないが、TypeScriptでは型定義にinterfaceを使える)
interface RoomScheduleProps {
  rooms: Room[]
  bookings: Booking[]
  // selectedDate: string
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

export default function RoomSchedule({
  rooms,
  bookings,
  // selectedDate,
   onEdit,
  onDelete,
}: RoomScheduleProps) {
  // { rooms, bookings, ... }: RoomScheduleProps — 親から受け取った props を「分割代入」し、RoomScheduleProps 型でチェック
  // 時刻をHH:MM形式でフォーマット
  function formatTime(time: string): string {
    return time.substring(0, 5)
  }

  // 会議室ごとにグループ化
  function getBookingsForRoom(roomId: string): Booking[] {
    // console.log(bookings,"booking");
    return bookings.filter((b) => b.room_id === roomId)
    // 通常の関数式
    // bookings.filter(function(b) {
    //   return b.room_id === roomId
    // })
    
  }

  return (
    <div className="space-y-4">
      {rooms.length === 0 ? (
        <p className="text-gray-500">会議室が見つかりません</p>
      ) : (
        rooms.map((room) => {
          const roomBookings = getBookingsForRoom(room.id)
          return (
            <div key={room.id} className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">{room.name}</h3>
              {/* ↓三項演算子*/}
              {roomBookings.length === 0 ? (
                <p className="text-gray-500 text-sm">予約なし</p>
              ) : (
                <ul className="space-y-2">
                  {roomBookings.map((booking) => (
                    <li
                      key={booking.id}
                      className="bg-blue-50 border border-blue-200 p-2 rounded text-sm"
                    >
                      <div className="font-semibold">
                        {formatTime(booking.start_time)}–
                        {formatTime(booking.end_time)}
                        {/* {booking.start_time.substring(0, 5)}–
                        {booking.end_time.substring(0, 5)} */}
                      </div>
                      <div className="text-gray-700">{booking.title}</div>
                      <div className="text-gray-500 text-xs">
                        {booking.reserver_name}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(booking)
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          変更
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(booking)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          キャンセル
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

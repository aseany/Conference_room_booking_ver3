import { useOutletContext } from 'react-router'
import type { BookingContext } from '../types/booking'
import RoomSchedule from '../components/RoomSchedule'
import { todayISO, formatWeekday } from '../utils/datetime'

export default function SchedulePage() {
  const { rooms, bookings, selectedDate, setSelectedDate, onEdit, onDelete } =
    useOutletContext<BookingContext>()

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">スケジュール</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">日付を選択</label>
        <div className="relative">
          {/* 日付選択機能を、NewBokkingPage.tsxの<DateSelect value={selectedDate} onChange={setSelectedDate} />のように、コンポーネント化していないのは、V2→V3のリファクタリングの過程で発生したもの。本来なら、このファイルでも同じコンポーネントを読み込むべき。ただしそうする場合、
          {selectedDate === todayISO() && '今日'}  の扱いをコンポーネント側で調整必要 */}
          <input
            type="date"
            min={todayISO()}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-gray-600 pointer-events-none">
            （{formatWeekday(selectedDate)}）
            {selectedDate === todayISO() && '今日'}
          </span>
        </div>
      </div>
      <RoomSchedule
        rooms={rooms}
        bookings={bookings}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

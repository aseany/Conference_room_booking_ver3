import { useOutletContext } from 'react-router'
import type { BookingContext } from '../types/booking'
import DateSelect from '../components/DateSelect'
import BookingForm from '../components/BookingForm'

export default function NewBookingPage() {
  // ↓useOutletContext は型推論されないので、型引数を自分で指定する必要がある
  const { rooms, selectedDate, setSelectedDate, onBookingCreated, errorMessage, onErrorChange } =
    useOutletContext<BookingContext>()

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">予約を作成</h2>
      <DateSelect value={selectedDate} onChange={setSelectedDate} />
      <BookingForm
        rooms={rooms}
        selectedDate={selectedDate}
        onBookingCreated={onBookingCreated}
        errorMessage={errorMessage}
        onErrorChange={onErrorChange}
      />
    </div>
  )
}

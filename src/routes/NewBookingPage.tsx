import { useOutletContext } from 'react-router'
import type { BookingContext } from '../types/booking'
import DateSelect from '../components/DateSelect'
import BookingForm from '../components/BookingForm'

// useOutletContext<BookingContext>() で、App.tsx:130 が用意した9個のデータを受け取ります。propsではなくフック（Hook）。props は「親から手渡しでもらうデータ」、フックは「Reactの機能を呼び出す関数」

export default function NewBookingPage() {
  // ↓useOutletContext は型推論されないので、型引数を自分で指定する必要がある
  // const { rooms, selectedDate, setSelectedDate, onBookingCreated, errorMessage, onErrorChange } =
  //   useOutletContext<BookingContext>()
// 　↓分割代入使用せずにかいたら
  const context = useOutletContext<BookingContext>()
  
  const rooms = context.rooms
  const selectedDate = context.selectedDate
  const setSelectedDate = context.setSelectedDate
  const onBookingCreated = context.onBookingCreated
  const errorMessage = context.errorMessage
  const onErrorChange = context.onErrorChange
  
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

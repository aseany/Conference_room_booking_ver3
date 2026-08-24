export interface Room {
  id: string
  name: string
}

export interface Booking {
  id: string
  room_id: string
  booking_date: string
  start_time: string
  end_time: string
  reserver_name: string
  title: string
}

// Outlet 経由でレイアウトルート(App)から各ページへ渡すデータの型
export interface BookingContext {
  rooms: Room[]
  bookings: Booking[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  onBookingCreated: (booking: Booking) => void
  errorMessage: string
  onErrorChange: (message: string) => void
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

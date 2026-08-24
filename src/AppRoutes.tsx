import { Routes, Route, Navigate } from 'react-router'
import App from './App'
import NewBookingPage from './routes/NewBookingPage'
import SchedulePage from './routes/SchedulePage'

// ↓ルート定義。App はレイアウトルート（<h1>・タブバー・EditBookingModal を持つ枠）
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/new" replace />} />
        <Route path="new" element={<NewBookingPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="*" element={<Navigate to="/new" replace />} />
        
      </Route>
    </Routes>
  )
}

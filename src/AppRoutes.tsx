import { Routes, Route, Navigate } from 'react-router'
import App from './App'
import NewBookingPage from './routes/NewBookingPage'
import SchedulePage from './routes/SchedulePage'

// ↓ルート定義。App はレイアウトルート（<h1>・タブバー・EditBookingModal を持つ枠）
export default function AppRoutes() {
  return (
    <Routes>
      {/* URLが /（ルート、つまり親パスと完全一致）のとき、/new へリダイレクトする」というルール */}
      <Route path="/" element={<App />}>
        {/* URLが /（ルート、つまり親パスと完全一致）のとき、/new へリダイレクトする」というルール */}
        <Route index element={<Navigate to="/new" replace />} />
        {/* URLが /new のとき、NewBookingPage.tsx コンポーネントを描画する」というルール */}
        <Route path="new" element={<NewBookingPage />} />
        {/* URLが /schedule のとき、SchedulePage コンポーネントを描画する」というルール */}
        <Route path="schedule" element={<SchedulePage />} />
        {/* 上記のどのパスにも一致しなかったとき（＝存在しないURL）、/new へリダイレクトする」というルール */}
        <Route path="*" element={<Navigate to="/new" replace />} />
        
      </Route>
    </Routes>
  )
}

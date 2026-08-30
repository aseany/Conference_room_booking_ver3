// ↓react-router から3つのルーティング用コンポーネントをインポートしている文
// Routes	複数の Route をまとめる「コンテナ」。現在のURLに一致する Route を1つ選んで表示する
// Route	「このURLパスのときは、このコンポーネントを表示する」というルール1件を定義する
// Navigate	指定したパスへ強制的に画面遷移(リダイレクト)させる。
// Routes と Route はほぼ必須。
import { Routes, Route, Navigate } from 'react-router'
import App from './App'
import NewBookingPage from './routes/NewBookingPage'
import SchedulePage from './routes/SchedulePage'

// ↓ルート定義。App はレイアウトルート（<h1>・タブバー・EditBookingModal を持つ枠）
export default function AppRoutes() {
  return (
    <Routes>
      {/*レイアウトルート(親ルート)」と呼ばれる書き方。閉じタグを持ち、中に子 <Route> を含んでいる。
      path="/":URLの先頭(すべてのパス)に共通して適用される。 element={<App />}:その共通部分として App.tsx を表示する。*/}
      <Route path="/" element={<App />}>
        {/* URLが /（ルート、つまり親パスと完全一致）のとき、/new へリダイレクトする」というルール。index は「親ルートのパスと完全に一致したときに表示する子ルート」を指定するための特別な属性(boolean prop)で*/}
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

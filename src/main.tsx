import { StrictMode } from 'react'
// ↓createRoot は「Reactアプリをブラウザ画面に描画するための土台を作る関数」。素のreactプロジェクトでは記述必要。Next.jsでは不要。
import { createRoot } from 'react-dom/client'
// ↓Reactアプリに「ルーティング機能(URLに応じて表示する画面を切り替える機能)」を提供する土台。Next.jsには不要。
import { BrowserRouter } from 'react-router'
import './index.css'
import AppRoutes from './AppRoutes.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)

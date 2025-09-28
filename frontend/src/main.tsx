import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import App from './pages/App'
import ProductDetail from './pages/ProductDetail'
import Login from './pages/Login'

// ★ 추가
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'

const qc = new QueryClient()
const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  // ★ 추가
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },

  { path: '/products/:id', element: <ProductDetail /> }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)

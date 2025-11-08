// main.tsx (또는 index.tsx)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'

import App from './pages/App'
import ProductDetail from './pages/ProductDetail'
import Login from './pages/Login'
import ProductNew from './pages/ProductNew'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import CartPage from './pages/Cart'

// ★ 게스트 카트 로컬스토리지 → 메모리 로드용
import { useGuestCart } from './stores/useGuestCart'
import AdminSoldOut from './pages/AdminSoldOut'
import ProductEdit from './pages/ProductEdit'
import AdminBannerList from './pages/AdminBannerList'
import AdminBannerForm from './pages/AdminBannerForm'
import MyPage from './pages/MyPage'
// import ProductList from './pages/ProductList'
import AdminProducts from './pages/AdminProducts'
import ProductsPage from './pages/ProductsPage'
import AdminHashtags from './pages/AdminHashtags'
import Wishlist from './pages/Wishlist'
import CheckoutPage from './pages/Checkout'
import MyOrders from './pages/MyOrders'
import AdminOrders from './pages/AdminOrders'
import AdminOrderDetail from './pages/AdminOrderDetail'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/verify-email', element: <VerifyEmail /> },

  // 상품
  { path: '/products/:id', element: <ProductDetail /> },
  { path: '/admin/products/new', element: <ProductNew /> },

  // 장바구니
  { path: '/cart', element: <CartPage /> },
  { path: '/admin/products/soldout', element: <AdminSoldOut /> },
  { path: '/admin/products/:id/edit', element: <ProductEdit /> },
  { path: '/admin/products', element: <AdminProducts /> },

  { path: '/admin/banners', element: <AdminBannerList /> },
  { path: '/admin/banners/new', element: <AdminBannerForm /> },
  { path: '/admin/banners/:id/edit', element: <AdminBannerForm /> },
  { path: '/me', element: <MyPage /> },
  // { path: '/products', element: <ProductList /> },
  { path: '/products', element: <ProductsPage  /> },
  { path: '/admin/hashtags', element: <AdminHashtags  /> },
  { path: '/wishlist', element: <Wishlist /> },
  { path: '/checkout', element: <CheckoutPage /> },
  { path: '/mypage/orders', element: <MyOrders /> },
  { path: '/admin/orders', element: <AdminOrders /> },
  { path: '/admin/orders/:id', element: <AdminOrderDetail /> },
])

// ★★★ 렌더 전에 게스트 카트 1회 로드 (Hook이 아님: getState()는 안전)
useGuestCart.getState().load()

// ★ createRoot를 '한 번만' 호출하고 render
const rootEl = document.getElementById('root')!
const root = ReactDOM.createRoot(rootEl)

root.render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)

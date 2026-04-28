import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import Layout from '@/components/layout/Layout'

const Login = lazy(() => import('@/pages/Login'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Projects = lazy(() => import('@/pages/Projects'))
const Settings = lazy(() => import('@/pages/Settings'))
const Monitors = lazy(() => import('@/pages/Monitors'))
const StatusPages = lazy(() => import('@/pages/StatusPages'))
const PublicStatus = lazy(() => import('@/pages/PublicStatus'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/status/:slug" element={<PublicStatus />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/monitors" element={<Monitors />} />
              <Route path="/status-pages" element={<StatusPages />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  )
}

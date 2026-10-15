import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback, useUser, useAuth } from '@clerk/react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import FAQ from './components/FAQ'
import Help from './components/Help'
import Footer from './components/Footer'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import CreatePortfolio from './pages/CreatePortfolio'
import Templates from './pages/Templates'
import Review from './pages/Review'
import Settings from './pages/Settings'
import PortfolioLive from './pages/PortfolioLive'
import PortfolioPublic from './pages/PortfolioPublic'
import { apiUrl } from './utils/api'

function HomePage() {
  useEffect(() => {
    const revealItems = document.querySelectorAll('.scroll-reveal, .stagger-reveal')

    if (!revealItems.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target
            const delay = Number(target.dataset.delay || 0)
            target.style.transitionDelay = `${delay}ms`
            target.classList.add('is-visible')
            observer.unobserve(target)
          }
        })
      },
      { threshold: 0.15 }
    )

    revealItems.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="page-load-animate min-h-screen bg-white text-slate-900">
      <Navbar />
      <Hero />
      <About />
      <FAQ />
      <Help />
      <Footer />
    </div>
  )
}

function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
    if (!email || email.includes('@clerk.local')) return

    const username = user.unsafeMetadata?.username || user.username || user.firstName || ''
    const syncKey = `hulma_synced_${user.id}_${email}_${username}`

    if (sessionStorage.getItem(syncKey)) return

    getToken().then((token) => {
      if (!token) return
      fetch(apiUrl('/api/auth/me'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-User-Email': email,
          'X-User-Username': username,
        },
        body: JSON.stringify({
          email,
          username: username || undefined,
          avatar_url: user.imageUrl || undefined,
        }),
      })
        .then((res) => {
          if (res.ok) {
            sessionStorage.setItem(syncKey, 'true')
            return res.json().catch(() => null)
          }
          return null
        })
        .then((data) => {
          if (data && data.settings) {
            try {
              const current = JSON.parse(localStorage.getItem('hulma-settings') || '{}')
              const merged = { ...data.settings, ...current }
              localStorage.setItem('hulma-settings', JSON.stringify(merged))
              if (data.settings.defaultTemplate && !localStorage.getItem('hulma-template')) {
                localStorage.setItem('hulma-template', data.settings.defaultTemplate)
              }
            } catch {}
          }
        })
        .catch(() => {})
    })
  }, [isLoaded, isSignedIn, user, getToken])

  return null
}

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>
  }

  return isSignedIn ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <UserSync />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage mode="login" />} />
        <Route path="/register" element={<RegisterPage mode="register" />} />
        <Route
          path="/sso-callback"
          element={
            <AuthenticateWithRedirectCallback
              signInForceRedirectUrl="/dashboard"
              signUpForceRedirectUrl="/dashboard"
            />
          }
        />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/portfolio/create" element={<ProtectedRoute><CreatePortfolio /></ProtectedRoute>} />
        <Route path="/portfolio/live" element={<ProtectedRoute><PortfolioLive /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/p/:slug" element={<PortfolioPublic />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { HandleSSOCallback, useUser } from '@clerk/react'
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

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>
  }

  return isSignedIn ? children : <Navigate to="/login" replace />
}

function SSOCallbackPage() {
  const navigate = useNavigate()

  return (
    <HandleSSOCallback
      navigateToApp={({ session, decorateUrl }) => {
        if (session?.currentTask) {
          console.log('Session task pending:', session.currentTask)
          navigate('/login')
          return
        }
        const url = decorateUrl('/dashboard')
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          navigate(url)
        }
      }}
      navigateToSignIn={() => navigate('/login')}
      navigateToSignUp={() => navigate('/register')}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage mode="login" />} />
        <Route path="/register" element={<RegisterPage mode="register" />} />
        <Route path="/sso-callback" element={<SSOCallbackPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/portfolio/create" element={<ProtectedRoute><CreatePortfolio /></ProtectedRoute>} />
        <Route path="/portfolio/live" element={<ProtectedRoute><PortfolioLive /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
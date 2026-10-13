import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate, Link } from 'react-router-dom'
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
import Templates from './pages/Templates'

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

function ComingSoon({ title }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f3f7ff] text-slate-800">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-slate-500">This page is coming soon.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-[#1f6fdc] underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage mode="login" />} />
        <Route path="/register" element={<RegisterPage mode="register" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/review" element={<ComingSoon title="AI Review" />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
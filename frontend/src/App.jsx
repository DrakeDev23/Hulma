import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import FAQ from './components/FAQ'
import Help from './components/Help'
import Footer from './components/Footer'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage mode="login" />} />
        <Route path="/register" element={<RegisterPage mode="register" />} />
      </Routes>
    </BrowserRouter>
  )
}
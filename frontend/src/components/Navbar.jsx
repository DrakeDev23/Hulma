import { useState } from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

const navItems = [
  { label: 'Templates', href: '#templates' },
  { label: 'AI Review', href: '#ai-review' },
  { label: 'About', href: '#about' },
  { label: 'Help', href: '#help' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="scroll-reveal sticky top-0 z-50 border-b border-slate-200/80 bg-[#f8fbff]/90 backdrop-blur-sm shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <img src={logoImg} alt="Hulma" className="h-9 w-auto object-contain" />
            <span className="-ml-1 text-xl font-black tracking-tight text-slate-900">Hulma</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors inline-flex items-center justify-center"
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden mt-4 border border-slate-200 bg-white rounded-2xl p-3 shadow-sm">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  {item.label}
                </a>
              ))}

              <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors inline-flex items-center justify-center"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
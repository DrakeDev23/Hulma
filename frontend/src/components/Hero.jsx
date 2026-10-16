import { Link } from 'react-router-dom'
import puppetImg from '../assets/liveMascot.gif'

const featureItems = [
  'AI Review',
  'Portfolio Suggestions',
  'Professional Templates',
  'Easy Customization',
]

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M5 10.2L8.2 13.4L15 6.6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
      aria-hidden="true"
    >
      <path
        d="M4 10H16M16 10L11 5M16 10L11 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Hero() {
  return (
    <main className="scroll-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center bg-transparent">
      <section className="max-w-xl">
        <h1
          data-delay="50"
          className="stagger-reveal text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15]"
        >
          Create a Professional{' '}
          <span className="text-blue-600">Portfolio</span> with{' '}
          <span className="text-blue-600">AI</span>
        </h1>

        <p
          data-delay="150"
          className="stagger-reveal text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg mt-3 sm:mt-4"
        >
          Build your portfolio faster with ready-made templates and AI-powered
          portfolio reviews that give you personalized suggestions to improve your
          content.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-6">
          {featureItems.map((item, index) => (
            <div
              key={item}
              data-delay={220 + index * 90}
              className="stagger-reveal flex items-center gap-3 text-slate-700 text-sm font-medium"
            >
              <span className="bg-blue-50 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                <CheckIcon />
              </span>
              {item}
            </div>
          ))}
        </div>

        <div data-delay="520" className="stagger-reveal mt-7 sm:mt-8">
          <Link
            to="/register"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md cursor-pointer transition-all duration-200 ease-out hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 text-center"
          >
            Design a portfolio with AI
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <div className="hidden lg:flex justify-end">
        <div data-delay="300" className="stagger-reveal relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-blue-100/60 blur-3xl scale-110" />

          <img
            src={puppetImg}
            alt="Hulma Mascot"
            className="relative w-full max-w-[220px] sm:max-w-xs md:max-w-sm lg:max-w-md h-auto object-contain mascot-float drop-shadow-[0_18px_30px_rgba(37,99,235,0.18)]"
          />
        </div>
      </div>
    </main>
  )
}
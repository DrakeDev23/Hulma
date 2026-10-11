import puppetImg from '../assets/landingpuppet.png'

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

export default function Hero() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-[#f8fbff]">
      <section className="max-w-xl">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15]">
          Create a Professional{' '}
          <span className="text-blue-600">Portfolio</span> with{' '}
          <span className="text-blue-600">AI</span>
        </h1>

        <p className="text-slate-600 text-lg leading-relaxed max-w-lg mt-4">
          Build your portfolio faster with ready-made templates and AI-powered
          portfolio reviews that give you personalized suggestions to improve your
          content.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-6">
          {featureItems.map((item) => (
            <div key={item} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
              <span className="bg-blue-50 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center">
                <CheckIcon />
              </span>
              {item}
            </div>
          ))}
        </div>

        <button className="mt-8 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all">
          Design a portfolio with AI
        </button>
      </section>

      <div className="hidden lg:flex justify-center lg:justify-end">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-blue-100/60 blur-3xl scale-110" />

          <div className="origin-bottom motion-safe:animate-wave">
            <img
              src={puppetImg}
              alt="Hulma Mascot"
              className="relative w-full max-w-md h-auto object-contain mascot-float drop-shadow-[0_18px_30px_rgba(37,99,235,0.18)]"
            />
          </div>
        </div>
      </div>
    </main>
  )
}
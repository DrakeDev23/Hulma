import logoImg from '../assets/logo.jpeg'

const navItems = ['Templates', 'AI Review', 'About', 'Help']

export default function Navbar() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <nav className="flex justify-between items-center max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-0.5">
          <img src={logoImg} alt="Hulma" className="h-9 w-auto object-contain" />
          <span className="-ml-1 text-xl font-black tracking-tight text-slate-900">Hulma</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item}
              href="#"
              className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            Login
          </button>
          <button className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Get started
          </button>
        </div>
      </nav>
    </header>
  )
}
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/react'
import { Home, Briefcase, Folder, Sparkles, Settings, X, Menu, LogOut, LayoutTemplate, PlusSquare } from 'lucide-react'
import logoImg from '../assets/logo.png'

const NAV = [
    { label: 'Dashboard', Icon: Home, path: '/dashboard' },
    { label: 'Portfolio', Icon: Briefcase, path: '/portfolio' },
    { label: 'Create Portfolio', Icon: PlusSquare, path: '/portfolio/create' },
    { label: 'Templates', Icon: LayoutTemplate, path: '/templates' },
    { label: 'AI Review', Icon: Sparkles, path: '/review' },
    { label: 'Settings', Icon: Settings, path: '/settings' },
]

function timeGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

export default function DashboardLayout({ subtitle = '', eyebrow, title, children }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { signOut } = useClerk()
    const { user, isLoaded } = useUser()
    const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)

    const email = user?.primaryEmailAddress?.emailAddress ?? ''
    const displayName = isLoaded
        ? user?.unsafeMetadata?.username || user?.username || user?.firstName || email.split('@')[0] || ''
        : ''
    const avatarUrl = user?.imageUrl || ''
    const initials = displayName
        ? displayName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((segment) => segment[0]?.toUpperCase() || '')
              .join('')
        : (email ? email[0]?.toUpperCase() || 'U' : 'U')

    const eyebrowText = eyebrow ?? `${timeGreeting()}, {name}`
    const heading = displayName
        ? eyebrowText.replace('{name}', displayName)
        : eyebrowText.replace(/,?\s*\{name\}/, '')

    const goTo = (path) => {
        navigate(path)
        if (window.innerWidth < 768) setOpen(false)
    }

    const handleLogout = async () => {
        try {
            await signOut({ redirectUrl: '/login' })
        } catch (error) {
            console.error('Logout failed:', error)
            navigate('/login')
        }
    }

    return (
        <div className="flex min-h-screen bg-[#f3f7ff] font-sans text-slate-800">
            <style>{`@keyframes hulma-pop{0%{transform:scale(.4) rotate(-12deg);opacity:0}55%{transform:scale(1.25) rotate(6deg);opacity:1}80%{transform:scale(.95) rotate(0)}100%{transform:scale(1)}}`}</style>
            {open && (
                <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
            )}

            <aside
                className={`fixed left-0 top-0 z-30 h-screen w-64 overflow-hidden bg-[#1f6fdc] text-white transition-[width,translate,transform,visibility] duration-300 ease-in-out md:sticky md:z-10 md:shrink-0 md:self-start ${open ? 'translate-x-0 md:w-52 lg:w-56' : 'max-md:invisible max-md:-translate-x-full md:w-16'
                    }`}
            >
                <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden">
                    <div className="flex items-center justify-between px-4 pt-5">
                        <div className="flex min-w-0 items-center gap-1 overflow-hidden text-xl font-semibold">
                            <button
                                type="button"
                                aria-label={open ? 'Hulma logo' : 'Open menu'}
                                onClick={() => !open && setOpen(true)}
                                className={`shrink-0 transition-transform duration-200 hover:scale-110 ${open ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                <img
                                    key={open ? 'open' : 'closed'}
                                    src={logoImg}
                                    alt="Hulma logo"
                                    className="h-8 w-8 object-contain"
                                    style={!open ? { animation: 'hulma-pop 0.5s ease-out' } : undefined}
                                />
                            </button>
                            <span className="whitespace-nowrap">Hulma</span>
                        </div>
                        <button
                            aria-label="Close menu"
                            onClick={() => setOpen(false)}
                            className={`-mt-3 shrink-0 text-white transition-all duration-200 hover:rotate-90 ${open ? 'opacity-100' : 'md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0'
                                }`}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="mt-8 flex flex-col gap-2 px-3.5 lg:mt-10">
                        {NAV.map(({ label, Icon, path }) => {
                            const active = pathname === path
                            return (
                                <button
                                    key={path}
                                    onClick={() => goTo(path)}
                                    title={label}
                                    className={`group flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-2 text-left text-[15px] transition-all duration-200 hover:translate-x-0.5 ${active && !open ? 'md:bg-white/20' : 'hover:bg-white/10'
                                        }`}
                                >
                                    <Icon size={19} strokeWidth={1.75} className="shrink-0 transition-transform duration-200 group-hover:scale-125" />
                                    <span
                                        className={`whitespace-nowrap transition-opacity duration-200 ${active ? 'underline decoration-1 underline-offset-[6px]' : ''
                                            } ${open ? 'opacity-100' : 'md:opacity-0'}`}
                                    >
                                        {label}
                                    </span>
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 px-4 lg:mt-10">
                        <div className="mb-3 h-px w-full max-w-40 bg-white" />
                        <button onClick={handleLogout} title="Log out" className="group flex items-center gap-2 pl-1.5 text-[15px] transition-all duration-200 hover:translate-x-0.5 hover:opacity-80">
                            <LogOut size={19} strokeWidth={1.75} className="shrink-0 transition-transform duration-200 group-hover:scale-125" />
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${open ? 'opacity-100' : 'md:opacity-0'}`}>
                                Log out
                            </span>
                        </button>
                    </div>

                    <div className="mt-auto flex flex-col items-center gap-3 overflow-hidden bg-[#6aa5e6] px-2 py-6 lg:py-8">
                        <div className="flex h-11 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-semibold text-[#1f6fdc] shadow-sm transition-transform duration-300 hover:scale-110 lg:h-12 lg:w-14">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName || email || 'User avatar'} className="h-full w-full object-cover" />
                            ) : (
                                <span>{initials || 'U'}</span>
                            )}
                        </div>
                        <span
                            className={`max-w-full truncate text-sm transition-all duration-300 lg:text-[15px] ${open ? 'max-h-6 opacity-100' : 'md:-mt-3 md:max-h-0 md:opacity-0'
                                }`}
                        >
                            {email}
                        </span>
                    </div>
                </div>
            </aside>

            <main className="min-w-0 flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
                <header className="flex items-start gap-3">
                    {!open && (
                        <button aria-label="Open menu" onClick={() => setOpen(true)} className="mt-1 shrink-0 text-[#1f6fdc] transition-transform duration-200 hover:scale-110 md:hidden">
                            <Menu size={26} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-xl font-medium leading-tight text-slate-600 sm:text-2xl lg:text-[28px]">
                            {heading}
                        </h1>
                        <h2 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[30px]">
                            {title ?? (
                                <>
                                    <span className="text-[#1d6fe0]">Build</span> and <span className="text-[#2020d0]">manage</span> your portfolio
                                </>
                            )}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                    </div>
                </header>

                {children}
            </main>
        </div>
    )
}
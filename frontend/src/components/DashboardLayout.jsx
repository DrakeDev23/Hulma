import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/react'
import { Home, Briefcase, Sparkles, Settings, X, Menu, LogOut, LayoutTemplate, PlusSquare } from 'lucide-react'
import logoImg from '../assets/logo.png'
import { resolveDisplayName } from '../utils/portfolioUtils'
import { clearAuthSession } from '../utils/session'

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

export default function DashboardLayout({ userName: propUserName, email: propEmail, subtitle = '', eyebrow, title, children }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { signOut } = useClerk()
    const { user } = useUser()
    const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setOpen(true)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.innerWidth < 768 && open) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = originalOverflow
            }
        }
    }, [open])

    const clerkEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
    const cleanClerkEmail = clerkEmail && !clerkEmail.includes('@clerk.local') ? clerkEmail.trim() : ''
    const cleanPropEmail = propEmail && !propEmail.includes('@clerk.local') ? propEmail.trim() : ''
    const email = cleanClerkEmail || cleanPropEmail || ''

    const clerkName = resolveDisplayName(user, '')
    const cleanPropUser = propUserName && !propUserName.startsWith('user_') && propUserName !== 'User' ? propUserName.trim() : ''
    const displayName = clerkName || cleanPropUser || (email ? email.split('@')[0] : '') || user?.firstName || 'User'
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
            clearAuthSession()
            await signOut({ redirectUrl: '/login' })
        } catch (error) {
            console.error('Logout failed:', error)
            clearAuthSession()
            navigate('/login')
        }
    }

    return (
        <div className="flex min-h-screen bg-[#f3f7ff] font-sans text-slate-800 antialiased">
            <style>{`@keyframes hulma-pop{0%{transform:scale(.4) rotate(-12deg);opacity:0}55%{transform:scale(1.25) rotate(6deg);opacity:1}80%{transform:scale(.95) rotate(0)}100%{transform:scale(1)}}`}</style>
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300 md:hidden"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`sticky top-0 z-50 h-screen shrink-0 self-start overflow-hidden bg-[#1f6fdc] text-white shadow-xl transition-[width] duration-300 ease-in-out md:shadow-none ${
                    open ? 'w-64 max-md:fixed max-md:left-0 max-md:top-0 md:w-52 lg:w-56' : 'w-16'
                }`}
            >
                <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden">
                    <div className={`flex items-center ${open ? 'justify-between px-3.5 sm:px-4' : 'justify-center px-2'} pt-4 sm:pt-5`}>
                        {open ? (
                            <>
                                <div className="flex min-w-0 items-center gap-2 overflow-hidden text-lg font-semibold sm:text-xl">
                                    <button
                                        type="button"
                                        aria-label="Hulma logo"
                                        onClick={() => setOpen(false)}
                                        className="shrink-0 rounded-lg p-1 transition-transform duration-200 hover:scale-105 active:scale-95"
                                    >
                                        <img
                                            src={logoImg}
                                            alt="Hulma logo"
                                            className="h-8 w-8 object-contain"
                                        />
                                    </button>
                                    <span className="whitespace-nowrap">
                                        Hulma
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    title="Collapse sidebar"
                                    aria-label="Collapse sidebar"
                                    onClick={() => setOpen(false)}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95"
                                >
                                    <X size={20} />
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                title="Expand sidebar"
                                aria-label="Expand sidebar"
                                onClick={() => setOpen(true)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-200 hover:bg-white/15 active:scale-95"
                            >
                                <Menu size={22} />
                            </button>
                        )}
                    </div>

                    <nav className="mt-6 flex flex-col gap-1.5 px-2.5 sm:mt-8 sm:px-3 lg:mt-10">
                        {NAV.map(({ label, Icon, path }) => {
                            const active = pathname === path
                            return (
                                <button
                                    key={path}
                                    onClick={() => goTo(path)}
                                    title={label}
                                    aria-label={label}
                                    className={`group flex w-full items-center ${
                                        open ? 'gap-2.5 px-2.5 text-left' : 'justify-center px-0'
                                    } overflow-hidden rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                                        active
                                            ? 'bg-white/20 text-white shadow-xs font-semibold'
                                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <Icon
                                        size={19}
                                        strokeWidth={active ? 2.2 : 1.75}
                                        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                                    />
                                    <span
                                        className={`whitespace-nowrap transition-opacity duration-200 ${
                                            open ? 'opacity-100' : 'hidden'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                </button>
                            )
                        })}
                    </nav>

                    <div className={`mt-6 ${open ? 'px-3.5 sm:px-4' : 'px-2.5'} sm:mt-8 lg:mt-10`}>
                        <div className={`mb-3 h-px w-full ${open ? 'max-w-40' : 'max-w-full'} bg-white/20`} />
                        <button
                            onClick={handleLogout}
                            title="Log out"
                            aria-label="Log out"
                            className={`group flex w-full items-center ${
                                open ? 'gap-2.5 px-2.5 text-left' : 'justify-center px-0'
                            } rounded-xl py-2 text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white`}
                        >
                            <LogOut size={19} strokeWidth={1.75} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${open ? 'opacity-100' : 'hidden'}`}>
                                Log out
                            </span>
                        </button>
                    </div>

                    <div className="mt-auto flex flex-col items-center gap-2.5 overflow-hidden bg-[#185ec2] px-2 py-4 sm:py-5 lg:py-6">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-bold text-[#1f6fdc] shadow-sm transition-transform duration-300 hover:scale-105 sm:h-11 sm:w-11 sm:text-sm">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName || email || 'User avatar'} className="h-full w-full object-cover" />
                            ) : (
                                <span>{initials || 'U'}</span>
                            )}
                        </div>
                        <span
                            className={`max-w-full truncate px-2 text-xs font-medium text-white/90 transition-all duration-300 ${
                                open ? 'max-h-6 opacity-100' : 'md:-mt-2 md:max-h-0 md:opacity-0'
                            }`}
                        >
                            {email}
                        </span>
                    </div>
                </div>
            </aside>

            <main className="min-w-0 flex-1 px-3.5 pb-10 pt-3.5 sm:px-6 sm:pb-12 sm:pt-5 lg:px-8">
                <header className="flex items-start gap-2.5 sm:gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base font-medium leading-tight text-slate-500 sm:text-xl lg:text-2xl">
                            {heading}
                        </h1>
                        <h2 className="mt-0.5 text-xl font-bold leading-tight text-slate-900 sm:text-2xl lg:text-[28px] break-words">
                            {title ?? (
                                <>
                                    <span className="text-[#1d6fe0]">Build</span> and <span className="text-[#2020d0]">manage</span> your portfolio
                                </>
                            )}
                        </h2>
                        {subtitle && <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">{subtitle}</p>}
                    </div>
                </header>

                <div className="mt-4 sm:mt-5">
                    {children}
                </div>
            </main>
        </div>
    )
}
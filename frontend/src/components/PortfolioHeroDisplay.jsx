import { useState } from 'react'
import { UserRound, Mail, Phone, MapPin, Eye, Layers, Briefcase, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react'

const MAX_DOTS = 5

const THEMES = {
    simple: {
        panel: 'bg-gradient-to-br from-[#f3f0eb] to-[#e4dfd3] text-[#2d2d2d] font-serif',
        muted: 'text-[#6b6455]',
        label: 'text-[#8a7e6a]',
        chip: 'bg-[#1e293b]/10 text-[#1e293b]',
        card: 'bg-white/70',
        line: 'border-[#d6cfbf]',
        avatar: 'bg-[#1e293b]/10 text-[#1e293b]',
        badge: 'bg-[#1e293b] text-white',
    },
    modern: {
        panel: 'bg-gradient-to-br from-[#f6f8fa] to-[#dbe8fb] text-slate-900 font-sans',
        muted: 'text-slate-600',
        label: 'text-[#1d4ed8]',
        chip: 'bg-[#1f6fdc]/10 text-[#1f6fdc]',
        card: 'bg-white/80',
        line: 'border-[#c9daf5]',
        avatar: 'bg-[#1f6fdc]/10 text-[#1f6fdc]',
        badge: 'bg-[#1d4ed8] text-white',
    },
    creative: {
        panel: 'bg-gradient-to-br from-[#0a0a12] to-[#24103a] text-white font-sans',
        muted: 'text-slate-300',
        label: 'text-[#f0a030]',
        chip: 'bg-[#ffa502]/20 text-[#ffa502]',
        card: 'bg-white/10',
        line: 'border-white/15',
        avatar: 'bg-[#ffa502]/20 text-[#ffa502]',
        badge: 'bg-[#ffa502] text-[#1a1025]',
    },
}

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const titleCase = (s) => String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function Slide({ portfolio }) {
    const templateId = portfolio.sections?.meta?.templateId || portfolio.templateId || portfolio.template || 'simple'
    const t = THEMES[templateId] || THEMES.simple
    const profile = portfolio.profile || portfolio.sections?.profile || {}
    const sections = portfolio.sections || {}
    const name = profile.fullName || portfolio.title || 'Your name'
    const about = profile.aboutMe || portfolio.summary || ''
    const skills = portfolio.skills || asLines(sections.skills)
    const projects = portfolio.projects || []
    const experience = asLines(sections.workExperience)
    const education = asLines(sections.education)
    const views = Number(portfolio.views || 0)

    const contacts = [
        profile.email && { Icon: Mail, text: profile.email },
        profile.contactNumber && { Icon: Phone, text: profile.contactNumber },
        profile.address && { Icon: MapPin, text: profile.address },
    ].filter(Boolean)

    const stats = [
        { Icon: Layers, label: 'Projects', value: projects.length },
        { Icon: Briefcase, label: 'Roles', value: experience.length },
        { Icon: GraduationCap, label: 'Education', value: education.length },
        { Icon: Eye, label: 'Views', value: views },
    ]

    const hasLeft = contacts.length > 0 || about
    const hasRight = skills.length > 0 || projects.length > 0

    return (
        <div className={`flex h-full select-none flex-col gap-3.5 p-3.5 sm:gap-4 sm:p-5 ${t.panel}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-16 sm:w-16 ${t.avatar}`}>
                    {portfolio.picture || profile.profilePicture ? (
                        <img src={portfolio.picture || profile.profilePicture} alt={name} className="h-full w-full object-cover" />
                    ) : (
                        <UserRound size={24} className="sm:size-7" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-bold leading-tight sm:text-lg">{name}</strong>
                    <small className={`block truncate text-[11px] sm:text-xs ${t.muted}`}>{portfolio.title || 'Portfolio'}</small>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${t.badge}`}>{titleCase(templateId)}</span>
            </div>

            {(hasLeft || hasRight) && (
                <div className={`grid gap-3.5 sm:gap-4 ${hasLeft && hasRight ? 'sm:grid-cols-[0.9fr_1.1fr]' : ''}`}>
                    {hasLeft && (
                        <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
                            {contacts.length > 0 && (
                                <ul className={`space-y-1 text-[11px] sm:space-y-1.5 ${t.muted}`}>
                                    {contacts.map(({ Icon, text }) => (
                                        <li key={text} className="flex min-w-0 items-center gap-1.5">
                                            <Icon size={12} className="shrink-0" /> <span className="truncate">{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {about && (
                                <div>
                                    <h6 className={`text-[11px] font-bold ${t.label}`}>About</h6>
                                    <p className={`mt-0.5 line-clamp-3 text-xs leading-relaxed sm:line-clamp-4 ${t.muted}`}>{about}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {hasRight && (
                        <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
                            {skills.length > 0 && (
                                <div>
                                    <h6 className={`text-[11px] font-bold ${t.label}`}>Skills</h6>
                                    <div className="mt-1 flex flex-wrap gap-1 sm:mt-1.5 sm:gap-1.5">
                                        {skills.slice(0, 6).map((s) => (
                                            <span key={s} className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-[11px] ${t.chip}`}>{s}</span>
                                        ))}
                                        {skills.length > 6 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-[11px] ${t.chip}`}>+{skills.length - 6}</span>}
                                    </div>
                                </div>
                            )}
                            {projects.length > 0 && (
                                <div>
                                    <h6 className={`text-[11px] font-bold ${t.label}`}>Projects</h6>
                                    <div className="mt-1 space-y-1 sm:mt-1.5 sm:space-y-1.5">
                                        {projects.slice(0, 3).map((p, i) => (
                                            <div key={`${p?.name}-${i}`} className={`rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 ${t.card}`}>
                                                <div className="truncate text-[11px] font-semibold sm:text-xs">{p?.name || p?.title || `Project ${i + 1}`}</div>
                                                {p?.description && <div className={`line-clamp-1 text-[10px] sm:text-[11px] ${t.muted}`}>{p.description}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className={`mt-auto grid grid-cols-4 gap-1 border-t pt-2.5 sm:gap-1.5 sm:pt-3 ${t.line}`}>
                {stats.map(({ Icon, label, value }) => (
                    <div key={label} className="text-center">
                        <strong className="block text-base font-bold leading-tight sm:text-lg">{value}</strong>
                        <small className={`flex items-center justify-center gap-0.5 text-[9px] sm:gap-1 sm:text-[10px] ${t.muted}`}><Icon size={10} className="shrink-0" /> <span className="truncate">{label}</span></small>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function PortfolioHeroDisplay({ portfolios = [], portfolio, index, onIndexChange, onOpen }) {
    const list = portfolios.length ? portfolios : portfolio ? [portfolio] : []

    const [localIndex, setLocalIndex] = useState(0)
    const controlled = typeof onIndexChange === 'function'

    if (!list.length) return null

    const rawIndex = controlled ? index ?? 0 : localIndex
    const activeIndex = Math.min(Math.max(rawIndex, 0), list.length - 1)
    const many = list.length > 1

    const select = (i) => {
        const next = Math.max(0, Math.min(list.length - 1, i))
        if (controlled) onIndexChange(next)
        else setLocalIndex(next)
    }

    return (
        <div className="min-w-0">
            <div className="relative">
                <div
                    className="overflow-hidden rounded-2xl border border-white/30 shadow-lg shadow-blue-950/20"
                    role="region"
                    aria-roledescription="carousel"
                    aria-label="Your portfolios"
                >
                    <div
                        className="flex items-stretch transition-transform duration-300 ease-out motion-reduce:transition-none"
                        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                    >
                        {list.map((p, i) => (
                            <div
                                key={p?.id ?? i}
                                role="button"
                                tabIndex={i === activeIndex ? 0 : -1}
                                aria-hidden={i !== activeIndex}
                                aria-label={`Preview portfolio ${i + 1} of ${list.length}`}
                                onClick={() => onOpen?.(i)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onOpen?.(i)
                                    } else if (e.key === 'ArrowLeft') {
                                        select(i - 1)
                                    } else if (e.key === 'ArrowRight') {
                                        select(i + 1)
                                    }
                                }}
                                className={`w-full shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white ${onOpen ? 'cursor-pointer' : ''}`}
                            >
                                <Slide portfolio={p} />
                            </div>
                        ))}
                    </div>
                </div>

                {many && (
                    <>
                        <button
                            type="button"
                            onClick={() => select(activeIndex - 1)}
                            aria-label="Previous portfolio"
                            disabled={activeIndex <= 0}
                            className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95 disabled:opacity-30"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => select(activeIndex + 1)}
                            aria-label="Next portfolio"
                            disabled={activeIndex >= list.length - 1}
                            className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95 disabled:opacity-30"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}
            </div>

            {many && (
                <div className="mt-3 flex items-center justify-center gap-2 text-white">
                    {list.length <= MAX_DOTS ? (
                        list.map((p, i) => (
                            <button
                                key={p?.id ?? i}
                                type="button"
                                onClick={() => select(i)}
                                aria-label={`Go to portfolio ${i + 1}`}
                                aria-current={i === activeIndex}
                                className={`h-2 rounded-full transition-all duration-200 ${
                                    i === activeIndex ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                                }`}
                            />
                        ))
                    ) : (
                        <span className="text-[11px] text-[#d3e5fa]">
                            {activeIndex + 1} / {list.length}
                        </span>
                    )}
                </div>
            )}

            {onOpen && (
                <p className="mt-2 text-center text-[11px] text-[#d3e5fa]">Click the portfolio to preview it</p>
            )}
        </div>
    )
}
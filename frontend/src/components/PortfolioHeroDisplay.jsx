import { useState } from 'react'
import { UserRound, Mail, Phone, MapPin, Eye, Layers, Briefcase, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react'

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
        <div className={`flex select-none flex-col gap-4 p-4 sm:p-5 ${t.panel}`}>
            <div className="flex items-center gap-3">
                <div className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-16 sm:w-16 ${t.avatar}`}>
                    {portfolio.picture || profile.profilePicture ? (
                        <img src={portfolio.picture || profile.profilePicture} alt={name} className="h-full w-full object-cover" />
                    ) : (
                        <UserRound size={28} />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-bold leading-tight sm:text-lg">{name}</strong>
                    <small className={`block truncate text-xs ${t.muted}`}>{portfolio.title || 'Portfolio'}</small>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.badge}`}>{titleCase(templateId)}</span>
            </div>

            {(hasLeft || hasRight) && (
                <div className={`grid gap-4 ${hasLeft && hasRight ? 'sm:grid-cols-[0.9fr_1.1fr]' : ''}`}>
                    {hasLeft && (
                        <div className="flex min-w-0 flex-col gap-3">
                            {contacts.length > 0 && (
                                <ul className={`space-y-1.5 text-[11px] ${t.muted}`}>
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
                                    <p className={`mt-1 line-clamp-4 text-xs leading-relaxed ${t.muted}`}>{about}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {hasRight && (
                        <div className="flex min-w-0 flex-col gap-3">
                            {skills.length > 0 && (
                                <div>
                                    <h6 className={`text-[11px] font-bold ${t.label}`}>Skills</h6>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {skills.slice(0, 6).map((s) => (
                                            <span key={s} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${t.chip}`}>{s}</span>
                                        ))}
                                        {skills.length > 6 && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${t.chip}`}>+{skills.length - 6}</span>}
                                    </div>
                                </div>
                            )}
                            {projects.length > 0 && (
                                <div>
                                    <h6 className={`text-[11px] font-bold ${t.label}`}>Projects</h6>
                                    <div className="mt-1.5 space-y-1.5">
                                        {projects.slice(0, 3).map((p, i) => (
                                            <div key={`${p?.name}-${i}`} className={`rounded-lg px-2.5 py-1.5 ${t.card}`}>
                                                <div className="truncate text-xs font-semibold">{p?.name || p?.title || `Project ${i + 1}`}</div>
                                                {p?.description && <div className={`line-clamp-1 text-[11px] ${t.muted}`}>{p.description}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className={`grid grid-cols-4 gap-1.5 border-t pt-3 ${t.line}`}>
                {stats.map(({ Icon, label, value }) => (
                    <div key={label} className="text-center">
                        <strong className="block text-lg font-bold leading-tight">{value}</strong>
                        <small className={`flex items-center justify-center gap-1 text-[10px] ${t.muted}`}><Icon size={10} /> {label}</small>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function PortfolioHeroDisplay({ portfolios = [], portfolio }) {
    const list = portfolios.length ? portfolios : portfolio ? [portfolio] : []
    const [index, setIndex] = useState(0)

    if (!list.length) return null

    const current = Math.min(index, list.length - 1)
    const go = (step) => setIndex((current + step + list.length) % list.length)

    return (
        <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/30 shadow-lg shadow-blue-950/20" aria-roledescription="carousel">
                <div
                    className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
                    style={{ transform: `translateX(-${current * 100}%)` }}
                >
                    {list.map((p, n) => (
                        <div key={p?.id ?? n} className="w-full shrink-0" role="group" aria-label={`Portfolio ${n + 1} of ${list.length}`} aria-hidden={n !== current}>
                            <Slide portfolio={p} />
                        </div>
                    ))}
                </div>
            </div>

            {list.length > 1 && (
                <div className="mt-2.5 flex items-center justify-center gap-3 text-white">
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Previous portfolio"
                        className="grid h-7 w-7 place-items-center rounded-full border border-white/40 bg-white/15 transition hover:bg-white/25 active:scale-95"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1.5">
                        {list.map((p, n) => (
                            <button
                                key={p?.id ?? n}
                                type="button"
                                onClick={() => setIndex(n)}
                                aria-label={`Show portfolio ${n + 1}`}
                                aria-current={n === current}
                                className={`h-1.5 rounded-full transition-all ${n === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'}`}
                            />
                        ))}
                    </div>
                    <span className="text-[11px] text-[#d3e5fa]">{current + 1} / {list.length}</span>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Next portfolio"
                        className="grid h-7 w-7 place-items-center rounded-full border border-white/40 bg-white/15 transition hover:bg-white/25 active:scale-95"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    )
}
import { useState } from 'react'
import {
    Mail,
    Phone,
    MapPin,
    Globe,
    Layers,
    Sparkles,
    Star,
    Eye,
    UserRound,
    Briefcase,
    GraduationCap,
    ExternalLink,
    PenLine,
    ArrowUpRight,
    Lightbulb,
    Clock,
    FileText,
} from 'lucide-react'

const asList = (v) =>
    Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.title || x?.name || '')).filter(Boolean) : []

function Ring({ value }) {
    const r = 26
    const c = 2 * Math.PI * r
    const v = Math.min(100, Math.max(0, Number(value) || 0))
    return (
        <div className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-[72px] sm:w-[72px]" aria-label={`${v}% complete`}>
            <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
                <circle
                    cx="36"
                    cy="36"
                    r={r}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c - (c * v) / 100}
                    className="transition-all duration-700"
                />
            </svg>
            <span className="absolute text-xs font-semibold sm:text-sm">{v}%</span>
        </div>
    )
}

function Empty({ text, onEdit }) {
    return (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-[#f3f6fb] p-4 text-xs text-slate-500">
            <p>{text}</p>
            <button
                onClick={onEdit}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-800 transition hover:border-[#1f6fdc] hover:text-[#1f6fdc]"
            >
                Add now
            </button>
        </div>
    )
}

export default function PortfolioReviewCard({
    portfolio,
    review,
    completion = 0,
    views = 0,
    statusText = 'Draft',
    templateLabel = '',
    lastUpdated = '',
    sectionCount = 0,
    onOpen,
    onEdit,
}) {
    const [tab, setTab] = useState('overview')

    const profile = portfolio.profile || {}
    const sections = portfolio.sections || {}
    const name = profile.fullName || portfolio.title || 'Your name'
    const projects = portfolio.projects || []
    const skills = portfolio.skills || []
    const experience = asList(sections.workExperience)
    const education = asList(sections.education)
    const links = Object.entries(sections.socialLinks || {}).filter(([, url]) => url)

    const tabs = [
        { id: 'overview', label: 'Overview', Icon: FileText },
        { id: 'projects', label: 'Projects', Icon: Layers, count: projects.length },
        { id: 'skills', label: 'Skills', Icon: Sparkles, count: skills.length },
        { id: 'experience', label: 'Experience', Icon: Briefcase, count: experience.length },
        { id: 'education', label: 'Education', Icon: GraduationCap, count: education.length },
    ]

    const contacts = [
        profile.email && { Icon: Mail, text: profile.email },
        profile.contactNumber && { Icon: Phone, text: profile.contactNumber },
        profile.address && { Icon: MapPin, text: profile.address },
    ].filter(Boolean)

    return (
        <article className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(30,70,140,0.10)]">
            <header className="bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white sm:p-5">
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="View your portfolio"
                    onClick={onOpen}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpen?.()
                        }
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-xl outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-white/70 sm:gap-4"
                >
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/20 ring-2 ring-white/40 sm:h-20 sm:w-20 sm:rounded-2xl">
                        {portfolio.picture ? (
                            <img src={portfolio.picture} alt={name} className="h-full w-full object-cover" />
                        ) : (
                            <UserRound size={26} className="text-white/80 sm:size-8" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h4 className="truncate text-base font-semibold leading-tight sm:text-xl">{name}</h4>
                            <span className="rounded-full border border-white/40 bg-white/15 px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-[11px]">{statusText}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#d3e5fa] sm:text-sm">{portfolio.title || 'Untitled portfolio'}</p>
                        <p className="mt-0.5 text-[10px] text-[#bcd7f6] sm:text-[11px]">Click to view your portfolio{templateLabel ? ` · ${templateLabel} template` : ''}</p>
                    </div>
                    <Ring value={completion} />
                </div>

                {(contacts.length > 0 || links.length > 0) && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] sm:mt-4 sm:gap-2 sm:text-xs">
                        {contacts.map(({ Icon, text }) => (
                            <span key={text} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1">
                                <Icon size={12} className="shrink-0" /> <span className="truncate">{text}</span>
                            </span>
                        ))}
                        {links.map(([label, url]) => (
                            <a
                                key={label}
                                href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2 py-0.5 transition hover:bg-white/25 sm:px-2.5 sm:py-1"
                            >
                                <Globe size={12} /> {label} <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
                )}
            </header>

            <div className="p-3 sm:p-5">
                <div role="tablist" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                    {tabs.map(({ id, label, Icon, count }) => {
                        const active = tab === id
                        return (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={active}
                                onClick={() => setTab(id)}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition duration-200 sm:px-3 ${
                                    active ? 'bg-[#1f6fdc] text-white shadow-xs' : 'bg-[#f3f6fb] text-slate-600 hover:bg-[#e8effa]'
                                }`}
                            >
                                <Icon size={13} /> {label}
                                {count !== undefined && (
                                    <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/25' : 'bg-white text-slate-500'}`}>{count}</span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div role="tabpanel" className="mt-3 min-h-40">
                    {tab === 'overview' && (
                        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                    {[
                                        { label: 'Views', value: views, Icon: Eye },
                                        { label: 'Sections', value: sectionCount, Icon: FileText },
                                        { label: 'Projects', value: projects.length, Icon: Layers },
                                    ].map(({ label, value, Icon }) => (
                                        <div key={label} className="rounded-xl bg-[#f3f6fb] p-2 sm:px-3 sm:py-2.5">
                                            <small className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500"><Icon size={11} className="shrink-0" /> <span className="truncate">{label}</span></small>
                                            <strong className="mt-0.5 block text-lg sm:text-2xl font-semibold leading-tight">{value}</strong>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-xl bg-[#f3f6fb] p-3.5">
                                    <h5 className="text-xs font-semibold text-slate-800">About</h5>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                        {portfolio.summary || 'No summary yet.'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-[#dcf3e7] p-3.5 text-[#0f6f4a]">
                                <div className="flex items-center justify-between gap-2">
                                    <h5 className="flex items-center gap-1.5 text-xs font-semibold"><Star size={13} /> AI review</h5>
                                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium">{review.label}</span>
                                </div>
                                {review.summary ? (
                                    <p className="mt-2 text-xs leading-relaxed">{review.summary}</p>
                                ) : (
                                    <p className="mt-2 text-xs leading-relaxed">Run the AI review to get feedback on your portfolio.</p>
                                )}
                                {review.suggestions?.length > 0 && (
                                    <ul className="mt-2 flex flex-col gap-1.5">
                                        {review.suggestions.slice(0, 3).map((s, idx) => {
                                            const text = typeof s === 'object' && s !== null ? (s.title ? `${s.title}: ${s.text || ''}` : (s.text || '')) : String(s)
                                            return (
                                                <li key={typeof s === 'object' ? (s.id || idx) : s} className="flex gap-1.5 text-xs leading-snug">
                                                    <Lightbulb size={12} className="mt-0.5 shrink-0" /> {text}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'projects' &&
                        (projects.length ? (
                            <ul className="grid gap-2.5 sm:grid-cols-2">
                                {projects.map((p, i) => (
                                    <li key={p?.id ?? `${p?.name}-${i}`} className="rounded-xl bg-[#f3f6fb] p-3.5 transition hover:-translate-y-0.5 hover:bg-[#e8effa]">
                                        <div className="flex items-start justify-between gap-2">
                                            <h5 className="text-sm font-semibold text-slate-800">{p?.name || p?.title || `Project ${i + 1}`}</h5>
                                            {p?.link && (
                                                <a href={p.link} target="_blank" rel="noreferrer" className="text-[#1f6fdc]" aria-label="Open project">
                                                    <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="mt-1 line-clamp-3 text-xs leading-snug text-slate-500">{p?.description}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Empty text="No projects yet." onEdit={onEdit} />
                        ))}

                    {tab === 'skills' &&
                        (skills.length ? (
                            <div className="flex flex-wrap gap-2">
                                {skills.map((s) => (
                                    <span key={s} className="rounded-full bg-[#dce9fb] px-3 py-1 text-xs font-medium text-[#1f6fdc]">{s}</span>
                                ))}
                            </div>
                        ) : (
                            <Empty text="No skills listed yet." onEdit={onEdit} />
                        ))}

                    {tab === 'experience' &&
                        (experience.length ? (
                            <ol className="ml-2 flex flex-col gap-2.5 border-l-2 border-[#dce9fb] pl-4">
                                {experience.map((e, i) => (
                                    <li key={`${e}-${i}`} className="relative rounded-xl bg-[#f3f6fb] px-3 py-2.5 text-xs leading-snug text-slate-700">
                                        <span className="absolute -left-[23px] top-3.5 h-2.5 w-2.5 rounded-full bg-[#1f6fdc] ring-4 ring-white" />
                                        {e}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <Empty text="No work experience added yet." onEdit={onEdit} />
                        ))}

                    {tab === 'education' &&
                        (education.length ? (
                            <ol className="ml-2 flex flex-col gap-2.5 border-l-2 border-[#dcf3e7] pl-4">
                                {education.map((e, i) => (
                                    <li key={`${e}-${i}`} className="relative rounded-xl bg-[#f3f6fb] px-3 py-2.5 text-xs leading-snug text-slate-700">
                                        <span className="absolute -left-[23px] top-3.5 h-2.5 w-2.5 rounded-full bg-[#12875a] ring-4 ring-white" />
                                        {e}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <Empty text="No education added yet." onEdit={onEdit} />
                        ))}
                </div>

                <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={12} /> Last edited {lastUpdated || 'recently'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {Boolean(portfolio?.slug || portfolio?.id) && (
                            <a
                                href={`/p/${portfolio.slug || portfolio.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#1f6fdc] bg-[#eaf1fc] px-3.5 py-1.5 text-xs font-medium text-[#1f6fdc] transition hover:-translate-y-0.5 hover:bg-[#dce9fb] active:scale-95"
                            >
                                Public link <ExternalLink size={12} />
                            </a>
                        )}
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 transition hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                        >
                            <PenLine size={12} /> Edit
                        </button>
                        <button
                            onClick={onOpen}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#1f6fdc] px-3.5 py-1.5 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95"
                        >
                            View portfolio <ArrowUpRight size={12} />
                        </button>
                    </div>
                </footer>
            </div>
        </article>
    )
}
import { Mail, Phone, MapPin, Globe, ArrowUpRight, Briefcase, GraduationCap, ArrowLeft } from 'lucide-react'

const THEMES = {
    simple: {
        page: 'bg-[#fdfcfb] text-slate-900 font-serif',
        nav: 'bg-[#fdfcfb]/90 border-stone-200 text-slate-700',
        hero: 'from-[#1e293b] to-[#334155]',
        heroMuted: 'text-slate-300',
        blob: 'bg-[#c9b79c]/50',
        card: 'bg-white border border-stone-200',
        inner: 'bg-[#f5f3ee]',
        muted: 'text-slate-600',
        heading: 'text-[#2d2d2d]',
        chip: 'bg-[#1e293b]/10 text-[#1e293b]',
        btn: 'bg-white text-[#1e293b] hover:bg-slate-100',
        cta: 'bg-[#1e293b] text-white',
        dot: 'bg-[#1e293b] ring-[#fdfcfb]',
        line: 'border-stone-200',
    },
    modern: {
        page: 'bg-[#f6f8fa] text-slate-900 font-sans',
        nav: 'bg-[#f6f8fa]/90 border-slate-200 text-slate-700',
        hero: 'from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]',
        heroMuted: 'text-[#cfe0fa]',
        blob: 'bg-white/20',
        card: 'bg-white border border-slate-100 shadow-[0_4px_24px_rgba(30,70,140,0.06)]',
        inner: 'bg-[#eef3fb]',
        muted: 'text-slate-600',
        heading: 'text-[#1d4ed8]',
        chip: 'bg-[#1f6fdc]/10 text-[#1f6fdc]',
        btn: 'bg-white text-[#1d4ed8] hover:bg-blue-50',
        cta: 'bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] text-white',
        dot: 'bg-[#1f6fdc] ring-[#f6f8fa]',
        line: 'border-slate-200',
    },
    creative: {
        page: 'bg-[#0a0a12] text-white font-sans',
        nav: 'bg-[#0a0a12]/90 border-white/10 text-slate-200',
        hero: 'from-[#7c3aed] via-[#9333ea] to-[#6b21a8]',
        heroMuted: 'text-[#ffd5a5]',
        blob: 'bg-[#ffa502]/40',
        card: 'bg-[#16122a]/70 border border-white/10',
        inner: 'bg-[#24103a]/60',
        muted: 'text-slate-300',
        heading: 'text-[#f0a030]',
        chip: 'bg-[#ffa502]/20 text-[#ffa502]',
        btn: 'bg-[#ffa502] text-[#1a1025] hover:bg-[#ffb52e]',
        cta: 'bg-gradient-to-br from-[#7c3aed] to-[#6b21a8] text-white',
        dot: 'bg-[#ffa502] ring-[#0a0a12]',
        line: 'border-white/10',
    },
}

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

function Title({ t, children }) {
    return <h2 className={`text-2xl font-bold tracking-tight sm:text-3xl ${t.heading}`}>{children}</h2>
}

function Timeline({ t, items, Icon, label }) {
    return (
        <div>
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${t.heading}`}>
                <Icon size={18} /> {label}
            </h3>
            <ol className={`mt-4 ml-2 space-y-3 border-l-2 pl-5 ${t.line}`}>
                {items.map((item, i) => (
                    <li key={`${item}-${i}`} className={`relative rounded-xl px-4 py-3 text-sm leading-snug ${t.inner} ${t.muted}`}>
                        <span className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ${t.dot}`} />
                        {item}
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default function PortfolioSite({ portfolio, template = 'simple', idPrefix = 'site', stickyNav = true, onBack, backLabel = 'Back to editor' }) {
    const t = THEMES[template] || THEMES.simple
    const p = portfolio || {}
    const sections = p.sections || {}
    const profile = sections.profile || {}
    const name = profile.fullName || p.title || 'Your name'
    const about = profile.aboutMe || p.summary || ''
    const skills = asLines(sections.skills)
    const education = asLines(sections.education)
    const experience = asLines(sections.workExperience)
    const projects = Array.isArray(p.projects) ? p.projects : []
    const links = Object.entries(sections.socialLinks || {}).filter(([, url]) => url)
    const picture = profile.profilePicture

    const nav = [
        { id: 'about', label: 'About', show: Boolean(about) },
        { id: 'skills', label: 'Skills', show: skills.length > 0 },
        { id: 'projects', label: 'Projects', show: projects.length > 0 },
        { id: 'experience', label: 'Experience', show: experience.length > 0 || education.length > 0 },
        { id: 'contact', label: 'Contact', show: true },
    ].filter((s) => s.show)

    const go = (id) => (e) => {
        e.preventDefault()
        document.getElementById(`${idPrefix}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const stats = [
        { label: 'Projects', value: projects.length },
        { label: 'Skills', value: skills.length },
        { label: 'Roles', value: experience.length },
        { label: 'Links', value: links.length },
    ].filter((s) => s.value > 0)

    return (
        <div className={`min-h-full ${t.page}`}>
            <nav className={`${stickyNav ? 'sticky top-0' : ''} z-10 border-b backdrop-blur ${t.nav}`}>
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 sm:px-6 py-2.5 sm:py-3">
                    {onBack && (
                        <button type="button" onClick={onBack} className="inline-flex shrink-0 items-center gap-1.5 text-xs sm:text-sm font-bold tracking-tight hover:underline">
                            <ArrowLeft size={14} /> <span className="hidden sm:inline">{backLabel}</span><span className="sm:hidden">Back</span>
                        </button>
                    )}
                    <span className="truncate max-w-[120px] sm:max-w-xs text-xs sm:text-sm font-bold tracking-tight">{name}</span>
                    <div className="flex gap-1 overflow-x-auto text-xs font-medium sm:text-sm no-scrollbar">
                        {nav.map((s) => (
                            <a key={s.id} href={`#${idPrefix}-${s.id}`} onClick={go(s.id)} className="shrink-0 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 transition hover:bg-black/5 hover:underline">
                                {s.label}
                            </a>
                        ))}
                    </div>
                </div>
            </nav>

            <header className={`relative overflow-hidden bg-gradient-to-br ${t.hero}`}>
                <div className="mx-auto grid max-w-6xl items-center gap-8 sm:gap-10 px-4 sm:px-6 pb-16 sm:pb-20 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="text-white">
                        {p.title && <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{p.title}</span>}
                        <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{name}</h1>
                        {p.summary && <p className={`mt-3 sm:mt-4 line-clamp-4 max-w-xl text-sm sm:text-base leading-relaxed lg:text-lg ${t.heroMuted}`}>{p.summary}</p>}
                        <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
                            {projects.length > 0 && (
                                <a href={`#${idPrefix}-projects`} onClick={go('projects')} className={`rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition active:scale-95 ${t.btn}`}>View projects</a>
                            )}
                            <a href={`#${idPrefix}-contact`} onClick={go('contact')} className="rounded-full border border-white/40 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95">Contact me</a>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-[13rem] sm:max-w-xs">
                        <div className={`absolute -bottom-3 -right-3 h-full w-full rounded-[2rem] ${t.blob}`} />
                        {picture ? (
                            <img src={picture} alt={name} className="relative aspect-square w-full rounded-[2rem] object-cover shadow-2xl" />
                        ) : (
                            <div className="relative grid aspect-square w-full place-items-center rounded-[2rem] bg-white/15 text-6xl sm:text-7xl font-black text-white shadow-2xl">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {stats.length > 0 && (
                <div className="relative z-[1] mx-auto -mt-9 max-w-6xl px-4 sm:px-6">
                    <div className={`grid gap-px overflow-hidden rounded-2xl ${t.card} ${stats.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {stats.map((s) => (
                            <div key={s.label} className="px-3 sm:px-4 py-3 sm:py-4 text-center">
                                <div className={`text-xl sm:text-2xl md:text-3xl font-black ${t.heading}`}>{s.value}</div>
                                <div className={`text-xs ${t.muted}`}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-6xl space-y-12 sm:space-y-16 px-4 sm:px-6 py-10 sm:py-14">
                {about && (
                    <section id={`${idPrefix}-about`} className="scroll-mt-16">
                        <Title t={t}>About</Title>
                        <div className="mt-5 grid gap-6 lg:grid-cols-3">
                            <p className={`whitespace-pre-line text-base leading-relaxed lg:col-span-2 ${t.muted}`}>{about}</p>
                            <aside className={`space-y-3 rounded-2xl p-5 text-sm ${t.card}`}>
                                {profile.email && <div className="flex items-center gap-2.5"><Mail size={15} /> <span className="truncate">{profile.email}</span></div>}
                                {profile.contactNumber && <div className="flex items-center gap-2.5"><Phone size={15} /> {profile.contactNumber}</div>}
                                {profile.address && <div className="flex items-center gap-2.5"><MapPin size={15} /> {profile.address}</div>}
                                {links.map(([label, url]) => (
                                    <a key={label} href={href(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:underline">
                                        <Globe size={15} /> {label}
                                    </a>
                                ))}
                            </aside>
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                    <section id={`${idPrefix}-skills`} className="scroll-mt-16">
                        <Title t={t}>Skills</Title>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            {skills.map((s) => (
                                <span key={s} className={`rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${t.chip}`}>{s}</span>
                            ))}
                        </div>
                    </section>
                )}

                {projects.length > 0 && (
                    <section id={`${idPrefix}-projects`} className="scroll-mt-16">
                        <Title t={t}>Projects</Title>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.map((proj, i) => (
                                <article key={`${proj?.name}-${i}`} className={`group flex flex-col rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-xl ${t.card}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className={`grid h-10 w-10 place-items-center rounded-xl text-base font-black ${t.chip}`}>
                                            {(proj?.name || 'P').charAt(0).toUpperCase()}
                                        </span>
                                        {proj?.link && (
                                            <a href={href(proj.link)} target="_blank" rel="noopener noreferrer" aria-label="Open project" className={t.heading}>
                                                <ArrowUpRight size={18} />
                                            </a>
                                        )}
                                    </div>
                                    <h3 className="mt-4 text-lg font-bold">{proj?.name || 'Project'}</h3>
                                    <p className={`mt-1.5 text-sm leading-relaxed ${t.muted}`}>{proj?.description}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {(experience.length > 0 || education.length > 0) && (
                    <section id={`${idPrefix}-experience`} className="scroll-mt-16">
                        <Title t={t}>Experience and education</Title>
                        <div className="mt-6 grid gap-10 lg:grid-cols-2">
                            {experience.length > 0 && <Timeline t={t} items={experience} Icon={Briefcase} label="Experience" />}
                            {education.length > 0 && <Timeline t={t} items={education} Icon={GraduationCap} label="Education" />}
                        </div>
                    </section>
                )}

                <section id={`${idPrefix}-contact`} className={`scroll-mt-16 rounded-3xl p-8 text-center sm:p-12 ${t.cta}`}>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Let's work together</h2>
                    <p className="mx-auto mt-3 max-w-md text-sm opacity-80 sm:text-base">Reach out about projects, roles or collaborations.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {profile.email && (
                            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:scale-105 active:scale-95">
                                <Mail size={15} /> {profile.email}
                            </a>
                        )}
                        {links.map(([label, url]) => (
                            <a key={label} href={href(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 active:scale-95">
                                <Globe size={15} /> {label}
                            </a>
                        ))}
                    </div>
                </section>
            </main>

            <footer className={`border-t px-6 py-6 text-center text-xs ${t.line} ${t.muted}`}>
                {name} · Built with Hulma
            </footer>
        </div>
    )
}
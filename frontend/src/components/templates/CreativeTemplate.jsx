import {
    ArrowLeft,
    ArrowUpRight,
    Globe,
    Mail,
    MapPin,
    Phone,
} from 'lucide-react'

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

export default function CreativeTemplate({
    portfolio,
    idPrefix = 'creative',
    stickyNav = true,
    onBack,
    backLabel = 'Back to editor',
}) {
    const p = portfolio || {}
    const sections = p.sections || {}
    const profile = sections.profile || {}
    const name = profile.fullName || p.title || ''
    const about = profile.aboutMe || p.summary || ''
    const tagline = (p.summary && p.summary !== about) ? p.summary : (p.title && p.title !== name) ? p.title : ''
    const skills = asLines(sections.skills)
    const education = asLines(sections.education)
    const experience = asLines(sections.workExperience)
    const projects = Array.isArray(p.projects) ? p.projects : []
    const links = Object.entries(sections.socialLinks || {}).filter(([, url]) => url)
    const picture = profile.profilePicture || p.picture || ''
    const email = profile.email || ''
    const phone = profile.contactNumber || ''
    const address = profile.address || ''

    const nav = [
        { id: 'about', num: '01', label: 'About', show: Boolean(about) },
        { id: 'projects', num: '02', label: 'Work', show: projects.length > 0 },
        { id: 'skills', num: '03', label: 'Stack', show: skills.length > 0 },
        { id: 'experience', num: '04', label: 'Timeline', show: experience.length > 0 || education.length > 0 },
        { id: 'contact', num: '05', label: 'Connect', show: Boolean(email || phone || address || links.length > 0) },
    ].filter((s) => s.show)

    const go = (id) => (e) => {
        e.preventDefault()
        document.getElementById(`${idPrefix}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const userRoles = experience
        .map((entry) => {
            if (typeof entry !== 'string') return ''
            const clean = entry.replace(/\([^)]*\)/g, '').split(/—|-/)[0].trim()
            return clean
        })
        .filter(Boolean)

    const rawMarquee = [...skills, ...userRoles].filter(Boolean)
    let marqueeItems = []
    if (rawMarquee.length > 0) {
        while (marqueeItems.length < 16) {
            marqueeItems = [...marqueeItems, ...rawMarquee]
        }
    }

    const stats = [
        { val: projects.length, label: 'Projects', tag: '01' },
        { val: skills.length, label: 'Skills', tag: '02' },
        { val: experience.length, label: 'Roles', tag: '03' },
        { val: links.length, label: 'Channels', tag: '04' },
    ].filter((item) => item.val > 0)

    return (
        <div className="relative min-h-full bg-[#08070e] text-white selection:bg-[#ec4899] selection:text-white font-sans antialiased overflow-x-clip">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-pink-600/15 blur-[150px]" />
                <div className="absolute bottom-20 left-1/4 h-80 w-80 rounded-full bg-orange-500/15 blur-[130px]" />
            </div>

            <div className={`${stickyNav ? 'sticky top-4' : 'relative mt-4'} z-20 mx-auto w-max max-w-[92vw] px-4 pointer-events-none`}>
                <nav className="pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-full border border-white/15 bg-[#12101e]/90 px-3 sm:px-5 py-2 shadow-2xl backdrop-blur-xl">
                    {name && (
                        <span className="mr-2 hidden text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 md:inline-block">
                            ✦ {name.split(' ')[0]}
                        </span>
                    )}

                    {nav.map((s) => (
                        <a
                            key={s.id}
                            href={`#${idPrefix}-${s.id}`}
                            onClick={go(s.id)}
                            className="rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95"
                        >
                            <span className="text-[10px] text-pink-400 mr-1 sm:inline hidden">{s.num}</span>
                            {s.label}
                        </a>
                    ))}

                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-1 text-xs font-bold text-white shadow-md transition hover:opacity-90 active:scale-95"
                        >
                            <ArrowLeft size={11} />
                            <span className="hidden sm:inline">{backLabel}</span>
                        </button>
                    )}
                </nav>
            </div>

            <header className="relative min-h-[85vh] flex flex-col justify-between pt-10 sm:pt-16 pb-8 px-4 sm:px-8 lg:px-16 overflow-hidden border-b border-white/10">
                <div className="my-auto py-8">
                    <div className="flex flex-col-reverse lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
                        <div className="flex-1 min-w-0">
                            {tagline && (
                                <p className="text-xs sm:text-sm font-black tracking-[0.25em] uppercase text-pink-500 mb-3">
                                    // {tagline}
                                </p>
                            )}

                            {name && (
                                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] xl:text-[9.5rem] font-black uppercase tracking-tighter leading-[0.88] break-words">
                                    <span className="block text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-purple-400 hover:via-pink-500 hover:to-orange-400 transition-all duration-300">
                                        {name}
                                    </span>
                                </h1>
                            )}
                        </div>

                        {(picture || name) && (
                            <div className="relative shrink-0 self-start lg:self-center">
                                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-orange-400 opacity-70 blur-md -rotate-6 transition group-hover:rotate-0" />
                                <div className="relative rotate-3 sm:rotate-6 rounded-3xl border-2 border-white/20 bg-[#12101e] p-1.5 shadow-2xl backdrop-blur-xl">
                                    {picture ? (
                                        <img
                                            src={picture}
                                            alt={name || 'Profile photo'}
                                            className="aspect-square w-28 sm:w-40 md:w-52 lg:w-60 rounded-2xl object-cover"
                                        />
                                    ) : (
                                        <div className="aspect-square w-28 sm:w-40 md:w-52 lg:w-60 rounded-2xl bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-white/10 grid place-items-center text-4xl sm:text-6xl font-black text-white">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        {about && (
                            <p className="max-w-xl text-base sm:text-lg font-medium leading-relaxed text-slate-300 line-clamp-3">
                                {about}
                            </p>
                        )}
                        <div className="flex items-center gap-3">
                            {projects.length > 0 && (
                                <a
                                    href={`#${idPrefix}-projects`}
                                    onClick={go('projects')}
                                    className="group relative inline-flex items-center gap-3 rounded-full bg-white px-7 py-3 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 hover:text-white hover:shadow-xl hover:shadow-pink-500/25 active:scale-95"
                                >
                                    <span>Explore Work</span>
                                    <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </a>
                            )}
                            {Boolean(email || phone || address || links.length > 0) && (
                                <a
                                    href={`#${idPrefix}-contact`}
                                    onClick={go('contact')}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10 active:scale-95"
                                >
                                    Contact
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {marqueeItems.length > 0 && (
                    <div className="relative -mx-4 sm:-mx-8 lg:-mx-16 border-t border-b border-white/10 bg-white/[0.02] py-3 overflow-hidden backdrop-blur-xs">
                        <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
                            {marqueeItems.map((item, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-4 text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400"
                                >
                                    <span className="text-pink-500">✦</span>
                                    <span>{item}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {stats.length > 0 && (
                <section className="border-b border-white/10 px-4 sm:px-8 lg:px-16 py-12 sm:py-16 bg-white/[0.01]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="space-y-1">
                                <span className="text-[10px] font-black tracking-widest text-orange-400 uppercase">
                                    // STAT {stat.tag}
                                </span>
                                <div className="text-6xl sm:text-7xl md:text-8xl font-black text-stroke-outline tracking-tight hover:text-pink-500 transition-colors">
                                    {String(stat.val).padStart(2, '0')}
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <main className="px-4 sm:px-8 lg:px-16 py-16 sm:py-24 space-y-24 sm:space-y-36">
                {about && (
                    <section id={`${idPrefix}-about`} className="scroll-mt-24">
                        <div className="flex items-baseline gap-4 mb-8">
                            <span className="text-3xl sm:text-4xl font-black text-pink-500">01</span>
                            <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">
                                / / ABOUT
                            </span>
                        </div>

                        <div className="grid gap-10 lg:grid-cols-12 items-start">
                            <div className="lg:col-span-7 space-y-6">
                                <p className="text-lg sm:text-xl leading-relaxed text-slate-200 whitespace-pre-line font-medium">
                                    {about}
                                </p>
                            </div>

                            {(email || phone || address || links.length > 0) && (
                                <div className="lg:col-span-5 lg:translate-y-4 rounded-3xl border border-white/10 bg-[#12101e]/90 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-pink-500/30 transition" />
                                    <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-400 mb-6">
                                        CONTACT
                                    </span>

                                    <div className="space-y-4 text-sm text-slate-300">
                                        {email && (
                                            <div className="flex items-center gap-3">
                                                <Mail size={16} className="text-pink-400 shrink-0" />
                                                <a href={`mailto:${email}`} className="truncate hover:text-white hover:underline">
                                                    {email}
                                                </a>
                                            </div>
                                        )}
                                        {phone && (
                                            <div className="flex items-center gap-3">
                                                <Phone size={16} className="text-orange-400 shrink-0" />
                                                <span>{phone}</span>
                                            </div>
                                        )}
                                        {address && (
                                            <div className="flex items-center gap-3">
                                                <MapPin size={16} className="text-purple-400 shrink-0" />
                                                <span>{address}</span>
                                            </div>
                                        )}
                                    </div>

                                    {links.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                                            {links.map(([lbl, url]) => (
                                                <a
                                                    key={lbl}
                                                    href={href(url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-pink-500 hover:text-white"
                                                >
                                                    <span>{lbl}</span>
                                                    <ArrowUpRight size={12} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {projects.length > 0 && (
                    <section id={`${idPrefix}-projects`} className="scroll-mt-24">
                        <div className="flex items-baseline justify-between gap-4 mb-8">
                            <div className="flex items-baseline gap-4">
                                <span className="text-3xl sm:text-4xl font-black text-purple-400">02</span>
                                <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">
                                    / / WORK
                                </span>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                                ({projects.length} {projects.length === 1 ? 'PROJECT' : 'PROJECTS'})
                            </span>
                        </div>

                        <div className="divide-y divide-white/10 border-t border-b border-white/10">
                            {projects.map((proj, idx) => (
                                <div
                                    key={`${proj?.name}-${idx}`}
                                    className="group relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-8 sm:py-12 transition-all duration-300 hover:bg-white/[0.03] hover:px-4 rounded-xl"
                                >
                                    <div className="space-y-2 max-w-2xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-pink-500">
                                                [{String(idx + 1).padStart(2, '0')}]
                                            </span>
                                            {Array.isArray(proj?.tech) && proj.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {proj.tech.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-white/10"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-pink-500 group-hover:to-orange-400 transition-all">
                                            {proj?.name || 'Project'}
                                        </h3>

                                        {proj?.description && (
                                            <p className="text-sm sm:text-base leading-relaxed text-slate-400">
                                                {proj.description}
                                            </p>
                                        )}
                                    </div>

                                    {proj?.link && (
                                        <div className="shrink-0 flex items-center">
                                            <a
                                                href={href(proj.link)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-all duration-300 group-hover:scale-110 group-hover:border-pink-500 group-hover:bg-pink-500 group-hover:text-black"
                                                aria-label={`View ${proj?.name || 'project'}`}
                                            >
                                                <ArrowUpRight size={24} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                    <section id={`${idPrefix}-skills`} className="scroll-mt-24">
                        <div className="flex items-baseline gap-4 mb-8">
                            <span className="text-3xl sm:text-4xl font-black text-orange-400">03</span>
                            <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">
                                / / SKILLS & STACK
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {skills.map((skill, idx) => {
                                const rotations = ['rotate-0', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-2']
                                const rot = rotations[idx % rotations.length]
                                return (
                                    <div
                                        key={skill}
                                        className={`group relative inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-slate-200 transition-all duration-200 hover:scale-105 hover:border-pink-500 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 hover:text-white hover:shadow-lg hover:shadow-pink-500/20 ${rot}`}
                                    >
                                        <span className="text-pink-400 group-hover:text-white">✦</span>
                                        <span>{skill}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {(experience.length > 0 || education.length > 0) && (
                    <section id={`${idPrefix}-experience`} className="scroll-mt-24">
                        <div className="flex items-baseline gap-4 mb-8">
                            <span className="text-3xl sm:text-4xl font-black text-emerald-400">04</span>
                            <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">
                                / / TIMELINE
                            </span>
                        </div>

                        <div className="grid gap-12 lg:grid-cols-2">
                            {experience.length > 0 && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black tracking-[0.2em] uppercase text-pink-400">
                                        // EXPERIENCE
                                    </h3>
                                    <div className="space-y-4">
                                        {experience.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20"
                                            >
                                                <span className="text-xs font-mono text-slate-500">
                                                    RECORD #{String(idx + 1).padStart(2, '0')}
                                                </span>
                                                <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-200">
                                                    {item}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {education.length > 0 && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black tracking-[0.2em] uppercase text-purple-400">
                                        // EDUCATION
                                    </h3>
                                    <div className="space-y-4">
                                        {education.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20"
                                            >
                                                <span className="text-xs font-mono text-slate-500">
                                                    RECORD #{String(idx + 1).padStart(2, '0')}
                                                </span>
                                                <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-slate-200">
                                                    {item}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {(email || phone || address || links.length > 0) && (
                    <section id={`${idPrefix}-contact`} className="scroll-mt-24">
                        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-[#1b1435] via-[#100c24] to-[#090812] p-8 sm:p-16 lg:p-20 shadow-2xl">
                            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-pink-500/20 blur-[100px]" />
                            <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-orange-500/20 blur-[100px]" />

                            <div className="relative z-10 max-w-3xl space-y-6">
                                <div className="flex items-baseline gap-4">
                                    <span className="text-3xl sm:text-4xl font-black text-pink-500">05</span>
                                    <span className="text-xs font-black tracking-[0.25em] uppercase text-slate-400">
                                        / / CONNECT
                                    </span>
                                </div>

                                <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
                                    LET'S CONNECT.
                                </h2>

                                <div className="pt-4 flex flex-wrap gap-4 items-center">
                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 px-8 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-pink-500/25 transition hover:scale-105 active:scale-95"
                                        >
                                            <Mail size={18} />
                                            <span>Send Message</span>
                                            <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                        </a>
                                    )}

                                    {links.map(([lbl, url]) => (
                                        <a
                                            key={lbl}
                                            href={href(url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/15"
                                        >
                                            <Globe size={14} />
                                            <span>{lbl}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer className="border-t border-white/10 px-4 sm:px-8 lg:px-16 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
                <p>{name ? `✦ ${name}` : '✦ PORTFOLIO'}</p>
                <p className="uppercase tracking-widest text-slate-600">ALL RIGHTS RESERVED</p>
            </footer>
        </div>
    )
}

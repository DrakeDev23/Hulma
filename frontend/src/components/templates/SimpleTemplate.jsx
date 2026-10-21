import { ArrowLeft, ArrowUpRight, Globe, Mail, MapPin, Phone } from 'lucide-react'

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

function parseTimelineEntry(entry) {
    if (typeof entry !== 'string') return { title: String(entry), subtitle: '', date: '' }
    
    const dateMatch = entry.match(/\(([^)]+)\)/)
    const date = dateMatch ? dateMatch[1] : ''
    const cleanEntry = entry.replace(/\([^)]+\)/, '').trim()
    
    const parts = cleanEntry.split(/—|-/).map((p) => p.trim())
    const title = parts[0] || entry
    const subtitle = parts.slice(1).join(' — ')
    
    return { title, subtitle, date }
}

export default function SimpleTemplate({
    portfolio,
    idPrefix = 'simple',
    stickyNav = false,
    onBack,
    backLabel = 'Back to editor',
}) {
    const p = portfolio || {}
    const sections = p.sections || {}
    const profile = sections.profile || {}
    const name = profile.fullName || p.title || ''
    const about = profile.aboutMe || p.summary || ''
    const tagline = (p.summary && p.summary !== about) ? p.summary : (p.title && p.title !== name) ? p.title : ''
    const picture = profile.profilePicture || p.picture || ''
    const skills = asLines(sections.skills)
    const education = asLines(sections.education)
    const experience = asLines(sections.workExperience)
    const projects = Array.isArray(p.projects) ? p.projects : []
    const links = Object.entries(sections.socialLinks || {}).filter(([, url]) => url)
    const email = profile.email || ''
    const phone = profile.contactNumber || ''
    const address = profile.address || ''

    const nav = [
        { id: 'about', label: 'About', show: Boolean(about) },
        { id: 'experience', label: 'Experience', show: experience.length > 0 || education.length > 0 },
        { id: 'projects', label: 'Selected Work', show: projects.length > 0 },
        { id: 'skills', label: 'Skills', show: skills.length > 0 },
        { id: 'contact', label: 'Contact', show: Boolean(email || phone || links.length > 0) },
    ].filter((s) => s.show)

    const go = (id) => (e) => {
        e.preventDefault()
        document.getElementById(`${idPrefix}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="min-h-full bg-[#fdfcf9] text-[#1c1917] font-serif antialiased selection:bg-[#964222]/15 selection:text-[#964222]">
            <header className={`${stickyNav ? 'sticky top-0 bg-[#fdfcf9]/95 backdrop-blur-sm' : ''} z-20 border-b border-[#e7e5e0] transition-colors`}>
                <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <a
                        href={`#${idPrefix}-intro`}
                        onClick={go('intro')}
                        className="font-serif text-xs sm:text-sm font-semibold tracking-normal text-[#1c1917] transition hover:text-[#964222] truncate max-w-[130px] sm:max-w-none"
                    >
                        {name}
                    </a>

                    <nav className="flex items-center gap-2.5 sm:gap-4 text-xs font-sans tracking-wide text-stone-500 overflow-x-auto no-scrollbar">
                        {nav.map((s) => (
                            <a
                                key={s.id}
                                href={`#${idPrefix}-${s.id}`}
                                onClick={go(s.id)}
                                className="transition hover:text-stone-900 hover:underline hover:decoration-stone-400 hover:underline-offset-4"
                            >
                                {s.label}
                            </a>
                        ))}

                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="ml-2 inline-flex items-center gap-1 font-sans text-xs text-[#964222] transition hover:underline hover:underline-offset-4"
                            >
                                <ArrowLeft size={12} />
                                <span>{backLabel}</span>
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            <main id={`${idPrefix}-intro`} className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
                <section id={`${idPrefix}-about`} className="space-y-4 scroll-mt-12">
                    {picture && (
                        <div className="pb-2">
                            <img
                                src={picture}
                                alt={name || 'Profile photo'}
                                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border border-[#e7e5e0]"
                            />
                        </div>
                    )}
                    {name && (
                        <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1c1917] sm:text-4xl md:text-5xl">
                            {name}
                        </h1>
                    )}
                    {tagline && (
                        <p className="font-serif text-lg italic text-stone-600 sm:text-xl">
                            {tagline}
                        </p>
                    )}
                    {about && (
                        <div className="pt-2">
                            <p className="font-sans text-sm leading-relaxed text-stone-700 sm:text-base">
                                {about}
                            </p>
                        </div>
                    )}

                    {(projects.length > 0 || skills.length > 0 || experience.length > 0) && (
                        <p className="pt-4 font-sans text-xs tracking-wider text-stone-400 uppercase">
                            {[
                                projects.length > 0 ? `${projects.length} ${projects.length === 1 ? 'Project' : 'Projects'}` : null,
                                skills.length > 0 ? `${skills.length} Skills` : null,
                                experience.length > 0 ? `${experience.length} Roles` : null,
                            ]
                                .filter(Boolean)
                                .join('  ·  ')}
                        </p>
                    )}
                </section>

                {(experience.length > 0 || education.length > 0) && (
                    <>
                        <hr className="my-12 border-t border-[#e7e5e0] sm:my-16" />
                        <section id={`${idPrefix}-experience`} className="scroll-mt-12 space-y-10">
                            {experience.length > 0 && (
                                <div className="space-y-6">
                                    <h2 className="font-serif text-xs font-semibold tracking-widest text-stone-400 uppercase">
                                        Experience
                                    </h2>
                                    <div className="divide-y divide-[#f0eee9]">
                                        {experience.map((entry, idx) => {
                                            const item = parseTimelineEntry(entry)
                                            return (
                                                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                                                    <div className="flex flex-col justify-between sm:flex-row sm:items-baseline">
                                                        <span className="font-serif text-base font-medium text-stone-900">
                                                            {item.title}
                                                        </span>
                                                        {item.date && (
                                                            <span className="font-sans text-xs text-stone-500 sm:text-right">
                                                                {item.date}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && (
                                                        <p className="mt-1 font-sans text-xs leading-relaxed text-stone-600 sm:text-sm">
                                                            {item.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {education.length > 0 && (
                                <div className="space-y-6">
                                    <h2 className="font-serif text-xs font-semibold tracking-widest text-stone-400 uppercase">
                                        Education
                                    </h2>
                                    <div className="divide-y divide-[#f0eee9]">
                                        {education.map((entry, idx) => {
                                            const item = parseTimelineEntry(entry)
                                            return (
                                                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                                                    <div className="flex flex-col justify-between sm:flex-row sm:items-baseline">
                                                        <span className="font-serif text-base font-medium text-stone-900">
                                                            {item.title}
                                                        </span>
                                                        {item.date && (
                                                            <span className="font-sans text-xs text-stone-500 sm:text-right">
                                                                {item.date}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.subtitle && (
                                                        <p className="mt-1 font-sans text-xs leading-relaxed text-stone-600 sm:text-sm">
                                                            {item.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {projects.length > 0 && (
                    <>
                        <hr className="my-12 border-t border-[#e7e5e0] sm:my-16" />
                        <section id={`${idPrefix}-projects`} className="scroll-mt-12 space-y-6">
                            <h2 className="font-serif text-xs font-semibold tracking-widest text-stone-400 uppercase">
                                Selected Work
                            </h2>
                            <div className="divide-y divide-[#f0eee9]">
                                {projects.map((proj, idx) => (
                                    <article key={`${proj?.name}-${idx}`} className="py-5 first:pt-0 last:pb-0">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <h3 className="font-serif text-lg font-medium text-stone-900">
                                                {proj?.link ? (
                                                    <a
                                                        href={href(proj.link)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group inline-flex items-center gap-1.5 transition hover:text-[#964222] hover:underline hover:underline-offset-4"
                                                    >
                                                        <span>{proj?.name || 'Project'}</span>
                                                        <ArrowUpRight
                                                            size={14}
                                                            className="text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#964222]"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span>{proj?.name || 'Project'}</span>
                                                )}
                                            </h3>
                                            {Array.isArray(proj?.tech) && proj.tech.length > 0 && (
                                                <span className="font-sans text-xs text-stone-500">
                                                    {proj.tech.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                        {proj?.description && (
                                            <p className="mt-2 font-sans text-sm leading-relaxed text-stone-600">
                                                {proj.description}
                                            </p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {skills.length > 0 && (
                    <>
                        <hr className="my-12 border-t border-[#e7e5e0] sm:my-16" />
                        <section id={`${idPrefix}-skills`} className="scroll-mt-12 space-y-4">
                            <h2 className="font-serif text-xs font-semibold tracking-widest text-stone-400 uppercase">
                                Skills & Capabilities
                            </h2>
                            <p className="font-sans text-sm leading-relaxed text-stone-700 sm:text-base">
                                {skills.join('  ·  ')}
                            </p>
                        </section>
                    </>
                )}

                {(email || phone || address || links.length > 0) && (
                    <>
                        <hr className="my-12 border-t border-[#e7e5e0] sm:my-16" />
                        <section id={`${idPrefix}-contact`} className="scroll-mt-12 space-y-6">
                            <h2 className="font-serif text-xs font-semibold tracking-widest text-stone-400 uppercase">
                                Contact & Directory
                            </h2>
                            <div className="space-y-3 font-sans text-sm text-stone-700">
                                {email && (
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-stone-400" />
                                        <a
                                            href={`mailto:${email}`}
                                            className="transition hover:text-[#964222] hover:underline hover:underline-offset-4"
                                        >
                                            {email}
                                        </a>
                                    </div>
                                )}
                                {phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-stone-400" />
                                        <span>{phone}</span>
                                    </div>
                                )}
                                {address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-stone-400" />
                                        <span>{address}</span>
                                    </div>
                                )}
                            </div>

                            {links.length > 0 && (
                                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 font-sans text-xs tracking-wide uppercase text-stone-500">
                                    {links.map(([label, url]) => (
                                        <a
                                            key={label}
                                            href={href(url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 transition hover:text-stone-900 hover:underline hover:underline-offset-4"
                                        >
                                            <Globe size={12} className="text-stone-400" />
                                            <span>{label}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            <footer className="border-t border-[#e7e5e0] py-8 text-center font-sans text-xs text-stone-400">
                <div className="mx-auto max-w-[720px] px-6">
                    <p>{name ? `${name} — All rights reserved.` : 'All rights reserved.'}</p>
                </div>
            </footer>
        </div>
    )
}

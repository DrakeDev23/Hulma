import { useState } from 'react'
import {
    ArrowLeft,
    ArrowUpRight,
    Briefcase,
    CheckCircle2,
    Code2,
    Compass,
    ExternalLink,
    GraduationCap,
    Layers,
    Mail,
    MapPin,
    Phone,
    Send,
    Sparkles,
} from 'lucide-react'

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

export default function ModernTemplate({
    portfolio,
    idPrefix = 'modern',
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

    const [activeSection, setActiveSection] = useState('about')

    const nav = [
        { id: 'about', label: 'Overview', show: Boolean(about) },
        { id: 'projects', label: 'Projects', show: projects.length > 0 },
        { id: 'skills', label: 'Skills', show: skills.length > 0 },
        { id: 'experience', label: 'Timeline', show: experience.length > 0 || education.length > 0 },
        { id: 'contact', label: 'Contact', show: true },
    ].filter((s) => s.show)

    const go = (id) => (e) => {
        e.preventDefault()
        setActiveSection(id)
        document.getElementById(`${idPrefix}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const stats = [
        {
            label: 'Projects Completed',
            value: projects.length,
            icon: Layers,
            desc: 'Featured case studies',
        },
        {
            label: 'Technical Skills',
            value: skills.length,
            icon: Code2,
            desc: 'Tools & frameworks',
        },
        {
            label: 'Career Milestones',
            value: experience.length,
            icon: Briefcase,
            desc: 'Positions & impact',
        },
        {
            label: 'Network Channels',
            value: links.length,
            icon: Compass,
            desc: 'Online presence',
        },
    ].filter((s) => s.value > 0)

    const skillCategories = [
        { title: 'Core Stack', items: skills.slice(0, 4), level: 95 },
        { title: 'Technologies', items: skills.slice(4, 8), level: 90 },
        { title: 'Specializations', items: skills.slice(8), level: 85 },
    ].filter((cat) => cat.items.length > 0)

    return (
        <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-700">
            <header
                className={`${
                    stickyNav ? 'sticky top-0' : ''
                } z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all`}
            >
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/20">
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <span className="block truncate text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                                {name}
                            </span>
                            <span className="hidden xs:flex text-[10px] sm:text-[11px] font-medium text-emerald-600 items-center gap-1 truncate">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                Available for opportunities
                            </span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[55%] sm:max-w-none">
                        {nav.map((s) => (
                            <a
                                key={s.id}
                                href={`#${idPrefix}-${s.id}`}
                                onClick={go(s.id)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium sm:text-sm transition ${
                                    activeSection === s.id
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                {s.label}
                            </a>
                        ))}

                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                            >
                                <ArrowLeft size={13} />
                                <span>{backLabel}</span>
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            <div className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-transparent pb-12 pt-8 sm:pb-16 sm:pt-14">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))]" />
                
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="lg:col-span-7 space-y-5">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-medium text-blue-700 shadow-sm">
                                <Sparkles size={13} className="text-blue-600" />
                                <span>Portfolio & Professional Profile</span>
                            </div>

                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                                {name ? (
                                    <>Hi, I'm <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{name}</span></>
                                ) : (
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Portfolio</span>
                                )}
                            </h1>

                            {tagline && (
                                <p className="max-w-xl text-base font-normal leading-relaxed text-slate-600 sm:text-lg">
                                    {tagline}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <a
                                    href={`#${idPrefix}-projects`}
                                    onClick={go('projects')}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
                                >
                                    <span>Explore Projects</span>
                                    <ArrowUpRight size={16} />
                                </a>

                                <a
                                    href={`#${idPrefix}-contact`}
                                    onClick={go('contact')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                                >
                                    <span>Get in Touch</span>
                                </a>
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex justify-center">
                            <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-200/50 backdrop-blur transition hover:shadow-2xl">
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-100 to-blue-50">
                                    {picture ? (
                                        <img
                                            src={picture}
                                            alt={name}
                                            className="aspect-square w-full object-cover rounded-2xl"
                                        />
                                    ) : (
                                        <div className="grid aspect-square w-full place-items-center bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 text-7xl font-black text-white shadow-inner">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 p-3 shadow-md backdrop-blur-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">{name}</p>
                                                <p className="text-[11px] text-slate-500 truncate max-w-[170px]">{tagline}</p>
                                            </div>
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                <CheckCircle2 size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {stats.length > 0 && (
                <div className="relative z-10 mx-auto -mt-4 max-w-6xl px-4 sm:px-6">
                    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)}`}>
                        {stats.map((s, idx) => {
                            const IconComponent = s.icon
                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <IconComponent size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-2xl font-black tracking-tight text-slate-900">
                                            {s.value}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-700 truncate">
                                            {s.label}
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate">
                                            {s.desc}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 space-y-16">
                {about && (
                    <section id={`${idPrefix}-about`} className="scroll-mt-20">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                    About & Overview
                                </h2>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Background, core strengths, and approach
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
                                <h3 className="text-base font-semibold text-slate-900 mb-3">
                                    Professional Summary
                                </h3>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
                                    {about}
                                </p>
                            </div>

                            <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                                <h3 className="text-base font-semibold text-slate-900">
                                    Contact Quick Facts
                                </h3>
                                <div className="space-y-3 text-sm text-slate-600">
                                    {email && (
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                                <Mail size={15} />
                                            </div>
                                            <span className="truncate text-xs font-medium text-slate-800">{email}</span>
                                        </div>
                                    )}
                                    {phone && (
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                                <Phone size={15} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-800">{phone}</span>
                                        </div>
                                    )}
                                    {address && (
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                                <MapPin size={15} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-800">{address}</span>
                                        </div>
                                    )}
                                </div>

                                {links.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                                        {links.map(([lbl, url]) => (
                                            <a
                                                key={lbl}
                                                href={href(url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                                            >
                                                <span>{lbl}</span>
                                                <ExternalLink size={11} />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {projects.length > 0 && (
                    <section id={`${idPrefix}-projects`} className="scroll-mt-20">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                    Featured Projects
                                </h2>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Production systems, applications, and tools
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.map((proj, idx) => (
                                <article
                                    key={`${proj?.name}-${idx}`}
                                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                                >
                                    <div className="relative h-44 w-full overflow-hidden bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-blue-600/20 p-5 flex flex-col justify-between border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-base font-black text-blue-600 shadow-sm">
                                                {(proj?.name || 'P').charAt(0).toUpperCase()}
                                            </span>
                                            {proj?.link && (
                                                <a
                                                    href={href(proj.link)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition group-hover:bg-blue-600 group-hover:text-white"
                                                    aria-label="Open project link"
                                                >
                                                    <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                        </div>

                                        {Array.isArray(proj?.tech) && proj.tech.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {proj.tech.map((t) => (
                                                    <span
                                                        key={t}
                                                        className="rounded-md bg-white/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-xs"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                                                {proj?.name || 'Project'}
                                            </h3>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">
                                                {proj?.description}
                                            </p>
                                        </div>

                                        {proj?.link && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                                                <span>View details</span>
                                                <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {skills.length > 0 && (
                    <section id={`${idPrefix}-skills`} className="scroll-mt-20">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                    Technical Expertise
                                </h2>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Categorized proficiencies and competencies
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {skillCategories.map((cat, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {cat.title}
                                        </h3>
                                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {cat.level}%
                                        </span>
                                    </div>

                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                                            style={{ width: `${cat.level}%` }}
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {cat.items.map((skill) => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {(experience.length > 0 || education.length > 0) && (
                    <section id={`${idPrefix}-experience`} className="scroll-mt-20">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                    Career & Education
                                </h2>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Chronological journey and credentials
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-2">
                            {experience.length > 0 && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-900">
                                        <Briefcase size={16} className="text-blue-600" />
                                        <span>Work Experience</span>
                                    </div>

                                    <div className="relative pl-6 border-l-2 border-blue-100 space-y-6 ml-2">
                                        {experience.map((item, idx) => (
                                            <div key={idx} className="relative group">
                                                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                                                <div className="text-xs font-semibold text-slate-900 leading-snug">
                                                    {item}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {education.length > 0 && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-900">
                                        <GraduationCap size={16} className="text-indigo-600" />
                                        <span>Education & Credentials</span>
                                    </div>

                                    <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6 ml-2">
                                        {education.map((item, idx) => (
                                            <div key={idx} className="relative group">
                                                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                                                <div className="text-xs font-semibold text-slate-900 leading-snug">
                                                    {item}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <section id={`${idPrefix}-contact`} className="scroll-mt-20">
                    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-xl sm:p-12">
                        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                            <div className="lg:col-span-7 space-y-4">
                                <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                                    Let's collaborate
                                </span>
                                <h2 className="text-2xl font-bold tracking-tight sm:text-4xl text-white">
                                    Interested in working together?
                                </h2>
                                <p className="text-sm leading-relaxed text-slate-300 sm:text-base max-w-lg">
                                    Open to consulting, contract work, or full-time opportunities. Send me an email and let's discuss your next project.
                                </p>

                                <div className="pt-2 space-y-2 text-sm text-slate-300">
                                    {email && (
                                        <div className="flex items-center gap-2">
                                            <Mail size={15} className="text-blue-400" />
                                            <span>{email}</span>
                                        </div>
                                    )}
                                    {phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={15} className="text-blue-400" />
                                            <span>{phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-5 flex flex-col gap-3 sm:items-start lg:items-end">
                                {email && (
                                    <a
                                        href={`mailto:${email}`}
                                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500 active:scale-95"
                                    >
                                        <Send size={15} />
                                        <span>Send a Message</span>
                                    </a>
                                )}

                                {links.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {links.map(([lbl, url]) => (
                                            <a
                                                key={lbl}
                                                href={href(url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
                                            >
                                                <ExternalLink size={12} />
                                                <span>{lbl}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
                    <p className="text-slate-400">Designed with Hulma Modern</p>
                </div>
            </footer>
        </div>
    )
}

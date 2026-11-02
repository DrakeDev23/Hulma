import { useState } from 'react'
import {
    ArrowLeft,
    ArrowUpRight,
    ArrowUp,
    Briefcase,
    Calendar,
    Check,
    Code2,
    Copy,
    ExternalLink,
    GraduationCap,
    Mail,
    MapPin,
    Menu,
    Phone,
    Sparkles,
    X,
} from 'lucide-react'

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

// Parse timeline entries (e.g., "Role at Company (Year) — Description" or "Degree — School (Year)")
function parseTimelineEntry(item, fallbackType = 'work') {
    if (!item) return null
    if (typeof item === 'object') {
        return {
            title: item.title || item.role || item.degree || item.position || 'Position',
            organization: item.organization || item.company || item.school || item.institution || '',
            period: item.period || item.date || item.year || '',
            description: item.description || item.desc || item.details || '',
        }
    }

    const str = String(item).trim()
    let mainPart = str
    let description = ''

    // Check for delimiter like ' — ' or ' - ' separating main entry and description
    if (str.includes(' — ')) {
        const parts = str.split(' — ')
        mainPart = parts[0].trim()
        description = parts.slice(1).join(' — ').trim()
    } else if (str.includes(' : ')) {
        const parts = str.split(' : ')
        mainPart = parts[0].trim()
        description = parts.slice(1).join(' : ').trim()
    }

    // Extract period from parentheses e.g. (2020 - Present) or (2022)
    let period = ''
    const parenMatch = mainPart.match(/\(([^)]+)\)$/)
    if (parenMatch) {
        period = parenMatch[1].trim()
        mainPart = mainPart.replace(/\(([^)]+)\)$/, '').trim()
    }

    // Extract title & organization e.g. "Role at Company" or "Role @ Company" or "Degree — School"
    let title = mainPart
    let organization = ''

    if (mainPart.includes(' at ')) {
        const parts = mainPart.split(' at ')
        title = parts[0].trim()
        organization = parts.slice(1).join(' at ').trim()
    } else if (mainPart.includes(' @ ')) {
        const parts = mainPart.split(' @ ')
        title = parts[0].trim()
        organization = parts.slice(1).join(' @ ').trim()
    } else if (mainPart.includes(' - ')) {
        const parts = mainPart.split(' - ')
        title = parts[0].trim()
        organization = parts.slice(1).join(' - ').trim()
    }

    if (!title && !organization) {
        title = fallbackType === 'work' ? 'Work Experience' : 'Education'
        description = str
    }

    return {
        title,
        organization,
        period,
        description,
    }
}

// Normalize projects
function normalizeProject(proj, idx) {
    if (!proj) return null
    if (typeof proj === 'string') {
        const [name, ...rest] = proj.split(':')
        return {
            id: `proj-${idx}`,
            name: name?.trim() || `Project ${idx + 1}`,
            description: rest.join(':').trim(),
            link: '',
            tech: [],
            image: '',
        }
    }
    const name = proj.name || proj.title || `Project ${idx + 1}`
    const description = proj.description || proj.summary || proj.desc || ''
    const link = proj.link || proj.url || proj.github || ''
    const image = proj.image || proj.picture || proj.imageUrl || proj.cover || ''
    let tech = proj.tech || proj.technologies || proj.tags || []
    if (typeof tech === 'string') {
        tech = tech.split(',').map((t) => t.trim()).filter(Boolean)
    }
    return {
        id: proj.id || `proj-${idx}`,
        name,
        description,
        link,
        tech: Array.isArray(tech) ? tech : [],
        image,
    }
}

// Group skills into clean categories if multiple exist
function categorizeSkills(skills) {
    if (!skills || skills.length === 0) return []
    if (skills.length <= 4) {
        return [{ title: 'Core Competencies', items: skills }]
    }
    const count = skills.length
    const third = Math.ceil(count / 3)
    return [
        { title: 'Core Technologies', items: skills.slice(0, third) },
        { title: 'Frameworks & Libraries', items: skills.slice(third, third * 2) },
        { title: 'Tools & Ecosystem', items: skills.slice(third * 2) },
    ].filter((cat) => cat.items.length > 0)
}

export default function MinimalModernTemplate({
    portfolio,
    idPrefix = 'minimal',
    stickyNav = true,
    onBack,
    backLabel = 'Back to editor',
}) {
    const p = portfolio || {}
    const sections = p.sections || {}
    const profile = sections.profile || {}
    const name = profile.fullName || p.title || 'Portfolio'
    const about = profile.aboutMe || p.summary || ''
    const tagline = (p.summary && p.summary !== about) ? p.summary : (p.title && p.title !== name) ? p.title : ''
    const skills = asLines(sections.skills)
    const rawEducation = asLines(sections.education)
    const rawExperience = asLines(sections.workExperience)
    const rawProjects = Array.isArray(p.projects) ? p.projects : []
    const links = Object.entries(sections.socialLinks || {}).filter(([, url]) => url)
    const picture = profile.profilePicture || p.picture || ''
    const email = profile.email || ''
    const phone = profile.contactNumber || ''
    const address = profile.address || ''

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState('hero')
    const [copiedEmail, setCopiedEmail] = useState(false)

    const projects = rawProjects.map(normalizeProject).filter(Boolean)
    const education = rawEducation.map((item) => parseTimelineEntry(item, 'education')).filter(Boolean)
    const experience = rawExperience.map((item) => parseTimelineEntry(item, 'work')).filter(Boolean)
    const skillGroups = categorizeSkills(skills)

    const nav = [
        { id: 'hero', label: 'Home', show: true },
        { id: 'about', label: 'About', show: Boolean(about || address || phone) },
        { id: 'skills', label: 'Skills', show: skills.length > 0 },
        { id: 'projects', label: 'Projects', show: projects.length > 0 },
        { id: 'experience', label: 'Experience', show: experience.length > 0 || education.length > 0 },
        { id: 'contact', label: 'Contact', show: true },
    ].filter((item) => item.show)

    const go = (id) => (e) => {
        if (e && e.preventDefault) e.preventDefault()
        setActiveSection(id)
        setMobileMenuOpen(false)
        const el = document.getElementById(`${idPrefix}-${id}`)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCopyEmail = () => {
        if (!email) return
        try {
            navigator.clipboard.writeText(email)
            setCopiedEmail(true)
            setTimeout(() => setCopiedEmail(false), 2000)
        } catch {
            // fallback
        }
    }

    const initials = name
        ? name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0].toUpperCase())
              .join('')
        : 'P'

    return (
        <div
            className="min-h-full bg-[#FAF9F6] text-[#1C1917] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C]"
            style={{
                '--color-primary-orange': '#F97316',
                '--color-deep-orange': '#EA580C',
                '--color-bg-ivory': '#FAF9F6',
                '--color-surface-white': '#FFFFFF',
                '--color-text-primary': '#1C1917',
                '--color-text-secondary': '#78716C',
                '--color-border': '#E7E5E4',
            }}
        >
            {/* Minimal Header */}
            <header
                className={`${
                    stickyNav ? 'sticky top-0' : 'relative'
                } z-40 border-b border-[#E7E5E4] bg-[#FAF9F6]/90 backdrop-blur-md transition-colors`}
            >
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                    {/* Brand / Name */}
                    <a
                        href={`#${idPrefix}-hero`}
                        onClick={go('hero')}
                        className="group flex items-center gap-2.5 transition active:scale-95"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C1917] text-xs font-bold text-white shadow-xs group-hover:bg-[#F97316] transition-colors">
                            {initials}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold tracking-tight text-[#1C1917] group-hover:text-[#F97316] transition-colors">
                                {name}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                        </div>
                    </a>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {nav.map((item) => (
                            <a
                                key={item.id}
                                href={`#${idPrefix}-${item.id}`}
                                onClick={go(item.id)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    activeSection === item.id
                                        ? 'bg-white text-[#EA580C] shadow-2xs font-semibold'
                                        : 'text-[#78716C] hover:bg-white/60 hover:text-[#1C1917]'
                                }`}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    {/* Actions & Mobile Toggle */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#1C1917] shadow-2xs transition hover:bg-[#FAF9F6] hover:text-[#EA580C] active:scale-95"
                            >
                                <ArrowLeft size={13} />
                                <span className="hidden sm:inline">{backLabel}</span>
                            </button>
                        )}

                        <a
                            href={`#${idPrefix}-contact`}
                            onClick={go('contact')}
                            className="inline-flex items-center justify-center rounded-xl bg-[#F97316] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#EA580C] active:scale-95"
                        >
                            Get in touch
                        </a>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            className="inline-flex md:hidden items-center justify-center rounded-lg border border-[#E7E5E4] bg-white p-1.5 text-[#1C1917] transition hover:bg-[#FAF9F6]"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-[#E7E5E4] bg-[#FAF9F6] px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                        <nav className="flex flex-col gap-1">
                            {nav.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${idPrefix}-${item.id}`}
                                    onClick={go(item.id)}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                                        activeSection === item.id
                                            ? 'bg-white text-[#EA580C] font-semibold shadow-2xs'
                                            : 'text-[#78716C] hover:bg-white/60 hover:text-[#1C1917]'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                )}
            </header>

            <main>
                {/* 1. Hero Section */}
                <section
                    id={`${idPrefix}-hero`}
                    className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                            {/* Hero Text */}
                            <div className="space-y-6 lg:col-span-7">
                                {/* Availability Pill */}
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3 py-1 text-xs font-medium text-[#78716C] shadow-2xs">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F97316]" />
                                    </span>
                                    <span>Available for new opportunities</span>
                                </div>

                                {/* Prominent Title / Name */}
                                <div className="space-y-3">
                                    <h1 className="text-4xl font-extrabold tracking-tight text-[#1C1917] sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.08]">
                                        Hi, I&apos;m <span className="text-[#1C1917]">{name}</span>
                                        <span className="text-[#F97316]">.</span>
                                    </h1>
                                    {tagline && (
                                        <p className="text-lg font-medium text-[#EA580C] sm:text-xl lg:text-2xl">
                                            {tagline}
                                        </p>
                                    )}
                                </div>

                                {/* Short introduction */}
                                <p className="max-w-xl text-base leading-relaxed text-[#78716C] sm:text-lg">
                                    {about ||
                                        'Passionate developer and creator dedicated to building clean, purposeful digital products with modern aesthetics and robust code.'}
                                </p>

                                {/* CTA Buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <a
                                        href={`#${idPrefix}-projects`}
                                        onClick={go('projects')}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#EA580C] hover:gap-2.5 active:scale-95"
                                    >
                                        <span>View Projects</span>
                                        <ArrowUpRight size={16} />
                                    </a>

                                    <a
                                        href={`#${idPrefix}-contact`}
                                        onClick={go('contact')}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-5 py-3 text-sm font-semibold text-[#1C1917] shadow-2xs transition hover:bg-[#FAF9F6] hover:border-[#D6D3D1] active:scale-95"
                                    >
                                        <span>Contact Me</span>
                                    </a>
                                </div>

                                {/* Quick Highlights */}
                                {(projects.length > 0 || skills.length > 0 || experience.length > 0) && (
                                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E7E5E4] max-w-lg">
                                        {projects.length > 0 && (
                                            <div>
                                                <div className="text-2xl font-bold text-[#1C1917]">
                                                    {projects.length}
                                                    <span className="text-[#F97316]">+</span>
                                                </div>
                                                <div className="text-xs font-medium text-[#78716C]">
                                                    Projects Crafted
                                                </div>
                                            </div>
                                        )}
                                        {skills.length > 0 && (
                                            <div>
                                                <div className="text-2xl font-bold text-[#1C1917]">
                                                    {skills.length}
                                                </div>
                                                <div className="text-xs font-medium text-[#78716C]">
                                                    Core Skills
                                                </div>
                                            </div>
                                        )}
                                        {experience.length > 0 && (
                                            <div>
                                                <div className="text-2xl font-bold text-[#1C1917]">
                                                    {experience.length}
                                                    <span className="text-[#F97316]">+</span>
                                                </div>
                                                <div className="text-xs font-medium text-[#78716C]">
                                                    Positions
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Hero Profile Image / Visual */}
                            <div className="flex justify-center lg:col-span-5 lg:justify-end">
                                <div className="relative w-full max-w-sm sm:max-w-md">
                                    {/* Subtle decorative background accent */}
                                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#F97316]/10 to-transparent blur-md" />

                                    <div className="relative overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white p-3 shadow-sm">
                                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#FAF9F6]">
                                            {picture ? (
                                                <img
                                                    src={picture}
                                                    alt={name}
                                                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F6] to-[#FED7AA]/30 p-6 text-center">
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1C1917] text-2xl font-bold text-white shadow-sm">
                                                        {initials}
                                                    </div>
                                                    <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                                                        {name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Minimal card caption */}
                                        <div className="mt-3 flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                                                <span className="text-xs font-semibold text-[#1C1917]">
                                                    {name}
                                                </span>
                                            </div>
                                            {address && (
                                                <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                                                    <MapPin size={11} className="text-[#EA580C]" />
                                                    {address}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. About Section */}
                <section
                    id={`${idPrefix}-about`}
                    className="border-t border-[#E7E5E4] bg-white py-16 sm:py-24"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                            {/* Left Column: Heading & Snapshot */}
                            <div className="space-y-4 lg:col-span-5">
                                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                                    About
                                </span>
                                <h2 className="text-2xl font-bold tracking-tight text-[#1C1917] sm:text-3xl lg:text-4xl">
                                    Driven by thoughtful craft, clean design & robust code.
                                </h2>

                                <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF9F6] p-5 space-y-3.5 mt-6">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                                        Quick Facts
                                    </h3>
                                    {address && (
                                        <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C] shrink-0">
                                                <MapPin size={13} />
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-[#78716C]">Location</span>
                                                <span className="font-medium">{address}</span>
                                            </div>
                                        </div>
                                    )}
                                    {email && (
                                        <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C] shrink-0">
                                                <Mail size={13} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block text-[10px] text-[#78716C]">Email</span>
                                                <a
                                                    href={`mailto:${email}`}
                                                    className="font-medium truncate hover:text-[#EA580C] transition"
                                                >
                                                    {email}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {phone && (
                                        <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C] shrink-0">
                                                <Phone size={13} />
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-[#78716C]">Phone</span>
                                                <span className="font-medium">{phone}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Bio text */}
                            <div className="space-y-6 lg:col-span-7">
                                <div className="space-y-4 text-base sm:text-lg leading-relaxed text-[#78716C]">
                                    {about ? (
                                        about
                                            .split(/\n\n+/)
                                            .map((paragraph, idx) => (
                                                <p key={idx}>{paragraph}</p>
                                            ))
                                    ) : (
                                        <>
                                            <p>
                                                Hello! I&apos;m {name}. I love bringing ideas to life with purposeful architecture, intuitive user interfaces, and attention to detail.
                                            </p>
                                            <p>
                                                My focus is on delivering high-impact solutions that are easy to use, performant, and built to scale over time.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Core Values / Pillars */}
                                <div className="grid gap-3.5 pt-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-[#E7E5E4] bg-[#FAF9F6] p-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                                            <Sparkles size={15} className="text-[#F97316]" />
                                            <span>Simplicity & Clarity</span>
                                        </div>
                                        <p className="mt-1 text-xs text-[#78716C] leading-relaxed">
                                            Prioritizing intuitive workflows and minimal friction over unnecessary decoration.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-[#E7E5E4] bg-[#FAF9F6] p-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                                            <Code2 size={15} className="text-[#F97316]" />
                                            <span>Engineering Quality</span>
                                        </div>
                                        <p className="mt-1 text-xs text-[#78716C] leading-relaxed">
                                            Clean code conventions, maintainable architecture, and predictable performance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Skills Section */}
                {skills.length > 0 && (
                    <section
                        id={`${idPrefix}-skills`}
                        className="border-t border-[#E7E5E4] bg-[#FAF9F6] py-16 sm:py-24"
                    >
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <div className="mb-10 max-w-2xl">
                                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                                    Expertise
                                </span>
                                <h2 className="text-2xl font-bold tracking-tight text-[#1C1917] sm:text-3xl lg:text-4xl">
                                    Skills & Technologies
                                </h2>
                                <p className="mt-2 text-sm text-[#78716C]">
                                    A structured overview of technical skills, frameworks, and tools used to deliver reliable software.
                                </p>
                            </div>

                            <div className="grid gap-6 md:grid-cols-3">
                                {skillGroups.map((group, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-2xs transition hover:border-[#F97316]/40"
                                    >
                                        <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E4]">
                                            <h3 className="text-sm font-bold text-[#1C1917]">
                                                {group.title}
                                            </h3>
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF7ED] text-[10px] font-bold text-[#EA580C]">
                                                {group.items.length}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {group.items.map((skill, sIdx) => (
                                                <span
                                                    key={sIdx}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#1C1917] transition hover:border-[#F97316]/50 hover:bg-[#FFF7ED] hover:text-[#EA580C]"
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. Projects Section */}
                {projects.length > 0 && (
                    <section
                        id={`${idPrefix}-projects`}
                        className="border-t border-[#E7E5E4] bg-white py-16 sm:py-24"
                    >
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                <div className="max-w-2xl">
                                    <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                                        Portfolio
                                    </span>
                                    <h2 className="text-2xl font-bold tracking-tight text-[#1C1917] sm:text-3xl lg:text-4xl">
                                        Selected Projects
                                    </h2>
                                    <p className="mt-2 text-sm text-[#78716C]">
                                        Real-world projects showcasing engineering depth, clean aesthetics, and problem solving.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-[#78716C]">
                                    {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                                </span>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {projects.map((proj, idx) => (
                                    <article
                                        key={proj.id || idx}
                                        className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FAF9F6] transition-all duration-300 hover:-translate-y-1 hover:border-[#F97316]/50 hover:bg-white hover:shadow-lg"
                                    >
                                        <div>
                                            {/* Project Visual / Image */}
                                            <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#E7E5E4] bg-white">
                                                {proj.image ? (
                                                    <img
                                                        src={proj.image}
                                                        alt={proj.name}
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#FAF9F6] via-white to-[#FED7AA]/30 p-6 text-center">
                                                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#E7E5E4] text-base font-bold text-[#EA580C] shadow-2xs group-hover:bg-[#F97316] group-hover:text-white transition-colors">
                                                            {(proj.name || 'P').charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="mt-2 text-xs font-semibold text-[#78716C]">
                                                            {proj.name}
                                                        </span>
                                                    </div>
                                                )}

                                                {proj.link && (
                                                    <a
                                                        href={href(proj.link)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#1C1917] shadow-xs backdrop-blur-xs transition hover:bg-[#F97316] hover:text-white"
                                                        aria-label={`Visit ${proj.name}`}
                                                    >
                                                        <ArrowUpRight size={14} />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="p-5 sm:p-6 space-y-3">
                                                <h3 className="text-base font-bold text-[#1C1917] group-hover:text-[#EA580C] transition-colors">
                                                    {proj.name}
                                                </h3>

                                                <p className="text-xs sm:text-sm leading-relaxed text-[#78716C] line-clamp-3">
                                                    {proj.description || 'Modern application engineered with standard practices and responsive design.'}
                                                </p>

                                                {proj.tech.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                                        {proj.tech.map((t, tIdx) => (
                                                            <span
                                                                key={tIdx}
                                                                className="rounded-md border border-[#E7E5E4] bg-white px-2 py-0.5 text-[11px] font-medium text-[#78716C]"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {proj.link && (
                                            <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                                                <a
                                                    href={href(proj.link)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#EA580C] transition hover:text-[#C2410C]"
                                                >
                                                    <span>View details</span>
                                                    <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </a>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* 5. Experience & Education Section */}
                {(experience.length > 0 || education.length > 0) && (
                    <section
                        id={`${idPrefix}-experience`}
                        className="border-t border-[#E7E5E4] bg-[#FAF9F6] py-16 sm:py-24"
                    >
                        <div className="mx-auto max-w-6xl px-4 sm:px-6">
                            <div className="mb-10 max-w-2xl">
                                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                                    Trajectory
                                </span>
                                <h2 className="text-2xl font-bold tracking-tight text-[#1C1917] sm:text-3xl lg:text-4xl">
                                    Experience & Education
                                </h2>
                                <p className="mt-2 text-sm text-[#78716C]">
                                    A structured timeline of professional milestones and educational background.
                                </p>
                            </div>

                            <div className="grid gap-8 lg:grid-cols-2">
                                {/* Experience Column */}
                                {experience.length > 0 && (
                                    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 sm:p-8 shadow-2xs">
                                        <div className="flex items-center gap-2 pb-6 border-b border-[#E7E5E4]">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#EA580C]">
                                                <Briefcase size={16} />
                                            </div>
                                            <h3 className="text-base font-bold text-[#1C1917]">
                                                Work Experience
                                            </h3>
                                        </div>

                                        <div className="mt-6 relative pl-6 border-l border-[#E7E5E4] space-y-8 ml-2">
                                            {experience.map((item, idx) => (
                                                <div key={idx} className="relative group">
                                                    {/* Node dot */}
                                                    <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#F97316] shadow-2xs" />

                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                                            <h4 className="text-sm font-bold text-[#1C1917]">
                                                                {item.title}
                                                            </h4>
                                                            {item.period && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] px-2 py-0.5 text-[11px] font-medium text-[#78716C]">
                                                                    <Calendar size={10} />
                                                                    {item.period}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.organization && (
                                                            <div className="text-xs font-semibold text-[#EA580C]">
                                                                {item.organization}
                                                            </div>
                                                        )}

                                                        {item.description && (
                                                            <p className="pt-1 text-xs sm:text-sm leading-relaxed text-[#78716C]">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Education Column */}
                                {education.length > 0 && (
                                    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 sm:p-8 shadow-2xs">
                                        <div className="flex items-center gap-2 pb-6 border-b border-[#E7E5E4]">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#EA580C]">
                                                <GraduationCap size={16} />
                                            </div>
                                            <h3 className="text-base font-bold text-[#1C1917]">
                                                Education & Credentials
                                            </h3>
                                        </div>

                                        <div className="mt-6 relative pl-6 border-l border-[#E7E5E4] space-y-8 ml-2">
                                            {education.map((item, idx) => (
                                                <div key={idx} className="relative group">
                                                    {/* Node dot */}
                                                    <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#EA580C] shadow-2xs" />

                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                                            <h4 className="text-sm font-bold text-[#1C1917]">
                                                                {item.title}
                                                            </h4>
                                                            {item.period && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF9F6] border border-[#E7E5E4] px-2 py-0.5 text-[11px] font-medium text-[#78716C]">
                                                                    <Calendar size={10} />
                                                                    {item.period}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.organization && (
                                                            <div className="text-xs font-semibold text-[#EA580C]">
                                                                {item.organization}
                                                            </div>
                                                        )}

                                                        {item.description && (
                                                            <p className="pt-1 text-xs sm:text-sm leading-relaxed text-[#78716C]">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* 6. Contact Section */}
                <section
                    id={`${idPrefix}-contact`}
                    className="border-t border-[#E7E5E4] bg-white py-16 sm:py-24"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="rounded-3xl border border-[#E7E5E4] bg-gradient-to-br from-[#FAF9F6] to-white p-8 sm:p-12 shadow-sm">
                            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                                <div className="space-y-4 lg:col-span-7">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] px-3 py-1 text-xs font-semibold text-[#EA580C]">
                                        <Sparkles size={12} />
                                        <span>Let&apos;s build together</span>
                                    </span>

                                    <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1917] sm:text-4xl">
                                        Have a project in mind or want to talk?
                                    </h2>

                                    <p className="text-base text-[#78716C] leading-relaxed max-w-lg">
                                        I&apos;m always open to discussing new opportunities, consulting projects, or collaborations. Reach out and I&apos;ll get back to you shortly.
                                    </p>

                                    {/* Contact info list */}
                                    <div className="pt-2 space-y-2 text-xs sm:text-sm text-[#1C1917]">
                                        {email && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C]">
                                                    <Mail size={13} />
                                                </div>
                                                <a
                                                    href={`mailto:${email}`}
                                                    className="font-medium hover:text-[#EA580C] transition"
                                                >
                                                    {email}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyEmail}
                                                    className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-white px-2 py-0.5 text-[11px] text-[#78716C] hover:text-[#1C1917] transition active:scale-95"
                                                    title="Copy email"
                                                >
                                                    {copiedEmail ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                        )}

                                        {phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C]">
                                                    <Phone size={13} />
                                                </div>
                                                <span className="font-medium text-[#78716C]">{phone}</span>
                                            </div>
                                        )}

                                        {address && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C]">
                                                    <MapPin size={13} />
                                                </div>
                                                <span className="font-medium text-[#78716C]">{address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="lg:col-span-5 flex flex-col gap-4 sm:items-start lg:items-end">
                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#EA580C] active:scale-95"
                                        >
                                            <Mail size={16} />
                                            <span>Send an Email</span>
                                        </a>
                                    )}

                                    {links.length > 0 && (
                                        <div className="w-full sm:w-auto space-y-2 pt-2">
                                            <span className="block text-xs font-semibold text-[#78716C] text-left lg:text-right">
                                                Social & Profiles
                                            </span>
                                            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                                                {links.map(([label, url]) => (
                                                    <a
                                                        key={label}
                                                        href={href(url)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#1C1917] shadow-2xs transition hover:border-[#F97316]/50 hover:bg-[#FFF7ED] hover:text-[#EA580C]"
                                                    >
                                                        <span>{label}</span>
                                                        <ExternalLink size={11} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* 7. Footer */}
            <footer className="border-t border-[#E7E5E4] bg-[#FAF9F6] py-10 text-xs text-[#78716C]">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                        <span className="font-semibold text-[#1C1917]">{name}</span>
                        <span>© {new Date().getFullYear()}. All rights reserved.</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[#A8A29E]">Minimal Modern Orange Template</span>
                        <button
                            type="button"
                            onClick={scrollToTop}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:text-[#EA580C] transition"
                        >
                            <span>Back to top</span>
                            <ArrowUp size={12} />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    )
}

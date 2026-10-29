import { useState } from 'react'
import {
    ArrowLeft,
    ArrowUpRight,
    Award,
    Briefcase,
    CheckCircle2,
    Code2,
    Compass,
    ExternalLink,
    GraduationCap,
    Laptop,
    Layers,
    Lightbulb,
    Mail,
    MapPin,
    MessageSquare,
    Palette,
    Phone,
    Play,
    Send,
    Share2,
    Sparkles,
    Star,
    User,
} from 'lucide-react'

const asLines = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

function Eyebrow({ text, light = false }) {
    if (!text) return null
    return (
        <span
            className={`inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-2.5 transition-colors ${
                light ? 'text-[#B9C3DB]' : 'text-[#1F3558]'
            }`}
        >
            {text}
        </span>
    )
}

function SplitHeading({ first, rest, light = false, className = '' }) {
    return (
        <h2
            className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight transition-colors ${
                light ? 'text-white' : 'text-[#1A1A2E]'
            } ${className}`}
        >
            <span className="font-extrabold uppercase">{first}</span>{' '}
            <span className={`font-light ${light ? 'text-[#B9C3DB]' : 'text-[#1F3558]'}`}>{rest}</span>
        </h2>
    )
}

function DonutIndicator({ percentage = 75, label = '', desc = '', size = 100, strokeWidth = 9, light = false }) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference

    return (
        <div className="flex flex-col items-center text-center group">
            <div className="relative transition-transform duration-300 group-hover:scale-105" style={{ width: size, height: size }}>
                <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={light ? 'rgba(255,255,255,0.15)' : '#B9C3DB'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className={light ? '' : 'opacity-40'}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={light ? '#B9C3DB' : '#1F3558'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div
                    className={`absolute inset-0 flex items-center justify-center font-bold text-base sm:text-lg ${
                        light ? 'text-white' : 'text-[#1A1A2E]'
                    }`}
                >
                    {percentage}%
                </div>
            </div>
            {label && (
                <p className={`mt-3 text-xs font-bold uppercase tracking-wider ${light ? 'text-white' : 'text-[#1A1A2E]'}`}>
                    {label}
                </p>
            )}
            {desc && (
                <p className={`mt-0.5 max-w-[130px] text-[11px] leading-snug ${light ? 'text-[#B9C3DB]' : 'text-[#7A7F8A]'}`}>
                    {desc}
                </p>
            )}
        </div>
    )
}

function WavyDivider({ flip = false, fill = '#F2F3F5', bg = 'transparent' }) {
    return (
        <div className={`w-full overflow-hidden leading-none select-none pointer-events-none ${flip ? 'rotate-180' : ''}`} style={{ backgroundColor: bg }}>
            <svg className="relative block w-full h-7 sm:h-12 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path
                    d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,60 L1200,120 L0,120 Z"
                    fill={fill}
                />
            </svg>
        </div>
    )
}

export function HeroSection({ name, tagline, about, picture, idPrefix, go }) {
    const firstName = name.split(' ')[0] || 'CREATIVE'
    const restName = name.split(' ').slice(1).join(' ') || 'Studio'

    return (
        <section
            id={`${idPrefix}-hero`}
            className="relative overflow-hidden bg-[#F2F3F5] pt-8 pb-16 sm:py-20 md:py-24"
        >
            <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 sm:h-96 sm:w-96 rounded-[48%_52%_60%_40%/40%_60%_40%_60%] bg-[#B9C3DB]/40 blur-2xl" />
            <div className="pointer-events-none absolute top-1/2 -right-16 h-80 w-80 rounded-[55%_45%_42%_58%/58%_45%_55%_42%] bg-[#1F3558]/10 blur-3xl" />
            <span className="pointer-events-none absolute top-12 left-10 h-3 w-3 rounded-full bg-[#1F3558]" />
            <span className="pointer-events-none absolute top-32 right-12 h-3.5 w-3.5 rounded-full bg-[#B9C3DB]" />
            <span className="pointer-events-none absolute bottom-12 left-1/4 h-2.5 w-2.5 rounded-full bg-[#1F3558]" />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
                    <div className="relative flex justify-center md:col-span-5 lg:col-span-5">
                        <div className="relative">
                            <div className="absolute -inset-4 sm:-inset-6 -rotate-6 rounded-[45%_55%_63%_37%/38%_44%_56%_62%] bg-[#1F3558] opacity-90 transition-transform duration-500 hover:rotate-0" />
                            <div className="absolute -inset-2 rounded-[52%_48%_45%_55%/45%_55%_48%_52%] bg-[#B9C3DB] opacity-50 blur-sm" />

                            <div className="relative h-56 w-56 sm:h-72 sm:w-72 md:h-80 md:w-80 overflow-hidden rounded-full border-4 border-white bg-[#1F3558] shadow-2xl">
                                {picture ? (
                                    <img src={picture} alt={name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center text-white">
                                        <User size={72} className="text-[#B9C3DB]" />
                                        <span className="mt-2 text-xs font-bold tracking-widest uppercase text-[#B9C3DB]">
                                            {name || 'Studio'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <a
                                href={`#${idPrefix}-projects`}
                                onClick={go('projects')}
                                className="group absolute -bottom-2 -right-2 sm:bottom-2 sm:right-2 flex h-13 w-13 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#1F3558] text-white shadow-xl ring-4 ring-white transition-all duration-300 hover:bg-[#172A47] hover:scale-105 active:scale-95"
                                aria-label="Start and view work"
                            >
                                <ArrowUpRight
                                    size={24}
                                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                />
                            </a>
                        </div>
                    </div>

                    <div className="text-center md:col-span-7 md:text-left lg:col-span-7">
                        <Eyebrow text="PORTFOLIO / CREATIVE STUDIO" />

                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1A1A2E] leading-[1.1]">
                            <span className="uppercase text-[#1A1A2E]">{firstName}</span>{' '}
                            <span className="font-light text-[#1F3558]">{restName}</span>
                        </h1>

                        {tagline && (
                            <p className="mt-3 text-base sm:text-lg font-medium text-[#1F3558]">
                                {tagline}
                            </p>
                        )}

                        <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#7A7F8A]">
                            {about ||
                                'Crafting modern, corporate-creative digital solutions with elegant typography, soft organic aesthetics, and generous whitespace.'}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:justify-start">
                            <a
                                href={`#${idPrefix}-projects`}
                                onClick={go('projects')}
                                className="inline-flex items-center gap-2 rounded-full bg-[#1F3558] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#172A47] hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                            >
                                <span>Start / View Work</span>
                                <ArrowUpRight size={16} />
                            </a>
                            <a
                                href={`#${idPrefix}-contact`}
                                onClick={go('contact')}
                                className="inline-flex items-center gap-2 rounded-full border border-[#1F3558]/30 bg-white px-6 py-3 text-xs sm:text-sm font-semibold text-[#1F3558] shadow-sm transition-all duration-300 hover:bg-[#F2F3F5] hover:border-[#1F3558] active:scale-95"
                            >
                                <span>Get in Touch</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function AboutSection({ name, about, picture, idPrefix, go }) {
    const currentYear = new Date().getFullYear()

    return (
        <section
            id={`${idPrefix}-about`}
            className="relative overflow-hidden bg-[#1F3558] py-16 sm:py-20 md:py-24 text-white"
        >
            <div className="pointer-events-none absolute -bottom-10 right-4 sm:right-12 select-none text-[120px] sm:text-[180px] md:text-[220px] font-black leading-none text-white/[0.04]">
                {currentYear}
            </div>

            <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#172A47] opacity-60 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#B9C3DB]/10 blur-2xl" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-10 md:grid-cols-12 md:gap-10">
                    <div className="md:col-span-7">
                        <Eyebrow text="ABOUT ME & STUDIO" light />
                        <SplitHeading first="ABOUT" rest="The Creative Vision" light />

                        <div className="mt-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#B9C3DB]">
                            <p>
                                {about ||
                                    'Dedicated to delivering purposeful digital experiences where design innovation meets engineering rigor. Every layout is structured around organic flow, clarity, and client impact.'}
                            </p>
                            <p className="text-white/80">
                                With a focus on balance, whitespace, and soft geometry, projects are shaped to elevate brand authority while ensuring high functionality across all devices.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B9C3DB]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#B9C3DB]" />
                                    <span>01. Strategy</span>
                                </div>
                                <p className="mt-1 text-xs text-white/70">Clear architecture and user-focused roadmaps.</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B9C3DB]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#B9C3DB]" />
                                    <span>02. Design</span>
                                </div>
                                <p className="mt-1 text-xs text-white/70">Modern, human-centric organic layouts.</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B9C3DB]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#B9C3DB]" />
                                    <span>03. Delivery</span>
                                </div>
                                <p className="mt-1 text-xs text-white/70">High-performance and scalable execution.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center md:col-span-5">
                        <div className="relative">
                            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#B9C3DB]/40 animate-[spin_40s_linear_infinite]" />
                            <div className="relative h-48 w-48 sm:h-64 sm:w-64 md:h-72 md:w-72 overflow-hidden rounded-full border-4 border-[#B9C3DB] shadow-2xl bg-[#172A47]">
                                {picture ? (
                                    <img src={picture} alt={name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center text-white">
                                        <Sparkles size={50} className="text-[#B9C3DB]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function StatsSkillsSection({ skills, projects, idPrefix }) {
    const skillList = skills.length > 0 ? skills : ['Product Design', 'Frontend Dev', 'UI/UX Architecture', 'Brand Strategy']
    const donuts = skillList.slice(0, 4).map((skillName, idx) => {
        const percentages = [92, 85, 78, 88]
        return {
            percentage: percentages[idx % percentages.length],
            label: skillName,
            desc: `Mastery in ${skillName}`,
        }
    })

    const featuredProject = projects[0] || {
        name: 'Featured Portfolio Project',
        description: 'Interactive responsive web experience with smooth transitions and modular design.',
        tech: skillList.slice(0, 3),
    }

    return (
        <section id={`${idPrefix}-skills`} className="relative bg-[#F2F3F5] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <Eyebrow text="CAPABILITIES & PERFORMANCE" />
                    <SplitHeading first="SKILLS" rest="& Performance Metrics" />
                    <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-[#7A7F8A]">
                        High-precision execution measured through verified milestones, robust architectures, and creative standards.
                    </p>
                </div>

                <div className="mt-12 grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-6">
                        <div className="relative mx-auto max-w-md sm:max-w-lg">
                            <div className="rounded-t-2xl border-4 border-[#172A47] bg-[#172A47] p-2.5 shadow-2xl">
                                <div className="flex items-center gap-1.5 pb-2 px-1 border-b border-white/10">
                                    <div className="h-2 w-2 rounded-full bg-[#B9C3DB]" />
                                    <div className="h-2 w-2 rounded-full bg-[#B9C3DB]/70" />
                                    <div className="h-2 w-2 rounded-full bg-[#B9C3DB]/40" />
                                    <div className="mx-auto h-3 w-36 rounded-full bg-white/10 text-[8px] text-white/50 flex items-center justify-center font-mono">
                                        hulma.studio/work
                                    </div>
                                </div>
                                <div className="aspect-[16/10] overflow-hidden rounded-lg bg-white p-4 flex flex-col justify-between shadow-inner">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F3558]">
                                                Featured Work
                                            </span>
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        </div>
                                        <h4 className="mt-2 text-base font-bold text-[#1A1A2E]">
                                            {featuredProject.name || 'Studio Case Study'}
                                        </h4>
                                        <p className="mt-1 text-xs text-[#7A7F8A] line-clamp-3">
                                            {featuredProject.description || 'Full stack interactive digital product with responsive layouts and scalable cloud foundation.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 pt-2 border-t border-[#F2F3F5]">
                                        {(Array.isArray(featuredProject.tech) ? featuredProject.tech : skillList.slice(0, 3)).map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[9px] font-semibold text-[#1F3558]"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="relative mx-auto h-3 sm:h-4 w-[108%] -left-[4%] rounded-b-xl bg-[#B9C3DB] shadow-md border-t border-white/40">
                                <div className="mx-auto h-1 w-16 sm:w-20 rounded-b-md bg-[#1F3558]/30" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6">
                        <div className="grid grid-cols-2 gap-6 sm:gap-8 rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#B9C3DB]/40">
                            {donuts.map((d) => (
                                <DonutIndicator
                                    key={d.label}
                                    percentage={d.percentage}
                                    label={d.label}
                                    desc={d.desc}
                                    size={100}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function ServicesSection({ skills, idPrefix }) {
    const defaultServices = [
        {
            title: 'UI & UX Design',
            desc: 'Intuitive user journeys and accessible design systems crafted with organic clarity.',
            Icon: Palette,
        },
        {
            title: 'Web Engineering',
            desc: 'Robust, full-stack applications built with modern frameworks and performance in mind.',
            Icon: Code2,
        },
        {
            title: 'Brand Architecture',
            desc: 'Distinctive visual identities, typography guidelines, and digital brand positioning.',
            Icon: Sparkles,
        },
        {
            title: 'System Strategy',
            desc: 'Comprehensive technical planning, responsive performance audits, and cloud deployment.',
            Icon: Layers,
        },
    ]

    const services = skills.length >= 4
        ? skills.slice(0, 4).map((s, idx) => ({
              title: s,
              desc: defaultServices[idx]?.desc || 'Expert craftsmanship delivering reliable, modern solutions.',
              Icon: defaultServices[idx]?.Icon || Lightbulb,
          }))
        : defaultServices

    return (
        <section id={`${idPrefix}-services`} className="relative bg-[#FFFFFF] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <Eyebrow text="CORE SERVICES & DISCIPLINES" />
                    <SplitHeading first="SERVICES" rest="& Studio Offerings" />
                    <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-[#7A7F8A]">
                        End-to-end capabilities tailored to solve complex digital challenges.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {services.map((item, idx) => {
                        const Icon = item.Icon
                        return (
                            <div
                                key={item.title}
                                className="group flex flex-col items-center rounded-3xl bg-[#F2F3F5] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:border hover:border-[#B9C3DB]"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1F3558] text-white shadow-md transition-all duration-300 group-hover:bg-[#172A47] group-hover:scale-110">
                                    <Icon size={26} />
                                </div>
                                <span className="mt-4 text-[10px] font-bold tracking-widest text-[#B9C3DB] uppercase">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <h3 className="mt-1 text-base font-bold text-[#1A1A2E]">{item.title}</h3>
                                <p className="mt-2 text-xs leading-relaxed text-[#7A7F8A]">{item.desc}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export function ProjectsSection({ projects, idPrefix }) {
    const list = projects.length > 0
        ? projects
        : [
              {
                  name: 'Horizon Brand Platform',
                  description: 'A comprehensive corporate-creative platform with interactive 3D elements and responsive layouts.',
                  tech: ['React', 'Tailwind', 'Design Systems'],
                  link: '#',
              },
              {
                  name: 'Studio Nova Dashboard',
                  description: 'Enterprise data analytics with clean data visualization, donut charts, and fluid user flows.',
                  tech: ['TypeScript', 'UI/UX', 'Cloud API'],
                  link: '#',
              },
          ]

    return (
        <section id={`${idPrefix}-projects`} className="relative bg-[#F2F3F5] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <Eyebrow text="SELECTED PORTFOLIO" />
                        <SplitHeading first="PROJECTS" rest="& Case Studies" />
                    </div>
                    <p className="max-w-md text-xs sm:text-sm text-[#7A7F8A]">
                        A curated selection of client solutions, case studies, and engineering achievements.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                    {list.map((proj, idx) => {
                        const wordNumber = NUMBER_WORDS[idx] || `Project ${idx + 1}`
                        const tech = Array.isArray(proj.tech) ? proj.tech : []
                        const projectImage = proj.image || proj.picture || null

                        return (
                            <article
                                key={`${proj.name}-${idx}`}
                                className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border border-transparent hover:border-[#B9C3DB]"
                            >
                                <div>
                                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-tr from-[#1F3558] to-[#172A47] text-white p-5 flex flex-col justify-between shadow-inner">
                                        {projectImage ? (
                                            <img
                                                src={projectImage}
                                                alt={proj.name}
                                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <>
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white font-bold backdrop-blur-xs">
                                                        {(proj.name || 'P').charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="text-xs font-mono text-[#B9C3DB]">0{idx + 1}</span>
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="h-1.5 w-16 rounded-full bg-[#B9C3DB] mb-2" />
                                                    <span className="text-lg font-bold tracking-tight text-white line-clamp-1">
                                                        {proj.name}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1F3558]">
                                            {wordNumber}
                                        </span>
                                        {proj.link && (
                                            <a
                                                href={href(proj.link)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F3F5] text-[#1F3558] transition-all hover:bg-[#1F3558] hover:text-white"
                                                aria-label="View project link"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>

                                    <h3 className="mt-1 text-xl font-bold text-[#1A1A2E]">{proj.name}</h3>

                                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#7A7F8A]">
                                        {proj.description || 'Modern digital application engineered with high fidelity standards and clear user experience.'}
                                    </p>
                                </div>

                                {tech.length > 0 && (
                                    <div className="mt-6 flex flex-wrap gap-1.5 pt-4 border-t border-[#F2F3F5]">
                                        {tech.map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-[10px] font-semibold text-[#1F3558]"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export function TimelineSection({ experience, education, idPrefix }) {
    const rawItems = [...experience, ...education]
    const milestones = rawItems.length > 0
        ? rawItems.slice(0, 4).map((entry, idx) => {
              if (typeof entry === 'string') {
                  const parts = entry.split(/—|-/)
                  const title = parts[0]?.trim() || entry
                  const desc = parts.slice(1).join(' - ').trim() || 'Key career contributor & system builder'
                  return { title, desc, num: String(idx + 1).padStart(2, '0') }
              }
              return {
                  title: entry?.title || entry?.role || `Milestone ${idx + 1}`,
                  desc: entry?.company || entry?.desc || 'Professional leadership & execution',
                  num: String(idx + 1).padStart(2, '0'),
              }
          })
        : [
              { num: '01', title: 'Lead Architect', desc: 'Creative Studio (2024 - Present) — Overseeing product systems' },
              { num: '02', title: 'Senior Developer', desc: 'TechCorp Solutions (2022 - 2024) — Full stack feature development' },
              { num: '03', title: 'UI/UX Specialist', desc: 'Design Agency (2020 - 2022) — Responsive user interfaces' },
          ]

    return (
        <section id={`${idPrefix}-experience`} className="relative bg-[#FFFFFF] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <Eyebrow text="CAREER & EDUCATION" />
                    <SplitHeading first="TIMELINE" rest="& Career Milestones" />
                    <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-[#7A7F8A]">
                        A progression of professional positions, education, and notable career achievements.
                    </p>
                </div>

                <div className="relative mt-16">
                    <div className="hidden md:block absolute top-6 left-0 right-0 h-1 bg-[#B9C3DB]/40 -z-0" />

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4 relative z-10">
                        {milestones.map((m) => (
                            <div key={m.num} className="flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F3558] text-white shadow-md ring-4 ring-white">
                                    <span className="text-xs font-bold font-mono text-[#B9C3DB]">{m.num}</span>
                                </div>
                                <h3 className="mt-4 text-base font-bold text-[#1A1A2E]">{m.title}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-[#7A7F8A] max-w-xs">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export function TestimonialsSection({ idPrefix }) {
    const testimonials = [
        {
            name: 'Sophia Laurent',
            role: 'Product Director at Nova',
            quote: 'Working with this studio elevated our entire digital presence. Clean, structured, and executed with high creative precision.',
            avatarText: 'SL',
        },
        {
            name: 'Marcus Vance',
            role: 'Founder, Vance Ventures',
            quote: 'Exceptional attention to whitespace, typography, and responsive detail. Our client feedback has been overwhelmingly positive.',
            avatarText: 'MV',
        },
        {
            name: 'Elena Rostova',
            role: 'Engineering VP',
            quote: 'A rare blend of high aesthetics and engineering rigor. Fast delivery and seamlessly maintainable code.',
            avatarText: 'ER',
        },
    ]

    return (
        <section id={`${idPrefix}-testimonials`} className="relative bg-[#F2F3F5] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <Eyebrow text="CLIENT ENDORSEMENTS" />
                    <SplitHeading first="TESTIMONIALS" rest="& Collaborations" />
                    <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-[#7A7F8A]">
                        What collaborators and project partners say about our work.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {testimonials.map((t) => (
                        <div
                            key={t.name}
                            className="flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-[#B9C3DB]"
                        >
                            <p className="text-xs sm:text-sm leading-relaxed text-[#7A7F8A] italic">
                                &ldquo;{t.quote}&rdquo;
                            </p>

                            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#F2F3F5]">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F3558] text-xs font-bold text-white shadow-xs">
                                        {t.avatarText}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#1A1A2E]">{t.name}</h4>
                                        <p className="text-[10px] text-[#7A7F8A]">{t.role}</p>
                                    </div>
                                </div>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F3F5] text-[#1F3558]">
                                    <Star size={13} fill="#1F3558" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export function ProcessSection({ picture, name, idPrefix }) {
    const steps = [
        {
            num: '01',
            title: 'Discovery & Audit',
            desc: 'Uncovering business goals, technical constraints, and user behaviors.',
            Icon: Compass,
        },
        {
            num: '02',
            title: 'Design & Architecture',
            desc: 'Structuring organic visual systems, wireframes, and database models.',
            Icon: Palette,
        },
        {
            num: '03',
            title: 'Build & Integration',
            desc: 'Clean code execution with high-performance responsive engineering.',
            Icon: Code2,
        },
        {
            num: '04',
            title: 'Launch & Optimize',
            desc: 'Production deployment, live monitoring, and ongoing optimization.',
            Icon: Sparkles,
        },
    ]

    return (
        <section id={`${idPrefix}-process`} className="relative bg-[#FFFFFF] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-7">
                        <Eyebrow text="WORKING METHODOLOGY" />
                        <SplitHeading first="PROCESS" rest="& Execution Flow" />
                        <p className="mt-3 text-xs sm:text-sm text-[#7A7F8A]">
                            A disciplined 4-stage framework that turns concepts into resilient digital products.
                        </p>

                        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {steps.map((s) => {
                                const Icon = s.Icon
                                return (
                                    <div
                                        key={s.num}
                                        className="rounded-2xl border border-[#B9C3DB]/40 bg-[#F2F3F5] p-5 transition-all duration-300 hover:bg-white hover:shadow-md"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1F3558] text-white">
                                                <Icon size={16} />
                                            </div>
                                            <span className="font-mono text-xs font-bold text-[#1F3558]">{s.num}</span>
                                        </div>
                                        <h3 className="mt-3 text-sm font-bold text-[#1A1A2E]">{s.title}</h3>
                                        <p className="mt-1 text-xs leading-relaxed text-[#7A7F8A]">{s.desc}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex justify-center lg:col-span-5">
                        <div className="relative h-72 w-72 sm:h-80 sm:w-80">
                            <div className="absolute inset-4 overflow-hidden rounded-full border-4 border-white shadow-xl bg-[#1F3558]">
                                {picture ? (
                                    <img src={picture} alt={name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-white">
                                        <Sparkles size={48} className="text-[#B9C3DB]" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -top-2 left-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-[#B9C3DB] shadow-lg text-[#1F3558] font-bold text-xs uppercase tracking-wider">
                                Agile
                            </div>
                            <div className="absolute -bottom-2 right-4 flex h-22 w-22 items-center justify-center rounded-full border-2 border-white bg-[#172A47] shadow-xl text-white font-bold text-xs">
                                100%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function ContactSection({ email, phone, address, links, idPrefix }) {
    const [sent, setSent] = useState(false)
    const [formState, setFormState] = useState({ name: '', email: '', message: '' })

    const handleSubmit = (e) => {
        e.preventDefault()
        setSent(true)
        setTimeout(() => setSent(false), 5000)
        setFormState({ name: '', email: '', message: '' })
    }

    return (
        <section id={`${idPrefix}-contact`} className="relative bg-[#F2F3F5] py-16 sm:py-20 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
                    <div className="lg:col-span-5 space-y-6">
                        <div>
                            <Eyebrow text="START A CONVERSATION" />
                            <SplitHeading first="CONTACT" rest="& Connect" />
                            <p className="mt-3 text-xs sm:text-sm text-[#7A7F8A]">
                                Have a project in mind or want to collaborate? Send a message and let&apos;s build something exceptional.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-[#B9C3DB]/30">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1F3558] text-white">
                                    <MessageSquare size={20} />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7F8A]">Direct Email</span>
                                    <p className="truncate text-xs sm:text-sm font-semibold text-[#1A1A2E]">
                                        {email ? <a href={`mailto:${email}`} className="hover:underline">{email}</a> : 'hello@creativestudio.com'}
                                    </p>
                                </div>
                            </div>

                            {phone && (
                                <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-[#B9C3DB]/30">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1F3558] text-white">
                                        <Phone size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7F8A]">Phone Call</span>
                                        <p className="truncate text-xs sm:text-sm font-semibold text-[#1A1A2E]">{phone}</p>
                                    </div>
                                </div>
                            )}

                            {address && (
                                <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-[#B9C3DB]/30">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1F3558] text-white">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7F8A]">Location</span>
                                        <p className="truncate text-xs sm:text-sm font-semibold text-[#1A1A2E]">{address}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {links.length > 0 && (
                            <div className="pt-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#1F3558]">Online Channels</span>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {links.map(([platform, url]) => (
                                        <a
                                            key={platform}
                                            href={href(url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#1F3558] shadow-xs hover:bg-[#1F3558] hover:text-white transition-all"
                                        >
                                            {platform}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-7">
                        <div className="rounded-3xl bg-white p-6 sm:p-8 md:p-10 shadow-sm border border-[#B9C3DB]/40">
                            <h3 className="text-xl font-bold text-[#1A1A2E]">Send a Direct Message</h3>
                            <p className="mt-1 text-xs text-[#7A7F8A]">We typically reply within 24 business hours.</p>

                            {sent ? (
                                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                                    <p className="text-xs sm:text-sm">
                                        Thank you! Your message has been prepared. We look forward to connecting.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                    <div>
                                        <label htmlFor="cs-name" className="block text-xs font-semibold uppercase tracking-wider text-[#1F3558] mb-1">
                                            Your Name
                                        </label>
                                        <input
                                            id="cs-name"
                                            type="text"
                                            required
                                            value={formState.name}
                                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                            placeholder="Jane Doe"
                                            className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-slate-400 focus:border-[#1F3558] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="cs-email" className="block text-xs font-semibold uppercase tracking-wider text-[#1F3558] mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            id="cs-email"
                                            type="email"
                                            required
                                            value={formState.email}
                                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                            placeholder="jane@example.com"
                                            className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm text-[#1A1A2E] placeholder:text-slate-400 focus:border-[#1F3558] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="cs-message" className="block text-xs font-semibold uppercase tracking-wider text-[#1F3558] mb-1">
                                            Message
                                        </label>
                                        <textarea
                                            id="cs-message"
                                            rows={4}
                                            required
                                            value={formState.message}
                                            onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                            placeholder="Tell us about your project or inquiry..."
                                            className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-[#1A1A2E] placeholder:text-slate-400 focus:border-[#1F3558] focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F3558] px-8 py-3 text-xs sm:text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#172A47] hover:shadow-lg active:scale-95 w-full sm:w-auto"
                                    >
                                        <span>Send Message</span>
                                        <Send size={15} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export function FooterSection({ name, picture, idPrefix, go }) {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="relative overflow-hidden bg-[#1F3558] text-white pt-16 pb-12 sm:pt-20 sm:pb-16">
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#172A47] opacity-60 blur-3xl" />
            <div className="pointer-events-none absolute top-0 left-0 h-64 w-64 rounded-full bg-[#B9C3DB]/10 blur-2xl" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-8 md:grid-cols-12 pb-12 border-b border-white/10">
                    <div className="flex justify-center md:col-span-4 md:justify-start">
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-2 border-[#B9C3DB] bg-[#172A47] shadow-xl">
                            {picture ? (
                                <img src={picture} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-white">
                                    <Sparkles size={32} className="text-[#B9C3DB]" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center md:col-span-8 md:text-left">
                        <Eyebrow text="THANK YOU FOR VISITING" light />
                        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
                            LET&apos;S CREATE SOMETHING <span className="font-light text-[#B9C3DB]">REMARKABLE</span>
                        </h2>
                        <p className="mt-2 text-xs sm:text-sm text-[#B9C3DB]">
                            Ready to transform ideas into refined, modern digital reality.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs text-[#B9C3DB]">
                    <p>© {currentYear} {name || 'Creative Studio'}. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <a href={`#${idPrefix}-hero`} onClick={go('hero')} className="hover:text-white transition">
                            Back to top ↑
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default function CreativeStudioTemplate({
    portfolio,
    idPrefix = 'studio',
    stickyNav = true,
    onBack,
    backLabel = 'Back to editor',
}) {
    const p = portfolio || {}
    const sections = p.sections || {}
    const profile = sections.profile || p.profile || {}
    const name = profile.fullName || p.title || 'Creative Studio'
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
        { id: 'hero', label: 'Home' },
        { id: 'about', label: 'About' },
        { id: 'skills', label: 'Skills' },
        { id: 'services', label: 'Services' },
        { id: 'projects', label: 'Projects' },
        { id: 'experience', label: 'Timeline' },
        { id: 'testimonials', label: 'Endorsements' },
        { id: 'process', label: 'Process' },
        { id: 'contact', label: 'Contact' },
    ]

    const go = (id) => (e) => {
        if (e && e.preventDefault) e.preventDefault()
        const el = document.getElementById(`${idPrefix}-${id}`)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div
            className="min-h-full bg-[#F2F3F5] text-[#1A1A2E] font-sans antialiased overflow-x-clip selection:bg-[#B9C3DB] selection:text-[#1F3558]"
            style={{
                '--cs-navy': '#1F3558',
                '--cs-navy-deep': '#172A47',
                '--cs-periwinkle': '#B9C3DB',
                '--cs-bg-light': '#F2F3F5',
                '--cs-white': '#FFFFFF',
                '--cs-text-gray': '#7A7F8A',
                '--cs-heading-dark': '#1A1A2E',
            }}
        >
            <div className={`${stickyNav ? 'sticky top-3 sm:top-4' : 'relative mt-4'} z-40 mx-auto w-max max-w-[94vw] px-2 sm:px-4 pointer-events-none`}>
                <header className="pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-full border border-white/60 bg-white/90 px-3 sm:px-5 py-2 shadow-xl backdrop-blur-md">
                    {name && (
                        <span className="mr-2 hidden text-xs font-bold uppercase tracking-wider text-[#1F3558] md:inline-block">
                            ● {name.split(' ')[0]}
                        </span>
                    )}

                    <nav className="flex items-center gap-1">
                        {nav.slice(0, 6).map((item) => (
                            <a
                                key={item.id}
                                href={`#${idPrefix}-${item.id}`}
                                onClick={go(item.id)}
                                className="rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#7A7F8A] transition hover:bg-[#1F3558] hover:text-white active:scale-95"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    {onBack && (
                        <button
                            onClick={onBack}
                            className="ml-2 flex items-center gap-1.5 rounded-full bg-[#1F3558] hover:bg-[#172A47] px-3 py-1 text-xs font-semibold text-white transition shadow-sm"
                        >
                            <ArrowLeft size={13} />
                            <span className="hidden sm:inline">{backLabel}</span>
                        </button>
                    )}
                </header>
            </div>

            <HeroSection
                name={name}
                tagline={tagline}
                about={about}
                picture={picture}
                idPrefix={idPrefix}
                go={go}
            />

            <WavyDivider fill="#1F3558" bg="#F2F3F5" />

            <AboutSection
                name={name}
                about={about}
                picture={picture}
                idPrefix={idPrefix}
                go={go}
            />

            <WavyDivider flip fill="#1F3558" bg="#F2F3F5" />

            <StatsSkillsSection
                skills={skills}
                projects={projects}
                idPrefix={idPrefix}
            />

            <ServicesSection
                skills={skills}
                idPrefix={idPrefix}
            />

            <ProjectsSection
                projects={projects}
                idPrefix={idPrefix}
            />

            <TimelineSection
                experience={experience}
                education={education}
                idPrefix={idPrefix}
            />

            <TestimonialsSection
                idPrefix={idPrefix}
            />

            <ProcessSection
                picture={picture}
                name={name}
                idPrefix={idPrefix}
            />

            <ContactSection
                email={email}
                phone={phone}
                address={address}
                links={links}
                idPrefix={idPrefix}
            />

            <FooterSection
                name={name}
                picture={picture}
                idPrefix={idPrefix}
                go={go}
            />
        </div>
    )
}

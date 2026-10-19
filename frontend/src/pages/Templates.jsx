import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { Check, ArrowRight, FileText, LayoutGrid, Palette, Clock, Eye, X } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import PortfolioSite from '../components/PortfolioSite'
import { resolveDisplayName } from '../utils/portfolioUtils'

const STORAGE_KEY = 'hulma-template'

function SimplePreview() {
    return (
        <div className="h-full rounded-lg bg-[#fdfcf9] border border-stone-200 p-3 shadow-xs font-serif flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-1.5">
                <div className="h-1.5 w-12 rounded-xs bg-stone-800" />
                <div className="flex gap-2">
                    <div className="h-1 w-4 rounded-xs bg-stone-400" />
                    <div className="h-1 w-4 rounded-xs bg-stone-400" />
                    <div className="h-1 w-4 rounded-xs bg-stone-400" />
                </div>
            </div>

            <div className="my-auto max-w-[85%] mx-auto w-full space-y-2 py-1">
                <div className="h-2.5 w-28 rounded-xs bg-stone-900" />
                <div className="h-1.5 w-36 rounded-xs bg-stone-500 italic" />
                <div className="space-y-1 pt-1">
                    <div className="h-1 w-full rounded-xs bg-stone-300" />
                    <div className="h-1 w-4/5 rounded-xs bg-stone-300" />
                </div>

                <div className="h-px bg-stone-200 my-2" />

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <div className="h-1.5 w-20 rounded-xs bg-stone-800" />
                        <div className="h-1 w-6 rounded-xs bg-stone-400" />
                    </div>
                    <div className="h-1 w-3/4 rounded-xs bg-stone-300" />
                    <div className="flex justify-between items-center pt-0.5">
                        <div className="h-1.5 w-16 rounded-xs bg-stone-800" />
                        <div className="h-1 w-6 rounded-xs bg-stone-400" />
                    </div>
                </div>

                <div className="h-px bg-stone-200 my-2" />

                <div className="h-1 w-5/6 rounded-xs bg-stone-400" />
            </div>

            <div className="border-t border-stone-200/80 pt-1 text-center">
                <div className="h-1 w-16 rounded-xs bg-stone-300 mx-auto" />
            </div>
        </div>
    )
}

function ModernPreview() {
    return (
        <div className="h-full rounded-lg bg-[#f8fafc] border border-slate-200 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-1 py-1 rounded-md">
                <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-md bg-blue-600" />
                    <div className="h-1.5 w-8 rounded bg-slate-700" />
                </div>
                <div className="flex gap-1">
                    <div className="h-1.5 w-4 rounded bg-slate-400" />
                    <div className="h-1.5 w-4 rounded bg-slate-400" />
                </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 my-1.5 items-center">
                <div className="col-span-3 space-y-1">
                    <div className="h-1.5 w-12 rounded-full bg-blue-100" />
                    <div className="h-2.5 w-24 rounded bg-slate-900" />
                    <div className="h-1 w-20 rounded bg-slate-400" />
                    <div className="h-2 w-8 rounded bg-blue-600 mt-1" />
                </div>
                <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xs">
                    <div className="aspect-square w-full rounded-md bg-gradient-to-tr from-blue-500 to-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 my-1">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-md border border-slate-200 bg-white p-1 text-center shadow-2xs">
                        <div className="h-2 w-4 mx-auto rounded bg-blue-600" />
                        <div className="mt-0.5 h-1 w-6 mx-auto rounded bg-slate-400" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-1">
                {[0, 1].map((i) => (
                    <div key={i} className="rounded-md border border-slate-200 bg-white p-1 shadow-2xs">
                        <div className="h-5 w-full rounded bg-blue-50 border border-blue-100" />
                        <div className="mt-1 h-1.5 w-12 rounded bg-slate-800" />
                        <div className="mt-0.5 h-1 w-full rounded bg-slate-300" />
                    </div>
                ))}
            </div>
        </div>
    )
}

function CreativePreview() {
    return (
        <div className="relative h-full overflow-hidden rounded-lg bg-[#08070e] border border-white/10 p-2.5 flex flex-col justify-between">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-purple-600/30 blur-lg" />
            <div className="absolute -left-6 bottom-4 h-16 w-16 rounded-full bg-pink-600/25 blur-lg" />

            <div className="relative z-10 mx-auto w-max rounded-full border border-white/20 bg-white/10 px-2 py-0.5 flex gap-1">
                <div className="h-1 w-3 rounded-full bg-pink-400" />
                <div className="h-1 w-3 rounded-full bg-white/60" />
                <div className="h-1 w-3 rounded-full bg-white/60" />
            </div>

            <div className="relative z-10 my-1 space-y-1">
                <div className="h-1 w-14 rounded-full bg-orange-400/80 -rotate-2" />
                <div className="text-3xl font-black leading-none tracking-tighter text-white">
                    AR
                </div>
                <div className="h-1 w-24 rounded bg-white/60" />
            </div>

            <div className="relative z-10 -mx-2.5 border-y border-white/15 bg-white/5 py-0.5 px-2 flex justify-between">
                <div className="h-1 w-8 rounded-full bg-pink-400" />
                <div className="h-1 w-8 rounded-full bg-purple-400" />
                <div className="h-1 w-8 rounded-full bg-orange-400" />
            </div>

            <div className="relative z-10 flex items-center justify-between border-b border-white/10 py-1">
                <div>
                    <div className="text-sm font-black text-stroke-outline leading-none">01</div>
                    <div className="h-1 w-12 rounded bg-white/80 mt-0.5" />
                </div>
                <div className="h-3.5 w-3.5 rounded-full border border-pink-500 bg-pink-500/20" />
            </div>
        </div>
    )
}

const TEMPLATES = [
    {
        id: 'simple',
        num: 'Template 1',
        name: 'Simple',
        Icon: FileText,
        text: 'Clean and professional design.',
        tags: ['Clean layout', 'Minimal', 'Professional'],
        Preview: SimplePreview,
    },
    {
        id: 'modern',
        num: 'Template 2',
        name: 'Modern',
        Icon: LayoutGrid,
        text: 'Modern layout using cards, sections, and visual elements.',
        tags: ['Cards', 'Sections', 'Visual elements'],
        Preview: ModernPreview,
    },
    {
        id: 'creative',
        num: 'Template 3',
        name: 'Creative',
        Icon: Palette,
        text: 'A bold, expressive layout that helps your work stand out.',
        tags: ['Bold colors', 'Custom shapes', 'Standout'],
        Preview: CreativePreview,
    },
]

function readSaved(userId) {
    try {
        if (userId) {
            const userDirect = localStorage.getItem(`hulma-template:${userId}`)
            if (userDirect) return userDirect
            const userSettings = JSON.parse(localStorage.getItem(`hulma-settings:${userId}`) || '{}')
            if (userSettings.defaultTemplate) return userSettings.defaultTemplate
        }
        return 'simple'
    } catch {
        return 'simple'
    }
}

export default function Templates() {
    const navigate = useNavigate()
    const { user } = useUser()
    const [selected, setSelected] = useState(() => readSaved(user?.id))
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewTemplate, setPreviewTemplate] = useState('simple')

    useEffect(() => {
        if (user?.id) {
            setSelected(readSaved(user.id))
        }
    }, [user?.id])

    const current = TEMPLATES.find((t) => t.id === selected)
    const previewTemplateConfig = TEMPLATES.find((t) => t.id === previewTemplate) || TEMPLATES[0]

    const displayName = resolveDisplayName(user, '')
    const emailAddress = user?.primaryEmailAddress?.emailAddress || ''

    const samplePortfolio = useMemo(() => {
        let draft = null
        if (user?.id) {
            try {
                const raw = localStorage.getItem(`hulmaPortfolio:${user.id}`)
                if (raw) draft = JSON.parse(raw)
            } catch {}
        }

        const name = draft?.fullName || displayName || 'Alex Rivera'
        const email = draft?.email || emailAddress || 'alex.rivera@example.com'

        return {
            title: draft?.title || `${name}'s Portfolio`,
            summary: draft?.aboutMe || 'Full Stack Developer crafting performant web apps and intuitive digital experiences.',
            sections: {
                profile: {
                    fullName: name,
                    email: email,
                    contactNumber: draft?.contactNumber || '+1 (555) 234-5678',
                    address: draft?.address || 'San Francisco, CA',
                    aboutMe: draft?.aboutMe || 'Passionate Full Stack Developer with 4+ years of experience designing scalable web applications and engaging digital experiences. I specialize in modern JavaScript/TypeScript, React, Python, and cloud architectures, turning complex requirements into clean, user-friendly solutions.',
                },
                skills: draft?.skills
                    ? (Array.isArray(draft.skills) ? draft.skills : draft.skills.split(/\n|,/)).map((s) => s.trim()).filter(Boolean)
                    : ['React', 'TypeScript', 'Node.js', 'Python', 'Tailwind CSS', 'FastAPI', 'PostgreSQL', 'UI/UX Design', 'Docker', 'GraphQL'],
                education: draft?.education
                    ? (Array.isArray(draft.education) ? draft.education : draft.education.split(/\n+/)).map((s) => s.trim()).filter(Boolean)
                    : [
                        'B.S. in Computer Science — University of California, Berkeley (2018 - 2022)',
                        'Full Stack Web Development Certification — Meta (2023)'
                    ],
                workExperience: draft?.workExperience
                    ? (Array.isArray(draft.workExperience) ? draft.workExperience : draft.workExperience.split(/\n+/)).map((s) => s.trim()).filter(Boolean)
                    : [
                        'Senior Frontend Engineer at CloudScale Tech (2023 - Present) — Spearheaded the frontend architecture for cloud analytics dashboard serving 100k+ active users.',
                        'Full Stack Developer at StudioNova (2021 - 2023) — Built responsive client portals and interactive portfolio platforms with modern web standards.'
                    ],
                socialLinks: {
                    GitHub: 'https://github.com',
                    LinkedIn: 'https://linkedin.com',
                    Twitter: 'https://twitter.com',
                    Portfolio: 'https://hulma.app'
                }
            },
            projects: [
                {
                    name: 'DevFlow Workflow Tool',
                    description: 'AI-assisted developer productivity dashboard with real-time analytics and task tracking.',
                    link: 'https://github.com',
                    tech: ['React', 'FastAPI', 'Tailwind']
                },
                {
                    name: 'Nova Design System',
                    description: 'Comprehensive component library and design token system built for cross-platform apps.',
                    link: 'https://github.com',
                    tech: ['TypeScript', 'Storybook', 'Figma']
                },
                {
                    name: 'Pulse Health Metrics',
                    description: 'Interactive telemetry and wellness monitoring platform featuring live charts and data insights.',
                    link: 'https://github.com',
                    tech: ['Node.js', 'PostgreSQL', 'Charts']
                }
            ]
        }
    }, [displayName, emailAddress])

    useEffect(() => {
        if (!previewOpen) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') setPreviewOpen(false)
        }
        document.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [previewOpen])

    const choose = (id) => {
        setSelected(id)
        if (user?.id) {
            try {
                localStorage.setItem(`hulma-template:${user.id}`, id)
            } catch {}
        }
    }

    const openPreview = (id) => {
        setPreviewTemplate(id)
        setPreviewOpen(true)
    }

    const continueToCreate = () => {
        if (!current) return
        if (user?.id) {
            try {
                localStorage.setItem(`hulma-template:${user.id}`, current.id)
            } catch {}
        }
        navigate(`/portfolio/create?template=${current.id}`)
    }

    return (
        <DashboardLayout userName={displayName} email={emailAddress} subtitle="Pick a layout for your portfolio">
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Choose a template</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Select the layout you want. You can change it anytime.</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                    <Clock size={13} /> 3 templates available
                </span>
            </div>

            <div role="radiogroup" aria-label="Portfolio templates" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map(({ id, num, name, Icon, text, tags, Preview }) => {
                    const isSelected = selected === id
                    return (
                        <article
                            key={id}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onClick={() => choose(id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    choose(id)
                                }
                            }}
                            className={`group flex cursor-pointer flex-col rounded-2xl bg-white p-4 outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(30,70,140,0.18)] focus-visible:ring-2 focus-visible:ring-[#1f6fdc] ${isSelected
                                    ? 'shadow-[0_8px_24px_rgba(31,111,220,0.22)] ring-2 ring-[#1f6fdc]'
                                    : 'shadow-[0_2px_10px_rgba(30,70,140,0.10)]'
                                }`}
                        >
                            <div className="relative h-44 overflow-hidden rounded-xl bg-[#f3f6fb] p-2 sm:h-48">
                                <div className="h-full origin-center transition-transform duration-500 group-hover:scale-[1.04]">
                                    <Preview />
                                </div>
                                <span
                                    className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[#1f6fdc] text-white shadow-md transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                                        }`}
                                >
                                    <Check size={16} strokeWidth={3} />
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        openPreview(id)
                                    }}
                                    className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-xs transition hover:bg-slate-900 active:scale-95"
                                >
                                    <Eye size={12} /> Live preview
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-2.5">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dce9fb] text-[#1f6fdc] transition-transform duration-200 group-hover:scale-110">
                                    <Icon size={17} />
                                </span>
                                <div className="min-w-0">
                                    <span className="inline-block rounded-full bg-[#eef2f9] px-2 py-0.5 text-[10px] font-medium text-slate-600">{num}</span>
                                    <h4 className="text-lg font-semibold leading-tight">{name}</h4>
                                </div>
                            </div>

                            <p className="mt-3 text-[13px] leading-snug text-slate-500">{text}</p>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-[#f3f6fb] px-2.5 py-0.5 text-[11px] text-slate-600">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        choose(id)
                                    }}
                                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition duration-200 active:scale-95 ${isSelected
                                            ? 'bg-[#1f6fdc] text-white hover:bg-[#1558c4]'
                                            : 'border border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc]'
                                        }`}
                                >
                                    {isSelected ? (
                                        <>
                                            <Check size={16} /> Selected
                                        </>
                                    ) : (
                                        'Select'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        openPreview(id)
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:border-blue-200 hover:text-[#1f6fdc] active:scale-95"
                                    title={`Preview ${name} template`}
                                >
                                    <Eye size={15} /> Preview
                                </button>
                            </div>
                        </article>
                    )
                })}
            </div>

            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:flex-row sm:items-center sm:p-5">
                <div className="min-w-0">
                    <strong className="block text-base font-semibold sm:text-lg">
                        {current ? `${current.num} – ${current.name} selected` : 'No template selected yet'}
                    </strong>
                    <p className="mt-0.5 text-sm text-[#bcd7f6]">
                        {current ? current.text : 'Pick one of the three templates above to continue.'}
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={() => openPreview(selected || 'simple')}
                        className="inline-flex w-full sm:w-auto justify-center shrink-0 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-medium text-white transition duration-200 hover:bg-white/20 active:scale-95"
                    >
                        <Eye size={16} /> Preview looks
                    </button>
                    <button
                        type="button"
                        disabled={!current}
                        onClick={continueToCreate}
                        className="inline-flex w-full sm:w-auto justify-center shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-5 py-3 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        Continue <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            {previewOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-6 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Template live preview"
                    onClick={() => setPreviewOpen(false)}
                >
                    <div
                        className="flex h-full max-h-[96vh] sm:max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#1f6fdc]">
                                    <Eye size={18} />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-semibold text-slate-900">
                                            {previewTemplateConfig?.name} Template
                                        </h4>
                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                            {previewTemplateConfig?.num}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Live preview of portfolio looks and layout
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setPreviewTemplate(t.id)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                            previewTemplate === t.id
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        choose(previewTemplate)
                                        setPreviewOpen(false)
                                        navigate(`/portfolio/create?template=${previewTemplate}`)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f6fdc] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1558c4] active:scale-95"
                                >
                                    <Check size={14} /> Use this template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    aria-label="Close preview"
                                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <PortfolioSite
                                portfolio={samplePortfolio}
                                template={previewTemplate}
                                idPrefix="tpl-preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import {
    Sparkles,
    Clock,
    CheckCircle2,
    Eye,
    FileText,
    PenLine,
    Link2,
    Plus,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

const HERO_STATS = [
    { label: 'Templates', value: '3 ready' },
    { label: 'Sections', value: '12 built-in' },
    { label: 'AI review', value: 'Instant feedback' },
]

const readPortfolioState = () => {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.localStorage.getItem('hulmaPortfolio')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

const TONES = {
    blue: 'bg-[#dce9fb] text-[#1f6fdc]',
    green: 'bg-[#dcf3e7] text-[#12875a]',
    orange: 'bg-[#fde6d8] text-[#e0561b]',
}

const card =
    'rounded-2xl bg-white p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(30,70,140,0.18)]'
const glass = 'border border-white/40 bg-white/15 backdrop-blur-sm transition duration-200 hover:bg-white/25'
const pillBtn =
    'shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95 sm:px-3.5'
const bluePill =
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#dce9fb] px-2.5 py-1 text-[11px] font-medium text-[#1f6fdc] transition duration-200 hover:scale-105 hover:bg-[#cfe0fa] sm:px-3 sm:text-xs'

function Row({ Icon, tone, title, text, right }) {
    return (
        <li className="group flex items-center gap-2.5 rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:translate-x-1 hover:bg-[#e8effa] sm:gap-3 sm:px-3 sm:py-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 sm:h-9 sm:w-9 ${TONES[tone]}`}>
                <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm">{title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">{text}</p>
            </div>
            {right}
        </li>
    )
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, isLoaded } = useUser()
    const portfolio = readPortfolioState()

    const displayName = user?.fullName || user?.firstName || user?.username || 'User'
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'
    const hasPortfolio = Boolean(portfolio && (portfolio.sections?.length || portfolio.projects?.length || portfolio.title || portfolio.summary))

    const sectionCount = Number(portfolio?.sections?.length || 0)
    const projectCount = Number(portfolio?.projects?.length || 0)
    const completion = Number(portfolio?.completion || 0)
    const views = Number(portfolio?.views || 0)
    const lastUpdated = portfolio?.updatedAt ? new Date(portfolio.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'

    const ACTIVITY = [
        {
            Icon: FileText,
            tone: 'blue',
            title: hasPortfolio ? 'Portfolio updated' : 'No portfolio yet',
            text: hasPortfolio ? `${portfolio.title || 'Your portfolio'} was recently updated.` : 'Create your first portfolio to add projects and sections.',
            time: hasPortfolio ? lastUpdated : 'Not started',
        },
        {
            Icon: CheckCircle2,
            tone: 'green',
            title: hasPortfolio ? 'Portfolio ready for review' : 'Ready when you are',
            text: hasPortfolio ? 'Your portfolio is prepared for publishing and sharing.' : 'Start building to unlock review checks.',
            time: hasPortfolio ? 'Now' : 'Waiting',
        },
    ]

    const NEXT_STEPS = hasPortfolio
        ? [
            { Icon: PenLine, tone: 'blue', title: 'Review your portfolio headline', text: 'Make sure the opening message matches your strongest work.' },
            { Icon: CheckCircle2, tone: 'green', title: 'Check AI feedback', text: 'Review suggestions and refine the final draft.' },
            { Icon: Link2, tone: 'orange', title: 'Share your portfolio', text: 'Send the live version to hiring managers and peers.' },
        ]
        : [
            { Icon: PenLine, tone: 'blue', title: 'Create your portfolio', text: 'Start with a template and add your first projects.' },
            { Icon: CheckCircle2, tone: 'green', title: 'Add your sections', text: 'Include your story, projects, and skills.' },
            { Icon: Link2, tone: 'orange', title: 'Generate your draft', text: 'Publish your portfolio once it is ready.' },
        ]

    if (!isLoaded) {
        return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading dashboard...</div>
    }

    return (
        <DashboardLayout userName={displayName} email={emailAddress} subtitle={hasPortfolio ? `${sectionCount} sections · ${projectCount} projects` : 'No portfolio generated yet'}>
            <section className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:mt-5 sm:p-5 lg:grid-cols-[1.12fr_1fr] lg:gap-6 lg:pr-1">
                <div className="lg:pr-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                        <Sparkles size={13} /> AI-assisted portfolio builder
                    </span>

                    <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl lg:text-[30px]">Create your portfolio</h3>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                        Turn your skills, projects and experience into a professional portfolio
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3">
                        {HERO_STATS.map((s) => (
                            <div key={s.label} className={`rounded-xl px-3 py-2.5 hover:-translate-y-0.5 ${glass}`}>
                                <small className="block text-xs text-[#d3e5fa]">{s.label}</small>
                                <strong className="text-sm font-semibold">{s.value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/portfolio/create')}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 sm:px-5 sm:py-3"
                        >
                            Create Portfolio <Plus size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/templates')}
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium hover:-translate-y-0.5 active:scale-95 sm:px-5 sm:py-3 ${glass}`}
                        >
                            View templates
                        </button>
                    </div>
                </div>

                <div className="relative min-h-40 rounded-2xl border border-white/30 bg-white/10 p-3 transition duration-300 hover:bg-white/15 sm:p-4 lg:min-h-52">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <strong className="block text-sm font-semibold">Character art</strong>
                            <small className="text-xs text-[#d3e5fa]">Preview your portfolio hero</small>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${glass}`}>
                                <CheckCircle2 size={13} /> Hero ready
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${glass}`}>
                                <Sparkles size={13} /> Live preview
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-5 grid items-start gap-4 sm:mt-6 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                        <div>
                            <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Your Portfolio</h3>
                            <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Review, edit and publish your latest portfolio drafts</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                            <Clock size={13} /> Updated 2 min ago
                        </span>
                    </div>

                    {hasPortfolio ? (
                        <>
                            <article className={card}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="text-lg font-semibold leading-tight sm:text-xl">Portfolio Preview</h4>
                                        <p className="mt-0.5 text-xs text-slate-500">{portfolio.title || `${displayName}'s portfolio`} · {sectionCount} sections</p>
                                    </div>
                                    <span className={bluePill}>
                                        <CheckCircle2 size={13} /> {completion >= 100 ? 'Ready to publish' : 'In progress'}
                                    </span>
                                </div>

                                <div className="group relative mt-3 h-24 overflow-hidden rounded-xl bg-linear-to-r from-[#ece7da] to-[#d5dbe6] sm:h-28">
                                    <div className="absolute right-2 top-2 hidden origin-top-right gap-1.5 opacity-90 transition-transform duration-500 group-hover:scale-110 sm:flex">
                                        <div className="h-10 w-12 rounded-sm bg-[#1c3f9c] md:w-16" />
                                        <div className="h-14 w-14 rounded-sm bg-white shadow md:w-20" />
                                        <div className="h-12 w-10 rounded-sm bg-[#8fb0e6] md:w-14" />
                                        <div className="h-16 w-12 rounded-sm bg-[#cfd6e4] md:w-16" />
                                    </div>
                                    <span className="absolute left-2.5 top-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium shadow-sm sm:text-[11px]">
                                        <Sparkles size={12} className="text-[#1f6fdc]" /> Featured preview
                                    </span>
                                    <div className="absolute bottom-1.5 left-3 origin-bottom-left text-2xl font-black transition-transform duration-500 group-hover:scale-105 leading-[0.9] tracking-tight text-[#1c4fb5] sm:left-4 sm:text-[34px]">
                                        {portfolio.title ? portfolio.title.slice(0, 12).toUpperCase() : 'PORTFOLIO'}
                                    </div>
                                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-[#1c3f9c] transition-transform duration-300 hover:scale-110 px-3 py-1.5 text-[11px] font-medium text-white sm:right-3 sm:px-3.5 sm:py-2 sm:text-xs">
                                        <Eye size={14} /> {views} views
                                    </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                    <span className="rounded-full bg-[#eef2f9] px-2.5 py-0.5">{sectionCount} sections</span>
                                    <span className="rounded-full bg-[#eef2f9] px-2.5 py-0.5">{projectCount} projects</span>
                                    <span className="rounded-full bg-[#dcf3e7] px-2.5 py-0.5 text-[#12875a]">AI review</span>
                                    <span className="ml-auto text-xs text-slate-500">Last edited {lastUpdated}</span>
                                </div>
                            </article>

                            <article className={card}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="text-base font-semibold leading-tight sm:text-lg">Recent activity</h4>
                                        <p className="mt-0.5 text-xs text-slate-500">What changed in your portfolio</p>
                                    </div>
                                    <button className={pillBtn}>View all</button>
                                </div>
                                <ul className="mt-3 flex flex-col gap-2.5">
                                    {ACTIVITY.map((a) => (
                                        <Row key={a.title} {...a} right={<time className="shrink-0 text-[11px] text-slate-500 sm:text-xs">{a.time}</time>} />
                                    ))}
                                </ul>
                            </article>
                        </>
                    ) : (
                        <article className={card}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="text-lg font-semibold leading-tight sm:text-xl">No portfolio generated yet</h4>
                                    <p className="mt-0.5 text-xs text-slate-500">Create a portfolio to unlock your preview, stats, and review flow.</p>
                                </div>
                                <button onClick={() => navigate('/portfolio')} className={bluePill}>
                                    <Plus size={13} /> Create one
                                </button>
                            </div>
                        </article>
                    )}
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-1">
                    {hasPortfolio ? (
                        <>
                            <article className={card}>
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-base font-semibold sm:text-lg">Portfolio stats</h4>
                                    <span className={bluePill}>
                                        <Sparkles size={13} /> {completion >= 100 ? 'Ready' : 'Live'}
                                    </span>
                                </div>

                                <div className="my-3 grid grid-cols-3 gap-2">
                                    <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                        <small className="block text-xs text-slate-500">Views</small>
                                        <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">{views}</strong>
                                        <em className="text-[10px] not-italic leading-tight text-[#12875a] sm:text-[11px]">{views > 0 ? 'Tracked activity' : 'No views yet'}</em>
                                    </div>
                                    <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                        <small className="block text-xs text-slate-500">Sections</small>
                                        <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">{sectionCount}</strong>
                                        <em className="text-[10px] not-italic leading-tight text-[#1f6fdc] sm:text-[11px]">{sectionCount > 0 ? `${sectionCount} ready to review` : 'No sections yet'}</em>
                                    </div>
                                    <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                        <small className="block text-xs text-slate-500">Projects</small>
                                        <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">{projectCount}</strong>
                                        <em className="text-[10px] not-italic leading-tight text-[#e0561b] sm:text-[11px]">{projectCount > 0 ? `${projectCount} being shared` : 'No projects yet'}</em>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs">
                                        <span>Completion</span>
                                        <span>{completion}%</span>
                                    </div>
                                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#e1e8f4]">
                                        <div className="h-full rounded-full bg-[#1f6fdc]" style={{ width: `${Math.min(Math.max(completion, 0), 100)}%` }} />
                                    </div>
                                </div>
                            </article>

                            <article className={card}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h4 className="text-base font-semibold leading-tight sm:text-lg">Next steps</h4>
                                        <p className="mt-0.5 text-xs text-slate-500">Finish the sections that matter most</p>
                                    </div>
                                    <span className={bluePill}>
                                        <CheckCircle2 size={13} /> {NEXT_STEPS.length} tasks
                                    </span>
                                </div>
                                <ul className="mt-3 flex flex-col gap-2.5">
                                    {NEXT_STEPS.map((s) => (
                                        <Row key={s.title} {...s} right={<button className={pillBtn}>Open</button>} />
                                    ))}
                                </ul>
                            </article>
                        </>
                    ) : (
                        <article className={card}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h4 className="text-base font-semibold leading-tight sm:text-lg">Portfolio stats</h4>
                                    <p className="mt-0.5 text-xs text-slate-500">Stats appear after you create a portfolio.</p>
                                </div>
                                <button onClick={() => navigate('/portfolio')} className={bluePill}>
                                    <Plus size={13} /> Start
                                </button>
                            </div>
                        </article>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
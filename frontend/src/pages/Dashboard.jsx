import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import {
    Sparkles,
    Clock,
    CheckCircle2,
    FileText,
    PenLine,
    Link2,
    Plus,
    UserRound,
    Layers,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import PortfolioReviewCard from '../components/PortfolioReviewCard'
import PortfolioModal from '../components/PortfolioModal'
import PortfolioHeroDisplay from '../components/PortfolioHeroDisplay'

const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== '')

const toText = (x) => (typeof x === 'string' ? x : pick(x?.name, x?.title, x?.label, '') )

const isFilled = (v) => {
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0
    if (typeof v === 'string') return v.trim().length > 0
    return Boolean(v)
}

const safeStorageGet = (key) => {
    try {
        return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
    } catch {
        return null
    }
}

const readLocalPortfolio = () => {
    try {
        const raw = safeStorageGet('hulmaPortfolio')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

const normalizePortfolio = (raw) => {
    if (!raw) return null
    let p = Array.isArray(raw) ? raw[0] : raw
    p = p?.portfolio || p?.data || p
    if (!p || typeof p !== 'object') return null

    let sections = p.sections || p.content || {}
    if (Array.isArray(sections)) {
        sections = sections.reduce((acc, s, i) => {
            acc[pick(s?.key, s?.type, s?.id, s?.name, `section${i}`)] = pick(s?.content, s?.data, s)
            return acc
        }, {})
    }

    const profile = sections.profile || sections.about || {}
    const projectsRaw = pick(
        Array.isArray(p.projects) ? p.projects : undefined,
        Array.isArray(sections.projects) ? sections.projects : undefined,
        sections.projects?.items,
        [],
    )

    return {
        ...p,
        sections,
        profile,
        projects: projectsRaw,
        title: pick(p.title, p.name, profile.headline, profile.fullName, profile.name),
        summary: pick(
            p.summary,
            p.description,
            profile.summary,
            profile.bio,
            typeof sections.about === 'string' ? sections.about : undefined,
        ),
        picture: pick(profile.profilePicture, profile.avatar, profile.image, p.profilePicture, p.avatar),
        template: pick(sections.meta?.templateId, p.template, p.templateId, p.template_id, safeStorageGet('hulma-template')),
        skills: (Array.isArray(sections.skills) ? sections.skills : sections.skills?.items || [])
            .map(toText)
            .filter(Boolean),
        updatedAt: pick(p.updated_at, p.updatedAt),
        createdAt: pick(p.created_at, p.createdAt),
        publishedAt: pick(p.published_at, p.publishedAt),
        isPublished: Boolean(pick(p.published, p.isPublished, p.published_at, p.publishedAt)),
    }
}

const hasContent = (p) =>
    Boolean(p && (p.title || p.summary || p.projects.length || Object.values(p.sections).some(isFilled)))

const relativeTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
    if (Math.abs(diffMin) < 1) return 'Just now'
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute')
    const diffHr = Math.round(diffMin / 60)
    if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour')
    const diffDay = Math.round(diffHr / 24)
    if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, 'day')
    return rtf.format(-Math.round(diffDay / 30), 'month')
}

const titleCase = (s) => (s ? String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '')

const reviewInfo = (review) => {
    if (!review) return { label: 'Not run yet', summary: '' }
    if (typeof review === 'string') return { label: 'Completed', summary: review }
    const score = pick(review.score, review.rating)
    return {
        label: score !== undefined ? `Score ${score}` : 'Completed',
        summary: pick(review.summary, review.feedback, review.overview, ''),
        suggestions: Array.isArray(review.suggestions) ? review.suggestions.map(toText).filter(Boolean) : [],
    }
}

const buildChecklist = (p, sectionCount) => [
    { key: 'title', done: Boolean(p.title), Icon: PenLine, tone: 'blue', title: 'Add your headline', text: 'Give your portfolio a title that matches your strongest work.', route: '/portfolio/create' },
    { key: 'summary', done: Boolean(p.summary), Icon: FileText, tone: 'blue', title: 'Write your summary', text: 'Tell visitors who you are in a few sentences.', route: '/portfolio/create' },
    { key: 'picture', done: Boolean(p.picture), Icon: UserRound, tone: 'orange', title: 'Upload a profile picture', text: 'A photo makes your portfolio feel personal.', route: '/portfolio/create' },
    { key: 'projects', done: p.projects.length > 0, Icon: Layers, tone: 'orange', title: 'Add a project', text: 'Showcase at least one piece of work.', route: '/portfolio/create' },
    { key: 'sections', done: sectionCount >= 3, Icon: PenLine, tone: 'blue', title: 'Fill in more sections', text: 'Add skills, experience or education.', route: '/portfolio/create' },
    { key: 'review', done: Boolean(p.review), Icon: CheckCircle2, tone: 'green', title: 'Run the AI review', text: 'Get feedback and refine your draft.', route: '/portfolio' },
]

const buildActivity = (p) => {
    if (Array.isArray(p.activity) && p.activity.length) {
        return p.activity
            .map((a, i) => ({
                id: a.id ?? `activity-${i}`,
                Icon: FileText,
                tone: 'blue',
                title: pick(a.title, a.action, a.type, 'Portfolio activity'),
                text: pick(a.text, a.description, a.message, ''),
                date: pick(a.created_at, a.createdAt, a.date, a.time),
            }))
    }

    const items = []
    if (p.updatedAt) items.push({ id: 'updated', Icon: FileText, tone: 'blue', title: 'Portfolio updated', text: `${p.title || 'Your portfolio'} was saved.`, date: p.updatedAt })
    if (p.createdAt) items.push({ id: 'created', Icon: Plus, tone: 'orange', title: 'Portfolio created', text: `You started ${p.title || 'your portfolio'}.`, date: p.createdAt })
    if (p.publishedAt) items.push({ id: 'published', Icon: Link2, tone: 'green', title: 'Portfolio published', text: 'Your portfolio is live.', date: p.publishedAt })
    if (p.review) {
        items.push({ id: 'review', Icon: CheckCircle2, tone: 'green', title: 'AI review completed', text: reviewInfo(p.review).summary || 'Feedback is ready for you.', date: pick(p.review?.created_at, p.review?.createdAt, p.reviewed_at, p.reviewedAt, p.updatedAt) })
    }
    p.projects.forEach((proj, i) => {
        items.push({
            id: `project-${proj?.id ?? i}`,
            Icon: Layers,
            tone: 'blue',
            title: `Project: ${toText(proj) || `Untitled ${i + 1}`}`,
            text: pick(proj?.description, proj?.summary, 'Included in your portfolio.'),
            date: pick(proj?.updated_at, proj?.updatedAt, proj?.created_at, proj?.createdAt),
        })
    })

    return items.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0))
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
                <p className="truncate text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm">{title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 sm:text-xs">{text}</p>
            </div>
            {right}
        </li>
    )
}

const ACTIVITY_PREVIEW_COUNT = 3

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, isLoaded } = useUser()
    const { portfolio: rawPortfolio, loading, error: fetchError, refetch } = usePortfolio()
    const [showAllActivity, setShowAllActivity] = useState(false)
    const [showPortfolio, setShowPortfolio] = useState(false)
    const [localDraft, setLocalDraft] = useState(null)
    const [heroIndex, setHeroIndex] = useState(0)

    useEffect(() => { setLocalDraft(readLocalPortfolio()) }, [rawPortfolio])

    const { portfolio: basePortfolio, source } = useMemo(() => {
        const fromBackend = normalizePortfolio(rawPortfolio)
        if (hasContent(fromBackend)) return { portfolio: fromBackend, source: 'backend' }
        const fromLocal = normalizePortfolio(localDraft)
        if (hasContent(fromLocal)) return { portfolio: fromLocal, source: 'local' }
        return { portfolio: fromBackend, source: 'none' }
    }, [rawPortfolio, localDraft])

    const heroList = useMemo(() => {
        const list = Array.isArray(rawPortfolio) ? rawPortfolio : Array.isArray(rawPortfolio?.portfolios) ? rawPortfolio.portfolios : null
        const items = list ? list.map(normalizePortfolio).filter(hasContent) : []
        return items.length ? items : basePortfolio ? [basePortfolio] : []
    }, [rawPortfolio, basePortfolio])

    const portfolio = heroList[Math.min(heroIndex, heroList.length - 1)] || basePortfolio
    const activeTemplate = portfolio?.sections?.meta?.templateId || portfolio?.template
    const editUrl = activeTemplate ? `/portfolio/create?template=${activeTemplate}` : '/portfolio/create'

    const displayName = user?.fullName || user?.firstName || user?.username || 'User'
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'

    const hasPortfolio = hasContent(portfolio)

    const derived = useMemo(() => {
        if (!hasPortfolio) return null
        const sectionCount = Object.entries(portfolio.sections).filter(([k, v]) => k !== 'meta' && isFilled(v)).length
        const projectCount = portfolio.projects.length
        const checklist = buildChecklist(portfolio, sectionCount)
        const doneCount = checklist.filter((c) => c.done).length
        const backendCompletion = pick(portfolio.completion, portfolio.completion_percentage)
        const completion = Math.min(
            100,
            Math.max(0, Math.round(Number.isFinite(Number(backendCompletion)) && backendCompletion !== undefined
                ? Number(backendCompletion)
                : (doneCount / checklist.length) * 100)),
        )
        const pending = checklist.filter((c) => !c.done)
        const nextSteps = pending.length
            ? pending.slice(0, 4)
            : [{ key: 'share', Icon: Link2, tone: 'orange', title: portfolio.isPublished ? 'Share your portfolio' : 'Publish your portfolio', text: 'Send the live version to hiring managers and peers.', route: '/portfolio' }]
        return {
            sectionCount,
            projectCount,
            completion,
            nextSteps,
            activity: buildActivity(portfolio),
            review: reviewInfo(portfolio.review),
            views: Number(portfolio.views || 0),
            lastUpdated: relativeTime(portfolio.updatedAt) || 'recently',
            statusText: portfolio.isPublished ? 'Published' : completion >= 100 ? 'Ready to publish' : completion > 0 ? 'In progress' : 'Draft',
            templateLabel: titleCase(portfolio.template) || 'Not chosen',
        }
    }, [portfolio, hasPortfolio])

    if (!isLoaded) {
        return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading dashboard...</div>
    }

    if (loading) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="Loading portfolio...">
                <div className="mt-5">
                    <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (fetchError && !hasPortfolio) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="Error loading portfolio">
                <div className="mt-5 rounded-2xl bg-red-50 p-6 text-red-700 shadow">
                    <p className="font-medium">{String(fetchError?.message || fetchError)}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 rounded-xl bg-[#1f6fdc] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558c4]"
                    >
                        Retry
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    if (!hasPortfolio) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="No portfolio generated yet">
                <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-6">
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h4 className="text-lg font-semibold leading-tight">Create your first portfolio</h4>
                            <p className="mt-1 text-xs text-slate-500">Start with a template and add your first projects.</p>
                        </div>
                        <button onClick={() => navigate('/portfolio/create')} className="inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#1558c4]">
                            Create Portfolio <Plus size={16} />
                        </button>
                    </div>
                </section>
            </DashboardLayout>
        )
    }

    const { sectionCount, projectCount, completion, nextSteps, activity, review, views, lastUpdated, statusText, templateLabel } = derived
    const projectLabel = projectCount === 1 ? '1 project' : `${projectCount} projects`
    const visibleActivity = showAllActivity ? activity : activity.slice(0, ACTIVITY_PREVIEW_COUNT)
    const firstName = user?.firstName || displayName.split(' ')[0]

    const heroStats = [
        { label: 'Template', value: templateLabel },
        { label: 'Sections', value: `${sectionCount} filled` },
        { label: 'AI review', value: review.label },
    ]

    const previewTitle = portfolio.title || 'Untitled portfolio'

    return (
        <DashboardLayout userName={displayName} email={emailAddress} subtitle={`${sectionCount} sections · ${projectLabel}`}>
            <section className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:mt-5 sm:p-5 lg:grid-cols-[1.12fr_1fr] lg:gap-6 lg:pr-1">
                <div className="lg:pr-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                        <Sparkles size={13} /> AI-assisted portfolio builder
                    </span>

                    <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl lg:text-[30px]">Welcome back, {firstName}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                        {completion >= 100
                            ? 'Your portfolio is complete. Publish it and share it.'
                            : `Your portfolio is ${completion}% complete. Pick up where you left off.`}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-3">
                        {heroStats.map((s) => (
                            <div key={s.label} className={`rounded-xl px-3 py-2.5 hover:-translate-y-0.5 ${glass}`}>
                                <small className="block text-xs text-[#d3e5fa]">{s.label}</small>
                                <strong className="text-sm font-semibold">{s.value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate(editUrl)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 sm:px-5 sm:py-3"
                        >
                            Edit portfolio <PenLine size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/templates')}
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium hover:-translate-y-0.5 active:scale-95 sm:px-5 sm:py-3 ${glass}`}
                        >
                            View templates
                        </button>
                    </div>
                </div>

                <PortfolioHeroDisplay portfolios={heroList} index={heroIndex} onIndexChange={setHeroIndex} />
            </section>

            <div className="mt-5 grid items-start gap-4 sm:mt-6 lg:grid-cols-[1.6fr_1fr] lg:gap-5">
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
                        <div>
                            <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Your Portfolio</h3>
                            <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Review, edit and publish your latest portfolio drafts</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                            <Clock size={13} /> Updated {lastUpdated}
                        </span>
                    </div>

                    {source === 'local' && (
                        <p className="rounded-xl bg-[#fde6d8] px-3 py-2 text-xs text-[#a8400f]">
                            Showing a draft saved on this device. It has not been found on your account yet.
                        </p>
                    )}

                    <PortfolioReviewCard
                        portfolio={portfolio}
                        review={review}
                        completion={completion}
                        views={views}
                        statusText={statusText}
                        templateLabel={templateLabel}
                        lastUpdated={lastUpdated}
                        sectionCount={sectionCount}
                        onOpen={() => setShowPortfolio(true)}
                        onEdit={() => navigate(editUrl)}
                    />

                    <article className={card}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="text-base font-semibold leading-tight sm:text-lg">Recent activity</h4>
                                <p className="mt-0.5 text-xs text-slate-500">What changed in your portfolio</p>
                            </div>
                            {activity.length > ACTIVITY_PREVIEW_COUNT && (
                                <button
                                    className={pillBtn}
                                    aria-expanded={showAllActivity}
                                    onClick={() => setShowAllActivity((v) => !v)}
                                >
                                    {showAllActivity ? 'Show less' : `View all (${activity.length})`}
                                </button>
                            )}
                        </div>
                        {activity.length === 0 ? (
                            <p className="mt-3 rounded-xl bg-[#f3f6fb] px-3 py-3 text-xs text-slate-500">No activity yet. Edit your portfolio to see changes here.</p>
                        ) : (
                            <ul className="mt-3 flex flex-col gap-2.5">
                                {visibleActivity.map((a) => (
                                    <Row
                                        key={a.id}
                                        Icon={a.Icon}
                                        tone={a.tone}
                                        title={a.title}
                                        text={a.text}
                                        right={<time className="shrink-0 text-[11px] text-slate-500 sm:text-xs">{relativeTime(a.date)}</time>}
                                    />
                                ))}
                            </ul>
                        )}
                    </article>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-1">
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
                                <em className="text-[10px] not-italic leading-tight text-[#1f6fdc] sm:text-[11px]">{sectionCount > 0 ? `${sectionCount} filled in` : 'No sections yet'}</em>
                            </div>
                            <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                <small className="block text-xs text-slate-500">Projects</small>
                                <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">{projectCount}</strong>
                                <em className="text-[10px] not-italic leading-tight text-[#e0561b] sm:text-[11px]">{projectCount > 0 ? 'In your portfolio' : 'No projects yet'}</em>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs">
                                <span>Completion</span>
                                <span>{completion}%</span>
                            </div>
                            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#e1e8f4]">
                                <div className="h-full rounded-full bg-[#1f6fdc] transition-all duration-500" style={{ width: `${completion}%` }} />
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
                                <CheckCircle2 size={13} /> {nextSteps.length} {nextSteps.length === 1 ? 'task' : 'tasks'}
                            </span>
                        </div>
                        <ul className="mt-3 flex flex-col gap-2.5">
                            {nextSteps.map((s) => (
                                <Row
                                    key={s.key}
                                    Icon={s.Icon}
                                    tone={s.tone}
                                    title={s.title}
                                    text={s.text}
                                    right={<button className={pillBtn} onClick={() => navigate(s.route === '/portfolio/create' ? editUrl : s.route)}>Open</button>}
                                />
                            ))}
                        </ul>
                    </article>
                </div>
            </div>
        <PortfolioModal
                portfolio={portfolio}
                open={showPortfolio}
                onClose={() => setShowPortfolio(false)}
                onEdit={() => navigate(editUrl)}
            />
        </DashboardLayout>
    )
}
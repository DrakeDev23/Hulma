import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import {
    Sparkles,
    Clock,
    Lock,
    CheckCircle2,
    LayoutGrid,
    Palette,
    Type,
    FileText,
    RefreshCw,
    Lightbulb,
    AlertCircle,
    ArrowRight,
    Check,
    Plus,
    Briefcase,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { resolveDisplayName } from '../utils/portfolioUtils'
import { apiUrl } from '../utils/api'

const TEMPLATE_KEY = 'hulma-template'

const TONES = {
    blue: 'bg-[#dce9fb] text-[#1f6fdc]',
    green: 'bg-[#dcf3e7] text-[#12875a]',
    orange: 'bg-[#fde6d8] text-[#e0561b]',
}

const PRIORITY = {
    high: { label: 'High impact', tone: 'orange' },
    medium: { label: 'Medium', tone: 'blue' },
    low: { label: 'Quick win', tone: 'green' },
}

const CATEGORY_ICONS = {
    template: LayoutGrid,
    layout: FileText,
    design: Palette,
    content: Type,
}

const card =
    'rounded-2xl bg-white p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(30,70,140,0.18)]'
const glass = 'border border-white/40 bg-white/15 backdrop-blur-sm transition duration-200 hover:bg-white/25'
const bluePill =
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#dce9fb] px-2.5 py-1 text-[11px] font-medium text-[#1f6fdc] sm:px-3 sm:text-xs'

const TEMPLATE_NAMES = { simple: 'Simple', modern: 'Modern', creative: 'Creative' }

function readTemplate(userId) {
    try {
        if (userId) {
            const userTemplate = localStorage.getItem(`hulma-template:${userId}`)
            if (userTemplate) return userTemplate
        }
        return 'simple'
    } catch {
        return 'simple'
    }
}

function ScoreRing({ value }) {
    const r = 42
    const c = 2 * Math.PI * r
    return (
        <div className="relative grid h-28 w-28 shrink-0 place-items-center sm:h-32 sm:w-32">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - (value || 0) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <div className="absolute text-center">
                <strong className="block text-3xl font-semibold leading-none sm:text-4xl">{value ?? 0}</strong>
                <small className="text-[11px] text-[#d3e5fa]">out of 100</small>
            </div>
        </div>
    )
}

function normalizeReview(raw) {
    if (!raw) return null
    const score = Number.isFinite(Number(raw.score)) ? Number(raw.score) : 0
    const summary = raw.summary || ''

    const rawCats = Array.isArray(raw.categories) ? raw.categories : []
    const categories = rawCats.map((c) => ({
        key: c.key || 'template',
        label: c.label || 'Category',
        score: Number.isFinite(Number(c.score)) ? Number(c.score) : score,
        note: c.note || '',
    }))

    const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : []).map((s, i) => {
        if (typeof s === 'object' && s !== null) {
            return {
                id: s.id || `s${i + 1}`,
                category: s.category || 'content',
                priority: s.priority || 'medium',
                title: s.title || s.name || 'Suggestion',
                text: s.text || s.description || s.summary || '',
            }
        }
        return {
            id: `s${i + 1}`,
            category: 'content',
            priority: 'medium',
            title: String(s),
            text: String(s),
        }
    })

    return {
        score,
        summary,
        categories,
        suggestions,
    }
}

export default function Review() {
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const { user } = useUser()
    const template = readTemplate(user?.id)
    const templateName = TEMPLATE_NAMES[template]

    const userName = resolveDisplayName(user, '')
    const email = user?.primaryEmailAddress?.emailAddress || ''

    const userId = user?.id
    const userSettings = useMemo(() => {
        if (!userId) return {}
        try {
            const raw = localStorage.getItem(`hulma-settings:${userId}`)
            return raw ? JSON.parse(raw) : {}
        } catch {
            return {}
        }
    }, [userId])

    const activeTone = userSettings.tone || 'balanced'
    const activeFocus = Array.isArray(userSettings.focus) && userSettings.focus.length > 0
        ? userSettings.focus
        : ['template', 'layout', 'design', 'content']

    const [status, setStatus] = useState('loading')
    const [result, setResult] = useState(null)
    const [activePortfolio, setActivePortfolio] = useState(null)
    const [hasPortfolio, setHasPortfolio] = useState(false)
    const [reviewError, setReviewError] = useState('')
    const [done, setDone] = useState({})
    const [reviewLimits, setReviewLimits] = useState({
        remaining: 5,
        maxPerWindow: 5,
        dailyRemaining: 5,
        maxPerDay: 5,
        isPenaltyActive: false,
    })
    const [lockedUntil, setLockedUntil] = useState(null)

    function formatUnlockDay(targetDateOrSecs) {
        if (!targetDateOrSecs) return 'Available later'
        const target = typeof targetDateOrSecs === 'number'
            ? new Date(Date.now() + targetDateOrSecs * 1000)
            : new Date(targetDateOrSecs)
        if (isNaN(target.getTime())) return 'Available later'

        const now = new Date()
        const isToday = target.toDateString() === now.toDateString()
        const tomorrow = new Date(now)
        tomorrow.setDate(now.getDate() + 1)
        const isTomorrow = target.toDateString() === tomorrow.toDateString()

        const timeStr = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\u202f/g, ' ')

        if (isToday) {
            return `Available today at ${timeStr}`
        }
        if (isTomorrow) {
            return `Available tomorrow at ${timeStr}`
        }
        const weekday = target.toLocaleDateString('en-US', { weekday: 'long' })
        return `Available ${weekday} at ${timeStr}`
    }

    const fetchReviewStatus = async () => {
        try {
            const token = await getToken()
            if (!token) return
            const res = await fetch(apiUrl('/api/ai-review/status'), {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return
            const data = await res.json()
            const rem = data.remaining_uses !== undefined ? data.remaining_uses : data.remaining
            setReviewLimits({
                remaining: rem,
                maxPerWindow: data.max_per_window ?? data.max_reviews_per_window ?? 5,
                dailyRemaining: data.daily_remaining,
                maxPerDay: data.max_daily ?? data.max_reviews_per_day ?? 25,
                isPenaltyActive: !!data.is_penalty_active,
            })
            if (data.locked_until) {
                setLockedUntil(data.locked_until)
            } else if (data.retry_after_seconds > 0 || rem <= 0) {
                const secs = data.retry_after_seconds > 0 ? data.retry_after_seconds : 18000
                setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
            } else {
                setLockedUntil(null)
            }
        } catch {
            // Silently ignore network failures on background status query
        }
    }

    useEffect(() => {
        const handleSync = (e) => {
            if (e?.detail) {
                const rem = e.detail.remaining_uses !== undefined ? e.detail.remaining_uses : e.detail.remaining
                if (rem !== undefined) {
                    setReviewLimits((prev) => ({ ...prev, remaining: rem }))
                }
                if (e.detail.locked_until) {
                    setLockedUntil(e.detail.locked_until)
                } else if (e.detail.retry_after_seconds > 0 || rem <= 0) {
                    const secs = e.detail.retry_after_seconds > 0 ? e.detail.retry_after_seconds : 18000
                    setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
                }
            }
            fetchReviewStatus()
        }
        window.addEventListener('hulma:ai-usage-updated', handleSync)
        return () => window.removeEventListener('hulma:ai-usage-updated', handleSync)
    }, [])

    useEffect(() => {
        if (!lockedUntil) return
        const msUntilReset = new Date(lockedUntil).getTime() - Date.now()
        if (msUntilReset <= 0) {
            fetchReviewStatus()
            return
        }
        const timer = setTimeout(() => {
            fetchReviewStatus()
        }, msUntilReset + 500)
        return () => clearTimeout(timer)
    }, [lockedUntil])

    useEffect(() => {
        let cancelled = false
        const loadExisting = async () => {
            setStatus('loading')
            setReviewError('')
            try {
                const token = await getToken()
                const res = await fetch(apiUrl('/api/portfolio/me'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) throw new Error('Could not load portfolio data.')
                const data = await res.json()
                if (cancelled) return

                const list = Array.isArray(data) ? data : data ? [data] : []
                if (list.length > 0) {
                    const p = (template ? list.find((item) => item.sections?.meta?.templateId === template) : null) || list[0]
                    setActivePortfolio(p)
                    setHasPortfolio(true)
                    if (p?.review && (p.review.summary || p.review.score)) {
                        setResult(normalizeReview(p.review))
                        setStatus('done')
                    } else {
                        setStatus('idle')
                    }
                } else {
                    setHasPortfolio(false)
                    setActivePortfolio(null)
                    setResult(null)
                    setStatus('no_portfolio')
                }
            } catch (err) {
                if (cancelled) return
                setStatus('error')
                setReviewError(err?.message || 'Failed to check portfolio status.')
            }
        }
        loadExisting()
        fetchReviewStatus()
        return () => {
            cancelled = true
        }
    }, [getToken, template])

    const runReview = async () => {
        if (!hasPortfolio || !activePortfolio) {
            setStatus('no_portfolio')
            setReviewError('No portfolio found to review. Please create a portfolio first.')
            return
        }

        if (isLimitReached) {
            setReviewError(`You hit 5 trials, please come back later. ${availableSubtext}`)
            return
        }

        const sections = activePortfolio.sections || {}
        const profile = sections.profile || {}
        const hasContent = Boolean(
            (activePortfolio.summary && activePortfolio.summary.trim().length > 5) ||
            (activePortfolio.projects && activePortfolio.projects.length > 0) ||
            (profile.fullName && profile.fullName.trim().length > 1) ||
            (profile.aboutMe && profile.aboutMe.trim().length > 5) ||
            (sections.skills && sections.skills.length > 0) ||
            (sections.workExperience && sections.workExperience.length > 0) ||
            (sections.education && sections.education.length > 0)
        )

        if (!hasContent) {
            setReviewError('Your portfolio has no content yet. Please add your bio, skills, or projects before requesting an AI review.')
            return
        }

        setStatus('reviewing')
        setReviewError('')
        setDone({})
        try {
            const token = await getToken()
            const bodyPayload = { ...activePortfolio }
            const queryParam = activePortfolio?.id ? `?portfolio_id=${activePortfolio.id}` : ''

            const res = await fetch(apiUrl(`/api/portfolio/review${queryParam}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(bodyPayload),
            })
            if (res.status === 429) {
                const errData = await res.json().catch(() => null)
                const retrySecs = errData?.retry_after_seconds ?? parseInt(res.headers.get('Retry-After') || '18000', 10)
                const lockedAt = errData?.locked_until || new Date(Date.now() + retrySecs * 1000).toISOString()
                setLockedUntil(lockedAt)
                setReviewLimits((prev) => ({
                    ...prev,
                    remaining: 0,
                    isPenaltyActive: !!errData?.is_penalty_active,
                }))
                setReviewError(`You hit 5 trials, please come back later. ${formatUnlockDay(lockedAt)}`)
                setStatus(result ? 'done' : 'idle')
                fetchReviewStatus()
                window.dispatchEvent(new CustomEvent('hulma:ai-usage-updated', { detail: { remaining: 0, locked_until: lockedAt, retry_after_seconds: retrySecs } }))
                return
            }
            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || 'AI review request failed.')
            }
            const data = await res.json()
            const rem = data.remaining_uses !== undefined ? data.remaining_uses : data.remaining
            if (rem !== undefined) {
                setReviewLimits((prev) => ({
                    ...prev,
                    remaining: rem,
                    dailyRemaining: data.daily_remaining ?? prev.dailyRemaining,
                }))
                if (data.locked_until) {
                    setLockedUntil(data.locked_until)
                } else if (data.retry_after_seconds > 0 || rem <= 0) {
                    const secs = data.retry_after_seconds > 0 ? data.retry_after_seconds : 18000
                    setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
                } else {
                    setLockedUntil(null)
                }
            }
            fetchReviewStatus()
            window.dispatchEvent(new CustomEvent('hulma:ai-usage-updated', { detail: data }))
            setResult(normalizeReview(data))
            setStatus('done')
        } catch (err) {
            setReviewError(err?.message || 'Review service encountered an error. Please try again.')
            setStatus(result ? 'done' : 'error')
        }
    }

    const toggleDone = (id) => setDone((d) => ({ ...d, [id]: !d[id] }))
    const doneCount = result ? result.suggestions.filter((s) => done[s.id]).length : 0
    const isLimitReached = reviewLimits.remaining <= 0 || (lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false)
    const availableSubtext = formatUnlockDay(lockedUntil)

    return (
        <DashboardLayout
            userName={userName}
            email={email}
            eyebrow="Almost there, {name}"
            title={
                <>
                    <span className="text-[#1d6fe0]">Get feedback</span> and <span className="text-[#2020d0]">polish</span> your portfolio
                </>
            }
            subtitle="Design and layout feedback for your portfolio"
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">AI Review</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
                        Get feedback on your template, design and format, with suggestions to improve.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Tone: <strong className="font-semibold text-slate-700 capitalize">{activeTone}</strong></span>
                        <span>•</span>
                        <span>Focus: <strong className="font-semibold text-slate-700">{activeFocus.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}</strong></span>
                        <span>•</span>
                        <Link to="/settings" className="font-medium text-[#1f6fdc] hover:underline">
                            Change in Settings
                        </Link>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {reviewLimits.remaining === 0 || isLimitReached ? (
                        <span
                            title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 cursor-default"
                        >
                            <Sparkles size={13} /> 5 of 5 used (0 reviews left)
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#1f6fdc]">
                            <Sparkles size={13} /> {reviewLimits.remaining} of {reviewLimits.maxPerWindow} reviews remaining ({reviewLimits.maxPerWindow - reviewLimits.remaining} used)
                        </span>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                        <Clock size={13} /> {status === 'done' ? 'Reviewed' : status === 'no_portfolio' ? 'No portfolio yet' : 'Not reviewed yet'}
                    </span>
                </div>
            </div>

            <section className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:p-5 lg:grid-cols-[1.12fr_1fr] lg:gap-6">
                <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                        <Sparkles size={13} /> AI-assisted review
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                        {status === 'no_portfolio'
                            ? 'No portfolio yet'
                            : status === 'done'
                              ? 'Your portfolio review'
                              : 'Review your portfolio'}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                        {status === 'no_portfolio'
                            ? 'You have not created a portfolio to review yet. Create your portfolio first with your skills, projects, and summary to get accurate AI recruiter feedback.'
                            : status === 'done' && result
                              ? result.summary
                              : 'We analyze your template structure, layout, typography, and content clarity, providing actionable recruiter-focused feedback.'}
                    </p>

                    {isLimitReached && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3.5 py-2.5 text-xs text-amber-100 backdrop-blur-xs">
                            <Clock size={18} className="shrink-0 text-amber-300" />
                            <div>
                                <p className="font-semibold text-white">
                                    You hit 5 trials, please come back later
                                </p>
                                <p className="mt-0.5 text-amber-200">
                                    {availableSubtext}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {status === 'no_portfolio' ? (
                            <button
                                onClick={() => navigate('/portfolio/create')}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 min-[440px]:w-auto sm:px-5 sm:py-3"
                            >
                                <Plus size={17} /> Create portfolio
                            </button>
                        ) : (
                            <button
                                onClick={runReview}
                                disabled={isLimitReached || status === 'reviewing' || !hasPortfolio}
                                aria-disabled={isLimitReached ? 'true' : undefined}
                                title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 min-[440px]:w-auto sm:px-5 sm:py-3 ${
                                    isLimitReached
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0'
                                }`}
                            >
                                {status === 'reviewing' ? (
                                    <>
                                        <RefreshCw size={17} className="animate-spin" /> Reviewing...
                                    </>
                                ) : status === 'done' ? (
                                    <>
                                        <RefreshCw size={17} /> Review again
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={17} /> Run AI review
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/templates')}
                            className={`w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium hover:-translate-y-0.5 active:scale-95 min-[440px]:w-auto sm:px-5 sm:py-3 ${glass}`}
                        >
                            {status === 'no_portfolio' ? 'Choose template' : 'Change template'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/30 bg-white/10 p-3 sm:p-4">
                    {status === 'done' && result ? (
                        <>
                            <ScoreRing value={result.score} />
                            <div className="min-w-0">
                                <strong className="block text-sm font-semibold">Overall score</strong>
                                <small className="block text-xs text-[#d3e5fa]">
                                    {doneCount} of {result.suggestions.length} suggestions done
                                </small>
                                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${glass}`}>
                                    <LayoutGrid size={12} /> {templateName ?? 'Selected'} template
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="min-w-0 py-2">
                            <strong className="block text-sm font-semibold">
                                {status === 'no_portfolio' ? 'How AI Review works' : 'What gets reviewed'}
                            </strong>
                            <p className="mt-1 text-xs text-[#d3e5fa]">
                                {status === 'no_portfolio'
                                    ? 'Create a portfolio to get real AI feedback on:'
                                    : 'Accurate evaluation tailored to your selected template:'}
                            </p>
                            <ul className="mt-2 space-y-1.5 text-xs text-[#d3e5fa]">
                                <li className="flex items-center gap-2"><LayoutGrid size={13} /> Template: {templateName ?? 'none selected'}</li>
                                <li className="flex items-center gap-2"><FileText size={13} /> Layout and spacing</li>
                                <li className="flex items-center gap-2"><Palette size={13} /> Color and typography</li>
                                <li className="flex items-center gap-2"><Type size={13} /> Content clarity</li>
                            </ul>
                        </div>
                    )}
                </div>
            </section>

            {reviewError && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 shadow-xs">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{reviewError}</span>
                    </div>
                    {hasPortfolio && !isLimitReached && (
                        <button
                            onClick={runReview}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {status === 'no_portfolio' && (
                <div className="mt-5 rounded-2xl bg-white p-8 text-center shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-10">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#dce9fb] text-[#1f6fdc]">
                        <Briefcase size={32} />
                    </div>
                    <h4 className="mt-4 text-xl font-semibold text-slate-800 sm:text-2xl">No portfolio yet</h4>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        There is no portfolio to review yet. Create your first portfolio with your skills, projects, and work history to get accurate, recruiter-tailored AI feedback.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/portfolio/create')}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-5 py-3 text-sm font-medium text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95"
                        >
                            <Plus size={17} /> Create your portfolio
                        </button>
                        <button
                            onClick={() => navigate('/templates')}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                        >
                            Browse templates
                        </button>
                    </div>
                </div>
            )}

            {status === 'idle' && (
                <div className="mt-5 rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-8">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="max-w-xl">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcf3e7] px-3 py-1 text-xs font-semibold text-[#12875a]">
                                <CheckCircle2 size={13} /> Portfolio ready for review
                            </span>
                            <h4 className="mt-2 text-lg font-semibold text-slate-800 sm:text-xl">
                                {activePortfolio?.title || 'Your portfolio'} is ready for evaluation
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                Click &quot;Run AI review&quot; above to analyze your sections, case studies, and presentation against hiring standards.
                            </p>
                        </div>
                        <button
                            onClick={runReview}
                            disabled={isLimitReached || status === 'reviewing' || !hasPortfolio}
                            aria-disabled={isLimitReached ? 'true' : undefined}
                            title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                            className={`inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-5 py-3 text-sm font-medium text-white shadow-md transition duration-200 ${
                                isLimitReached
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70'
                            }`}
                        >
                            {status === 'reviewing' ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" /> Reviewing...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} /> Run AI review
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {status === 'done' && result && (
                <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {result.categories.map((c) => {
                            const Icon = CATEGORY_ICONS[c.key] ?? Sparkles
                            const tone = c.score >= 85 ? 'green' : c.score >= 70 ? 'blue' : 'orange'
                            return (
                                <article key={c.key} className={card}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONES[tone]}`}>
                                            <Icon size={17} />
                                        </span>
                                        <strong className="text-2xl font-semibold">{c.score}</strong>
                                    </div>
                                    <h4 className="mt-3 text-sm font-semibold text-slate-800">{c.label}</h4>
                                    <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e1e8f4]">
                                        <div className="h-full rounded-full bg-[#1f6fdc]" style={{ width: `${c.score}%` }} />
                                    </div>
                                </article>
                            )
                        })}
                    </div>

                    <article className={`${card} mt-4`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="text-base font-semibold leading-tight sm:text-lg">AI suggestions</h4>
                                <p className="mt-0.5 text-xs text-slate-500">Start with high impact items and mark each one when done</p>
                            </div>
                            <span className={bluePill}>
                                <Lightbulb size={13} /> {result.suggestions.length} ideas
                            </span>
                        </div>

                        {result.suggestions.length === 0 ? (
                            <p className="mt-4 text-xs text-slate-500">No suggestions needed — your portfolio is in great shape!</p>
                        ) : (
                            <ul className="mt-3 flex flex-col gap-2.5">
                                {result.suggestions.map((s) => {
                                    const Icon = CATEGORY_ICONS[s.category] ?? Sparkles
                                    const p = PRIORITY[s.priority] ?? PRIORITY.medium
                                    const isDone = !!done[s.id]
                                    return (
                                        <li
                                            key={s.id}
                                            className={`flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3 rounded-xl p-3 transition duration-200 hover:bg-[#e8effa] ${isDone ? 'bg-[#eef6f1]' : 'bg-[#f3f6fb]'}`}
                                        >
                                            <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                                                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9 ${TONES[isDone ? 'green' : p.tone]}`}>
                                                    {isDone ? <Check size={16} /> : <Icon size={16} />}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                        <p className={`text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm ${isDone ? 'line-through opacity-60' : ''}`}>
                                                            {s.title}
                                                        </p>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TONES[p.tone]}`}>{p.label}</span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">{s.text}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleDone(s.id)}
                                                className="self-end sm:self-center shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95 sm:px-3.5"
                                            >
                                                {isDone ? 'Undo' : 'Mark done'}
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <CheckCircle2 size={14} className="text-[#12875a]" />
                                {doneCount} of {result.suggestions.length} completed
                            </span>
                            <button
                                onClick={() => navigate(activePortfolio?.id ? `/portfolio/create?id=${activePortfolio.id}&template=${template || 'simple'}` : '/portfolio')}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95"
                            >
                                Edit portfolio <ArrowRight size={16} />
                            </button>
                        </div>
                    </article>
                </>
            )}
        </DashboardLayout>
    )
}
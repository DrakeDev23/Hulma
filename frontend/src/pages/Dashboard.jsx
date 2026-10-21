import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import {
    Sparkles,
    PenLine,
    Copy,
    Check,
    Eye,
    Percent,
    CheckCircle2,
    Layers,
    LayoutTemplate,
    FileDown,
    AlertCircle,
    UserRound,
    Briefcase,
    FileText,
    Plus,
    ArrowRight,
    ArrowUpRight,
    History,
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import { resolveDisplayName, titleCase } from '../utils/portfolioUtils'

const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== '')

const toText = (x) => (typeof x === 'string' ? x : pick(x?.text, x?.title, x?.name, x?.label, ''))

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

const readLocalPortfolio = (uid) => {
    if (!uid) return null
    try {
        const raw = safeStorageGet(`hulmaPortfolio:${uid}`)
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

const reviewInfo = (review) => {
    if (!review) return { label: 'Not run yet', summary: '', score: null, suggestions: [] }
    if (typeof review === 'string') return { label: 'Completed', summary: review, score: null, suggestions: [] }
    const score = pick(review.score, review.rating)
    const numScore = Number.isFinite(Number(score)) ? Number(score) : null
    return {
        label: numScore !== null ? (numScore >= 80 ? 'Great shape' : numScore >= 60 ? 'Good start' : 'Needs work') : 'Not run yet',
        score: numScore,
        summary: pick(review.summary, review.feedback, review.overview, ''),
        suggestions: Array.isArray(review.suggestions) ? review.suggestions.map(toText).filter(Boolean) : [],
    }
}

const formatExactDate = (val) => {
    if (!val) return ''
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })} at ${d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })}`
}

const buildHistory = (portfolios, currentPortfolio) => {
    const list = Array.isArray(portfolios) && portfolios.length ? portfolios : (currentPortfolio ? [currentPortfolio] : [])
    const items = []

    list.forEach((p, pIdx) => {
        if (!p) return
        const pTitle = p.title || `Portfolio ${pIdx + 1}`
        const tplName = titleCase(p.templateId || p.template || 'modern')

        if (p.createdAt) {
            items.push({
                id: `created-${p.id || pIdx}`,
                type: 'create',
                Icon: Plus,
                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                title: `Created portfolio "${pTitle}"`,
                text: `Initial portfolio draft was created using the ${tplName} layout.`,
                portfolioTitle: pTitle,
                date: p.createdAt,
            })
        }

        if (p.templateId || p.template) {
            items.push({
                id: `template-${p.id || pIdx}`,
                type: 'template',
                Icon: LayoutTemplate,
                iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                title: `Applied ${tplName} template`,
                text: `Selected ${tplName} visual style and section arrangement for "${pTitle}".`,
                portfolioTitle: pTitle,
                date: p.createdAt || p.updatedAt,
            })
        }

        if (Array.isArray(p.projects)) {
            p.projects.forEach((proj, projIdx) => {
                const projName = toText(proj) || proj.name || proj.title || `Project ${projIdx + 1}`
                const projDate = proj.updated_at || proj.updatedAt || proj.created_at || proj.createdAt || p.updatedAt || p.createdAt
                items.push({
                    id: `project-${p.id || pIdx}-${proj.id || projIdx}`,
                    type: 'project',
                    Icon: Layers,
                    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
                    title: `Added project "${projName}"`,
                    text: proj.description
                        ? (proj.description.length > 95 ? `${proj.description.slice(0, 95)}…` : proj.description)
                        : `Showcase project added to "${pTitle}".`,
                    portfolioTitle: pTitle,
                    date: projDate,
                })
            })
        }

        if (p.review) {
            const revSummary = typeof p.review === 'string' ? p.review : pick(p.review.summary, p.review.feedback, '')
            const revScore = pick(p.review.score, p.review.rating)
            items.push({
                id: `review-${p.id || pIdx}`,
                type: 'review',
                Icon: Sparkles,
                iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
                title: `AI Review completed${revScore !== undefined && revScore !== null ? ` (Score: ${revScore}/100)` : ''}`,
                text: revSummary || 'Actionable feedback and optimization suggestions were generated.',
                portfolioTitle: pTitle,
                date: pick(p.review?.created_at, p.review?.createdAt, p.review?.reviewed_at, p.updatedAt, p.createdAt),
            })
        }

        if (p.publishedAt || p.isPublished) {
            items.push({
                id: `published-${p.id || pIdx}`,
                type: 'publish',
                Icon: CheckCircle2,
                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                title: `Published "${pTitle}" live`,
                text: 'Public sharing link was activated and made available for visitors.',
                portfolioTitle: pTitle,
                date: p.publishedAt || p.updatedAt || p.createdAt,
            })
        }

        const hasTimeDiff = p.updatedAt && p.createdAt && (new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime() > 1000)
        if (p.updatedAt && (!p.createdAt || hasTimeDiff)) {
            items.push({
                id: `updated-${p.id || pIdx}`,
                type: 'update',
                Icon: PenLine,
                iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
                title: `Modified "${pTitle}"`,
                text: 'Saved updates to content, headline, or bio sections.',
                portfolioTitle: pTitle,
                date: p.updatedAt,
            })
        }

        if (Array.isArray(p.activity)) {
            p.activity.forEach((act, actIdx) => {
                items.push({
                    id: act.id || `custom-act-${p.id || pIdx}-${actIdx}`,
                    type: 'custom',
                    Icon: FileText,
                    iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
                    title: pick(act.title, act.action, act.type, 'Portfolio modified'),
                    text: pick(act.text, act.description, act.message, `Activity recorded on "${pTitle}".`),
                    portfolioTitle: pTitle,
                    date: pick(act.created_at, act.createdAt, act.date, act.time, p.updatedAt),
                })
            })
        }
    })

    return items.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0
        const timeB = b.date ? new Date(b.date).getTime() : 0
        return timeB - timeA
    })
}

function timeGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { user, isLoaded } = useUser()
    const { portfolio: rawPortfolio, loading, error: fetchError, refetch } = usePortfolio()
    const [copied, setCopied] = useState(false)
    const [viewMode, setViewMode] = useState('week') 
    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(null)

    const localDraft = useMemo(() => (user?.id ? readLocalPortfolio(user.id) : null), [user])

    const basePortfolio = useMemo(() => {
        const fromBackend = normalizePortfolio(rawPortfolio)
        if (hasContent(fromBackend)) return fromBackend
        const fromLocal = normalizePortfolio(localDraft)
        if (hasContent(fromLocal)) return fromLocal
        return fromBackend
    }, [rawPortfolio, localDraft])

    const heroList = useMemo(() => {
        const list = Array.isArray(rawPortfolio) ? rawPortfolio : Array.isArray(rawPortfolio?.portfolios) ? rawPortfolio.portfolios : null
        const items = list ? list.map(normalizePortfolio).filter(hasContent) : []
        return items.length ? items : basePortfolio ? [basePortfolio] : []
    }, [rawPortfolio, basePortfolio])

    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
    const portfolio = (selectedPortfolioId && heroList.find((p) => p.id === selectedPortfolioId)) || heroList[0] || basePortfolio
    const activeTemplate = portfolio?.sections?.meta?.templateId || portfolio?.template
    const editUrl = portfolio?.id
        ? `/portfolio/create?id=${portfolio.id}&template=${activeTemplate || 'simple'}`
        : activeTemplate
            ? `/portfolio/create?template=${activeTemplate}`
            : '/portfolio/create'

    const displayName = resolveDisplayName(user, 'User')
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'

    const hasPortfolio = hasContent(portfolio)

    const derived = useMemo(() => {
        if (!hasPortfolio) return null
        const sectionCount = Object.entries(portfolio.sections).filter(([k, v]) => k !== 'meta' && isFilled(v)).length
        const projectCount = portfolio.projects.length

        const hasPhoto = Boolean(portfolio.picture || portfolio.sections?.profile?.profilePicture || portfolio.profilePicture)
        const hasProjects = projectCount > 0 || (Array.isArray(portfolio.sections?.projects) && portfolio.sections.projects.length > 0)
        const rawSocial = portfolio.sections?.socialLinks || portfolio.sections?.profile?.socialLinks || portfolio.socialLinks
        const hasSocial = Array.isArray(rawSocial)
            ? rawSocial.length > 0
            : rawSocial && typeof rawSocial === 'object'
            ? Object.values(rawSocial).some(Boolean)
            : Boolean(rawSocial)
        const isPublished = Boolean(portfolio.id || portfolio.slug || portfolio.isPublished)

        const tasks = [
            {
                key: 'photo',
                title: 'Add a profile photo',
                desc: 'A friendly headshot makes your portfolio feel human and trusted.',
                done: hasPhoto,
                actionLabel: hasPhoto ? 'Completed' : 'Upload photo',
                Icon: UserRound,
                route: editUrl,
            },
            {
                key: 'project',
                title: 'Add at least one project',
                desc: 'Showcase your strongest work, tech stack, and accomplishments.',
                done: hasProjects,
                actionLabel: hasProjects ? 'Completed' : 'Add project',
                Icon: Layers,
                route: editUrl,
            },
            {
                key: 'linkedin',
                title: 'Connect LinkedIn & social links',
                desc: 'Help hiring managers reach you and view your professional network.',
                done: hasSocial,
                actionLabel: hasSocial ? 'Completed' : 'Connect links',
                Icon: Briefcase,
                route: editUrl,
            },
            {
                key: 'publish',
                title: 'Publish your portfolio',
                desc: 'Make your portfolio publicly viewable with your custom link.',
                done: isPublished,
                actionLabel: isPublished ? 'Published' : 'Publish live',
                Icon: CheckCircle2,
                route: '/portfolio',
            },
        ]

        const doneCount = tasks.filter((t) => t.done).length
        const backendCompletion = pick(portfolio.completion, portfolio.completion_percentage)
        const completion = Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    Number.isFinite(Number(backendCompletion)) && backendCompletion !== undefined
                        ? Number(backendCompletion)
                        : (doneCount / tasks.length) * 100
                )
            )
        )

        const review = reviewInfo(portfolio.review)
        const views = Number(portfolio.views || 0)
        const totalPortfolios = heroList.length

        let suggestions = []
        if (review.suggestions && review.suggestions.length > 0) {
            suggestions = review.suggestions.map((s, idx) => ({
                id: `sug-${idx}`,
                text: s,
                action: 'Fix in editor',
                route: editUrl,
            }))
        } else {
            if (!hasPhoto) {
                suggestions.push({
                    id: 'sug-photo',
                    text: 'Upload a clear headshot to increase initial portfolio engagement by up to 40%.',
                    action: 'Add photo',
                    route: editUrl,
                })
            }
            if (projectCount < 2) {
                suggestions.push({
                    id: 'sug-project',
                    text: 'Add 2 or more projects with quantifiable achievements (e.g. "reduced latency by 35%").',
                    action: 'Add project',
                    route: editUrl,
                })
            }
            if ((portfolio.skills || []).length < 5) {
                suggestions.push({
                    id: 'sug-skills',
                    text: 'Include at least 5 technical tools and skills to rank higher in recruiter screenings.',
                    action: 'Add skills',
                    route: editUrl,
                })
            }
            suggestions.push({
                id: 'sug-review',
                text: 'Run the AI reviewer for personalized suggestions on storytelling tone and grammar.',
                action: 'Run review',
                route: '/review',
            })
        }

        return {
            sectionCount,
            projectCount,
            completion,
            tasks,
            suggestions: suggestions.slice(0, 3),
            history: buildHistory(heroList, portfolio),
            review,
            views,
            totalPortfolios,
            lastUpdated: relativeTime(portfolio.updatedAt) || 'recently',
        }
    }, [portfolio, hasPortfolio, heroList, editUrl])

    const history = useMemo(() => derived?.history || [], [derived?.history])

    const weekData = useMemo(() => {
        const current = new Date()
        current.setDate(current.getDate() + weekOffset * 7)

        const jsDay = current.getDay()
        const distToMon = (jsDay + 6) % 7
        const monday = new Date(current)
        monday.setDate(current.getDate() - distToMon)
        monday.setHours(0, 0, 0, 0)

        const todayStr = new Date().toDateString()
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        return days.map((dayName, idx) => {
            const d = new Date(monday)
            d.setDate(monday.getDate() + idx)
            const dateStr = d.toDateString()
            const isToday = dateStr === todayStr
            const dayNum = d.getDate()
            const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
            const formattedFull = d.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })

            const events = (history || []).filter((item) => {
                if (!item.date) return false
                const itemDate = new Date(item.date)
                if (Number.isNaN(itemDate.getTime())) return false

                const exactMatch =
                    itemDate.getFullYear() === d.getFullYear() &&
                    itemDate.getMonth() === d.getMonth() &&
                    itemDate.getDate() === d.getDate()
                if (exactMatch) return true

                if (weekOffset === 0) {
                    const itemJsDay = itemDate.getDay()
                    const itemWeekIdx = (itemJsDay + 6) % 7
                    const diffDays = Math.abs(itemDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
                    if (itemWeekIdx === idx && diffDays < 7) {
                        return true
                    }
                }
                return false
            })

            return {
                day: dayName,
                fullDay: fullDays[idx],
                dateNum: dayNum,
                monthShort,
                formattedFull,
                dateObj: d,
                isToday,
                index: idx,
                events,
                count: events.length,
                hasActivity: events.length > 0,
            }
        })
    }, [history, weekOffset])

    const weekRangeStr = useMemo(() => {
        if (!weekData.length) return ''
        const first = weekData[0].dateObj
        const last = weekData[6].dateObj
        const firstMonth = first.toLocaleDateString('en-US', { month: 'short' })
        const lastMonth = last.toLocaleDateString('en-US', { month: 'short' })
        const firstYear = first.getFullYear()
        const lastYear = last.getFullYear()

        if (firstMonth === lastMonth && firstYear === lastYear) {
            return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${firstYear}`
        }
        if (firstYear === lastYear) {
            return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${firstYear}`
        }
        return `${firstMonth} ${first.getDate()}, ${firstYear} – ${lastMonth} ${last.getDate()}, ${lastYear}`
    }, [weekData])

    const activeDayIndex = useMemo(() => {
        if (selectedDayIndex !== null) return selectedDayIndex
        const todayStr = new Date().toDateString()
        const todayIdx = weekData.findIndex((d) => d.dateObj.toDateString() === todayStr)
        if (todayIdx !== -1 && weekData[todayIdx]?.hasActivity) return todayIdx
        const firstActive = weekData.find((d) => d.hasActivity)
        return firstActive ? firstActive.index : (todayIdx !== -1 ? todayIdx : 0)
    }, [selectedDayIndex, weekData])

    const selectedDayData = weekData[activeDayIndex] || weekData[0]
    const totalWeekActivities = useMemo(() => weekData.reduce((acc, d) => acc + d.count, 0), [weekData])
    const maxWeekActivityCount = useMemo(() => Math.max(...weekData.map((d) => d.count), 1), [weekData])

    const monthData = useMemo(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const fullMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        const currentMonthIdx = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        return monthNames.map((name, idx) => {
            const isCurrentMonth = currentYear === selectedYear && currentMonthIdx === idx

            const events = (history || []).filter((item) => {
                if (!item.date) return false
                const d = new Date(item.date)
                if (Number.isNaN(d.getTime())) return false
                return d.getFullYear() === selectedYear && d.getMonth() === idx
            })

            return {
                name,
                fullName: fullMonths[idx],
                year: selectedYear,
                index: idx,
                isCurrentMonth,
                events,
                count: events.length,
                hasActivity: events.length > 0,
            }
        })
    }, [history, selectedYear])

    const activeMonthIndex = useMemo(() => {
        if (selectedMonthIndex !== null) return selectedMonthIndex
        const currentMonth = new Date().getMonth()
        if (monthData[currentMonth]?.hasActivity) return currentMonth
        const firstActive = monthData.find((m) => m.hasActivity)
        return firstActive ? firstActive.index : currentMonth
    }, [selectedMonthIndex, monthData])

    const selectedMonthData = monthData[activeMonthIndex] || monthData[0]
    const totalYearActivities = useMemo(() => monthData.reduce((acc, m) => acc + m.count, 0), [monthData])
    const maxMonthActivityCount = useMemo(() => Math.max(...monthData.map((m) => m.count), 1), [monthData])

    const HISTORY_PAGE_SIZE = 5
    const [historyPage, setHistoryPage] = useState(1)

    useEffect(() => {
        setHistoryPage(1)
    }, [viewMode, activeDayIndex, activeMonthIndex, weekOffset, selectedYear])

    const activeHistoryEvents = useMemo(() => {
        return viewMode === 'week' ? (selectedDayData?.events || []) : (selectedMonthData?.events || [])
    }, [viewMode, selectedDayData?.events, selectedMonthData?.events])

    const totalHistoryItems = activeHistoryEvents.length
    const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryItems / HISTORY_PAGE_SIZE))
    const currentHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages)

    const pagedHistoryEvents = useMemo(() => {
        return activeHistoryEvents.slice(
            (currentHistoryPage - 1) * HISTORY_PAGE_SIZE,
            currentHistoryPage * HISTORY_PAGE_SIZE
        )
    }, [activeHistoryEvents, currentHistoryPage])

    const slug = portfolio?.slug || portfolio?.public_id || portfolio?.id || ''
    const shareUrl = typeof window !== 'undefined' && slug ? `${window.location.origin}/p/${slug}` : ''

    const handleCopyLink = async () => {
        if (!shareUrl) return
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            try {
                const ta = document.createElement('textarea')
                ta.value = shareUrl
                ta.style.position = 'fixed'
                ta.style.opacity = '0'
                document.body.appendChild(ta)
                ta.focus()
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch {
                // Clipboard fallback silently failed without native alert
            }
        }
    }

    if (!isLoaded) {
        return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading control center...</div>
    }

    if (loading) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="Loading control center...">
                <div className="mt-5 space-y-4">
                    <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (fetchError && !hasPortfolio) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="Error loading portfolio">
                <div className="mt-5 rounded-2xl bg-red-50 p-6 text-red-700 shadow-sm border border-red-200">
                    <p className="font-semibold">{String(fetchError?.message || fetchError)}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    if (!hasPortfolio) {
        return (
            <DashboardLayout userName={displayName} email={emailAddress} subtitle="No portfolio created yet">
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xs">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                        <Sparkles size={24} />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">Create your first portfolio</h3>
                    <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                        Choose a design template, add your projects, and get instant AI feedback to showcase your work.
                    </p>
                    <button
                        onClick={() => navigate('/portfolio/create')}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                    >
                        <span>Start building</span>
                        <ArrowRight size={16} />
                    </button>
                </section>
            </DashboardLayout>
        )
    }

    const {
        completion,
        tasks,
        suggestions,
        views,
        totalPortfolios,
        review,
    } = derived

    const firstName = user?.firstName || displayName.split(' ')[0]
    const greetingText = `${timeGreeting()}, ${firstName}`

    const reviewScore = review?.score
    const reviewLabel = review?.label || 'Not run yet'

    return (
        <DashboardLayout
            userName={displayName}
            email={emailAddress}
            title={greetingText}
            subtitle="Here's how your portfolios are doing."
        >
            <div className="space-y-6 pb-12">
                <section className="mt-4 rounded-2xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] p-5 sm:p-6 text-white shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1 max-w-xl">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-0.5 text-xs font-semibold backdrop-blur-xs">
                                <Sparkles size={13} /> Portfolio overview
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                                Welcome back, {firstName}
                            </h2>
                            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                                Review your visitor activity, complete next steps, and update your showcase.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/15">
                            <button
                                onClick={() => navigate(editUrl)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-blue-700 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-sm hover:bg-blue-50 active:scale-95 transition cursor-pointer"
                            >
                                <PenLine size={15} />
                                <span>Edit portfolio</span>
                            </button>
                            <button
                                onClick={handleCopyLink}
                                title={shareUrl || 'Copy link'}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 text-white font-medium px-3.5 py-2.5 text-xs sm:text-sm hover:bg-white/20 active:scale-95 transition cursor-pointer"
                            >
                                {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                                <span>{copied ? 'Copied' : 'Copy link'}</span>
                            </button>
                        </div>
                    </div>

                    {heroList.length > 1 && (
                        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/20">
                            <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider mr-1">Active Portfolio:</span>
                            {heroList.map((p) => {
                                const isSelected = p.id === portfolio?.id
                                return (
                                    <button
                                        key={p.id || p.title}
                                        type="button"
                                        onClick={() => setSelectedPortfolioId(p.id)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                            isSelected
                                                ? 'bg-white text-blue-700 shadow-sm'
                                                : 'bg-white/15 text-white hover:bg-white/25'
                                        }`}
                                    >
                                        {p.title || 'Untitled'}
                                        <span className="ml-1.5 opacity-80 capitalize text-[10px]">({p.templateId || p.template || 'simple'})</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total views</span>
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                                <Eye size={16} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900">{views}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">People who opened your portfolio</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Portfolios</span>
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                                <Briefcase size={16} aria-hidden="true" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                                {totalPortfolios} {totalPortfolios === 1 ? 'portfolio' : 'portfolios'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Portfolios you've created</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">AI review score</span>
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                                <Sparkles size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900">
                                {reviewScore !== null ? `${reviewScore}/100` : 'Not run'}
                            </span>
                            <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    reviewScore >= 80
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : reviewScore >= 60
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                                {reviewLabel}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Latest portfolio feedback</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-sm">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Profile completion</span>
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
                                <Percent size={16} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900">{completion}%</span>
                            <span className="text-[11px] font-medium text-purple-600">
                                {completion >= 100 ? 'Ready' : 'In progress'}
                            </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Overall setup progress</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12 items-start">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
                                <div className="flex items-start sm:items-center gap-2.5">
                                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5 sm:mt-0">
                                        <History className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">Portfolio activity</h3>
                                        <p className="text-xs text-slate-500 leading-snug">
                                            {viewMode === 'week'
                                                ? 'Click a day to see what was created or modified on that date'
                                                : 'Click a month to inspect creations and edits across the year'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-wrap">
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('week')}
                                            className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                                viewMode === 'week'
                                                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Week & Dates
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('month')}
                                            className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                                viewMode === 'month'
                                                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Months
                                        </button>
                                    </div>

                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                                        <span>
                                            {viewMode === 'week'
                                                ? `${totalWeekActivities} ${totalWeekActivities === 1 ? 'activity' : 'activities'}`
                                                : `${totalYearActivities} in ${selectedYear}`}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 pt-1 flex-wrap">
                                {viewMode === 'week' ? (
                                    <div className="flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-1 sm:gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWeekOffset((w) => w - 1)
                                                    setSelectedDayIndex(null)
                                                }}
                                                className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs shrink-0"
                                                title="Previous week"
                                                aria-label="Previous week"
                                            >
                                                <ChevronLeft size={14} aria-hidden="true" />
                                            </button>
                                            <span className="text-xs sm:text-sm font-bold text-slate-800 px-1 whitespace-nowrap">
                                                {weekRangeStr}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWeekOffset((w) => w + 1)
                                                    setSelectedDayIndex(null)
                                                }}
                                                className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs shrink-0"
                                                title="Next week"
                                                aria-label="Next week"
                                            >
                                                <ChevronRight size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                        {weekOffset !== 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWeekOffset(0)
                                                    setSelectedDayIndex(null)
                                                }}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer shrink-0"
                                            >
                                                This week
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-1 sm:gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedYear((y) => y - 1)
                                                    setSelectedMonthIndex(null)
                                                }}
                                                className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs shrink-0"
                                                title="Previous year"
                                                aria-label="Previous year"
                                            >
                                                <ChevronLeft size={14} aria-hidden="true" />
                                            </button>
                                            <span className="text-xs sm:text-sm font-bold text-slate-800 px-1 whitespace-nowrap">
                                                Year {selectedYear}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedYear((y) => y + 1)
                                                    setSelectedMonthIndex(null)
                                                }}
                                                className="h-8 w-8 sm:h-7 sm:w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shadow-2xs shrink-0"
                                                title="Next year"
                                                aria-label="Next year"
                                            >
                                                <ChevronRight size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                        {selectedYear !== new Date().getFullYear() && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedYear(new Date().getFullYear())
                                                    setSelectedMonthIndex(null)
                                                }}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer shrink-0"
                                            >
                                                Current year
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 w-full overflow-x-auto pb-1">
                                {viewMode === 'week' ? (
                                    <div className="flex items-end justify-between gap-1 sm:gap-2.5 h-36 pt-3 pb-1 px-0.5 min-w-[280px]">
                                        {weekData.map((d) => {
                                            const isSelected = activeDayIndex === d.index
                                            const heightPct = d.hasActivity
                                                ? Math.max(32, Math.round((d.count / maxWeekActivityCount) * 100))
                                                : 12

                                            return (
                                                <button
                                                    key={d.day}
                                                    type="button"
                                                    onClick={() => setSelectedDayIndex(d.index)}
                                                    className={`flex-1 min-w-[36px] flex flex-col items-center gap-1 h-full justify-end cursor-pointer group rounded-xl p-1 sm:p-1.5 transition-all focus:outline-none ${
                                                        isSelected
                                                            ? 'bg-blue-50/80 ring-2 ring-blue-500 shadow-2xs'
                                                            : 'hover:bg-slate-50'
                                                    }`}
                                                    title={`${d.formattedFull}: ${d.count} ${d.count === 1 ? 'activity' : 'activities'}`}
                                                    aria-label={`${d.formattedFull}: ${d.count} activities`}
                                                >
                                                    <span
                                                        className={`text-[10px] sm:text-[11px] font-bold transition ${
                                                            d.hasActivity
                                                                ? isSelected
                                                                    ? 'text-blue-700 font-extrabold scale-110'
                                                                    : 'text-slate-700 group-hover:text-blue-600'
                                                                : 'text-slate-300'
                                                        }`}
                                                    >
                                                        {d.count}
                                                    </span>

                                                    <div className="w-full max-w-[34px] sm:max-w-[40px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-18">
                                                        <div
                                                            style={{ height: `${heightPct}%` }}
                                                            className={`w-full rounded-t-lg transition-all duration-300 ${
                                                                d.hasActivity
                                                                    ? isSelected
                                                                        ? 'bg-blue-600 shadow-sm'
                                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                                    : 'bg-slate-200'
                                                            }`}
                                                        />
                                                    </div>

                                                    <div className="flex flex-col items-center leading-tight">
                                                        <span
                                                            className={`text-[10px] sm:text-[11px] font-bold transition ${
                                                                isSelected
                                                                    ? 'text-blue-700 underline underline-offset-2'
                                                                    : d.hasActivity
                                                                    ? 'text-slate-800'
                                                                    : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {d.day}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-medium transition ${
                                                                isSelected ? 'text-blue-600 font-bold' : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {d.dateNum}
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full transition ${
                                                            d.hasActivity
                                                                ? isSelected
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-blue-400'
                                                                : 'bg-transparent'
                                                        }`}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 pt-3 pb-1 px-0.5 min-w-[360px] sm:min-w-0">
                                        {monthData.map((m) => {
                                            const isSelected = activeMonthIndex === m.index
                                            const heightPct = m.hasActivity
                                                ? Math.max(30, Math.round((m.count / maxMonthActivityCount) * 100))
                                                : 12

                                            return (
                                                <button
                                                    key={m.name}
                                                    type="button"
                                                    onClick={() => setSelectedMonthIndex(m.index)}
                                                    className={`flex-1 min-w-[26px] sm:min-w-0 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group rounded-lg p-0.5 sm:p-1 transition-all focus:outline-none ${
                                                        isSelected
                                                            ? 'bg-blue-50/80 ring-2 ring-blue-500 shadow-2xs'
                                                            : 'hover:bg-slate-50'
                                                    }`}
                                                    title={`${m.fullName} ${m.year}: ${m.count} ${m.count === 1 ? 'activity' : 'activities'}`}
                                                    aria-label={`${m.fullName}: ${m.count} activities`}
                                                >
                                                    <span
                                                        className={`text-[9px] sm:text-[11px] font-bold transition ${
                                                            m.hasActivity
                                                                ? isSelected
                                                                    ? 'text-blue-700 font-extrabold scale-110'
                                                                    : 'text-slate-700 group-hover:text-blue-600'
                                                                : 'text-slate-300'
                                                        }`}
                                                    >
                                                        {m.count}
                                                    </span>

                                                    <div className="w-full max-w-[24px] sm:max-w-[30px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-18">
                                                        <div
                                                            style={{ height: `${heightPct}%` }}
                                                            className={`w-full rounded-t-lg transition-all duration-300 ${
                                                                m.hasActivity
                                                                    ? isSelected
                                                                        ? 'bg-blue-600 shadow-sm'
                                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                                    : 'bg-slate-200'
                                                            }`}
                                                        />
                                                    </div>

                                                    <span
                                                        className={`text-[10px] sm:text-xs font-semibold transition ${
                                                            isSelected
                                                                ? 'text-blue-700 font-bold underline underline-offset-2'
                                                                : m.hasActivity
                                                                ? 'text-slate-800'
                                                                : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {m.name}
                                                    </span>

                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full transition ${
                                                            m.hasActivity
                                                                ? isSelected
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-blue-400'
                                                                : 'bg-transparent'
                                                        }`}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                {viewMode === 'week' ? (
                                    <>
                                        <div className="flex items-center justify-between pb-3 gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                                    {selectedDayData.formattedFull}'s history
                                                </h4>
                                                <span
                                                    className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                                        selectedDayData.hasActivity
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {selectedDayData.count} {selectedDayData.count === 1 ? 'event' : 'events'}
                                                </span>
                                            </div>
                                            {selectedDayData.isToday && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                                                    Today
                                                </span>
                                            )}
                                        </div>

                                        {selectedDayData.events.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 sm:p-6 text-center">
                                                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" aria-hidden="true" />
                                                <p className="text-xs font-bold text-slate-700">
                                                    No modifications or creations recorded on {selectedDayData.formattedFull}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    Click any highlighted day above to view what was created or edited.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="relative pl-5 sm:pl-6 ml-2 sm:ml-2.5 border-l-2 border-slate-100 space-y-4 pt-1">
                                                {pagedHistoryEvents.map((item) => {
                                                    const ItemIcon = item.Icon
                                                    return (
                                                        <div key={item.id} className="relative group">
                                                            <div
                                                                className={`absolute -left-[31px] sm:-left-[33px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow-2xs ${item.iconBg}`}
                                                            >
                                                                <ItemIcon className="w-3 h-3" aria-hidden="true" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                                                                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                                                            {item.title}
                                                                        </h5>
                                                                        {heroList.length > 1 && item.portfolioTitle && (
                                                                            <span className="text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[140px]">
                                                                                {item.portfolioTitle}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 shrink-0">
                                                                        {relativeTime(item.date) || 'Recently'}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                                                                    {item.text}
                                                                </p>
                                                                {item.date && (
                                                                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                                        <Calendar className="w-3 h-3 text-slate-300" aria-hidden="true" />
                                                                        <span>{formatExactDate(item.date)}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between pb-3 gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                                    {selectedMonthData.fullName} {selectedMonthData.year}'s history
                                                </h4>
                                                <span
                                                    className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                                        selectedMonthData.hasActivity
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {selectedMonthData.count} {selectedMonthData.count === 1 ? 'event' : 'events'}
                                                </span>
                                            </div>
                                            {selectedMonthData.isCurrentMonth && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                                                    Current Month
                                                </span>
                                            )}
                                        </div>

                                        {selectedMonthData.events.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 sm:p-6 text-center">
                                                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" aria-hidden="true" />
                                                <p className="text-xs font-bold text-slate-700">
                                                    No modifications or creations recorded in {selectedMonthData.fullName} {selectedMonthData.year}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    Click any highlighted month above to inspect portfolio history.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="relative pl-5 sm:pl-6 ml-2 sm:ml-2.5 border-l-2 border-slate-100 space-y-4 pt-1">
                                                {pagedHistoryEvents.map((item) => {
                                                    const ItemIcon = item.Icon
                                                    return (
                                                        <div key={item.id} className="relative group">
                                                            <div
                                                                className={`absolute -left-[31px] sm:-left-[33px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow-2xs ${item.iconBg}`}
                                                            >
                                                                <ItemIcon className="w-3 h-3" aria-hidden="true" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                                                                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                                                            {item.title}
                                                                        </h5>
                                                                        {heroList.length > 1 && item.portfolioTitle && (
                                                                            <span className="text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded-full truncate max-w-[140px]">
                                                                                {item.portfolioTitle}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 shrink-0">
                                                                        {relativeTime(item.date) || 'Recently'}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                                                                    {item.text}
                                                                </p>
                                                                {item.date && (
                                                                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                                        <Calendar className="w-3 h-3 text-slate-300" aria-hidden="true" />
                                                                        <span>{formatExactDate(item.date)}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}

                                {totalHistoryItems > HISTORY_PAGE_SIZE && (
                                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium">
                                            Showing {(currentHistoryPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(currentHistoryPage * HISTORY_PAGE_SIZE, totalHistoryItems)} of {totalHistoryItems} events
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                                disabled={currentHistoryPage <= 1}
                                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                                aria-label="Previous history page"
                                            >
                                                <ChevronLeft size={14} aria-hidden="true" />
                                                <span>Prev</span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((pageNum) => (
                                                    <button
                                                        key={pageNum}
                                                        type="button"
                                                        onClick={() => setHistoryPage(pageNum)}
                                                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                                            currentHistoryPage === pageNum
                                                                ? 'bg-blue-600 text-white shadow-xs'
                                                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                                                disabled={currentHistoryPage >= totalHistoryPages}
                                                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                                aria-label="Next history page"
                                            >
                                                <span>Next</span>
                                                <ChevronRight size={14} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900">AI Review Suggestions</h3>
                                        <p className="text-xs text-slate-500">Actionable improvements to elevate your storytelling</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/review')}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Full audit</span>
                                    <ArrowUpRight size={13} />
                                </button>
                            </div>

                            <div className="mt-4 space-y-3">
                                {suggestions.map((sug) => (
                                    <div
                                        key={sug.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition"
                                    >
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                {sug.text}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate(sug.route)}
                                            className="shrink-0 self-end sm:self-auto rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer"
                                        >
                                            {sug.action}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Next steps</h3>
                                    <p className="text-xs text-slate-500">Key milestones to complete your profile</p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                    {tasks.filter((t) => t.done).length} / {tasks.length} done
                                </span>
                            </div>

                            <div className="mt-4 space-y-2.5">
                                {tasks.map((task) => {
                                    const IconComponent = task.Icon
                                    return (
                                        <div
                                            key={task.key}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${
                                                        task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                                    }`}
                                                >
                                                    {task.done ? <Check size={16} /> : <IconComponent size={15} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`text-xs sm:text-sm font-semibold truncate ${task.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                                                        {task.desc}
                                                    </p>
                                                </div>
                                            </div>

                                            {task.done ? (
                                                <span className="shrink-0 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 size={13} />
                                                    <span>Done</span>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(task.route)}
                                                    className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                                                >
                                                    {task.actionLabel}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
                                Quick actions
                            </h3>
                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                                <button
                                    onClick={() => navigate(editUrl)}
                                    className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer text-left group"
                                >
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                                        <PenLine size={15} />
                                    </div>
                                    <span className="mt-2 text-xs font-bold text-slate-800">Edit Portfolio</span>
                                    <span className="text-[10px] text-slate-400">Update sections & bio</span>
                                </button>

                                <button
                                    onClick={() => navigate('/templates')}
                                    className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition cursor-pointer text-left group"
                                >
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                                        <LayoutTemplate size={15} />
                                    </div>
                                    <span className="mt-2 text-xs font-bold text-slate-800">Change Template</span>
                                    <span className="text-[10px] text-slate-400">Switch aesthetic</span>
                                </button>

                                <button
                                    onClick={handleCopyLink}
                                    className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer text-left group"
                                >
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                                        {copied ? <Check size={15} /> : <Copy size={15} />}
                                    </div>
                                    <span className="mt-2 text-xs font-bold text-slate-800">
                                        {copied ? 'Link Copied!' : 'Copy Share Link'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">Send to recruiters</span>
                                </button>

                                <button
                                    onClick={() => navigate('/portfolio')}
                                    className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition cursor-pointer text-left group"
                                >
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                                        <FileDown size={15} />
                                    </div>
                                    <span className="mt-2 text-xs font-bold text-slate-800">Preview & Print</span>
                                    <span className="text-[10px] text-slate-400">Export or view layout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

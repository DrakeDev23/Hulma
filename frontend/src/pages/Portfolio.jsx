import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { Sparkles, Clock, CheckCircle2, Plus } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import puppetImg from '../assets/puppet.png'
import PortfolioReviewCard from '../components/PortfolioReviewCard'
import PortfolioModal from '../components/PortfolioModal'
import PortfolioHeroDisplay from '../components/PortfolioHeroDisplay'
import ShareLink from '../components/ShareLink'
import {
    resolvePortfolio,
    resolvePortfolioList,
    countSections,
    reviewInfo,
    relativeTime,
    titleCase,
    resolveDisplayName,
    apiUrl,
} from '../utils/portfolioUtils'

const TONES = {
    blue: 'bg-[#dce9fb] text-[#1f6fdc]',
    green: 'bg-[#dcf3e7] text-[#12875a]',
    orange: 'bg-[#fde6d8] text-[#e0561b]',
}

const glass = 'border border-white/40 bg-white/15 backdrop-blur-sm transition duration-200 hover:bg-white/25'
const cardHover = 'group rounded-xl bg-[#f3f6fb] p-4 transition duration-300 hover:-translate-y-1 hover:bg-[#e8effa] hover:shadow-md'

export default function Portfolio() {
    const navigate = useNavigate()
    const { user } = useUser()
    const { getToken } = useAuth()
    const { portfolio: raw, loading, error, refetch } = usePortfolio()
    const [showPortfolio, setShowPortfolio] = useState(false)
    const [heroIndex, setHeroIndex] = useState(0)

    const userName = resolveDisplayName(user, 'User')
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'

    const { portfolio: basePortfolio, source } = useMemo(() => resolvePortfolio(raw, user?.id), [raw, user?.id])
    const heroList = useMemo(() => resolvePortfolioList(raw, user?.id), [raw, user?.id])

    const activeIndex = Math.min(heroIndex, Math.max(heroList.length - 1, 0))
    const portfolio = heroList[activeIndex] || basePortfolio

    const handleDelete = async () => {
        if (!portfolio?.id) return
        try {
            const token = await getToken()
            const res = await fetch(apiUrl(`/api/portfolio/${portfolio.id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (res.ok) {
                setShowPortfolio(false)
                setHeroIndex(0)
                refetch?.()
            } else {
                alert('Failed to delete portfolio.')
            }
        } catch {
            alert('Delete failed.')
        }
    }

    const editUrl = portfolio?.templateId ? `/portfolio/create?template=${portfolio.templateId}` : '/portfolio/create'

    const d = useMemo(() => {
        const sectionCount = countSections(portfolio)
        const projectCount = portfolio?.projects?.length || 0
        const review = reviewInfo(portfolio?.review)
        return {
            sectionCount,
            projectCount,
            review,
            templateLabel: titleCase(portfolio?.templateId) || 'Not chosen',
            updated: relativeTime(portfolio?.updatedAt),
        }
    }, [portfolio])

    if (loading) {
        return (
            <DashboardLayout userName={userName} email={email} subtitle="Loading portfolio...">
                <div className="mt-6 text-center text-slate-500">Loading...</div>
            </DashboardLayout>
        )
    }

    if (error && !portfolio) {
        return (
            <DashboardLayout userName={userName} email={email} subtitle="Portfolio error">
                <div className="mt-4 rounded-2xl bg-red-50 p-6 text-red-700 shadow">
                    <p className="font-medium">Failed to load portfolio.</p>
                    <button onClick={() => refetch?.()} className="mt-3 rounded-xl bg-[#1f6fdc] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558c4]">Retry</button>
                </div>
            </DashboardLayout>
        )
    }

    const { sectionCount, projectCount, review, templateLabel, updated } = d
    const projectLabel = projectCount === 1 ? '1 project' : `${projectCount} projects`

    const heroStats = [
        { label: 'Template', value: templateLabel },
        { label: 'Sections', value: `${sectionCount} filled` },
        { label: 'AI review', value: review.label },
    ]

    const steps = [
        { title: 'Choose a template', text: 'Start with a curated layout and swap sections in seconds.', done: Boolean(portfolio?.templateId), tone: 'blue', path: '/templates' },
        { title: 'Add projects and sections', text: 'Organize case studies, skills and experience into a clear story.', done: projectCount > 0 && sectionCount >= 3, tone: 'green', path: '/portfolio/create' },
        { title: 'Review AI feedback', text: 'Get clarity checks, tone suggestions and publish-ready guidance.', done: Boolean(portfolio?.review), tone: 'orange', path: '/review' },
    ]

    const features = [
        { title: 'AI review', badge: review.label, tone: 'green', text: review.summary || 'Run an AI review to get clarity checks and suggestions for your portfolio.', path: '/review' },
        { title: 'Templates', badge: templateLabel, tone: 'blue', text: portfolio?.templateId ? 'Switch to a different layout without losing your content.' : 'Browse layouts and pick one for your portfolio.', path: '/templates' },
        { title: 'Sections', badge: `${sectionCount} filled`, tone: 'blue', text: sectionCount > 0 ? `You have ${sectionCount} sections filled in. Add more to tell a fuller story.` : 'Add about, skills, education and experience to structure your story.', path: '/portfolio/create' },
    ]

    return (
        <DashboardLayout
            userName={userName}
            email={email}
            subtitle={portfolio ? `${sectionCount} sections · ${projectLabel}` : 'No portfolio generated yet'}
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Your Portfolio</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Bring your projects, skills and experience together</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                    <Clock size={13} /> {portfolio ? `Updated ${updated || 'recently'}` : 'Not started'}
                </span>
            </div>

            {source === 'local' && (
                <p className="mt-3 rounded-xl bg-[#fde6d8] px-3 py-2 text-xs text-[#a8400f]">
                    Showing a draft saved on this device. It was not found on your account yet.
                </p>
            )}

            <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-6">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <h4 className="truncate text-lg font-semibold leading-tight">{portfolio ? (portfolio.title || 'Your Portfolio') : 'No portfolios yet'}</h4>
                        <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">
                            {portfolio ? 'Live portfolio preview' : 'Create your first portfolio to organize projects, sections and AI feedback in one place.'}
                        </p>
                    </div>
                    {portfolio && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#dce9fb] px-3 py-1 text-xs font-medium text-[#1f6fdc]">
                                {templateLabel} template
                            </span>
                            {Boolean(portfolio.slug || portfolio.id) && (
                                <ShareLink slug={portfolio.slug || portfolio.id} />
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white sm:p-5 lg:grid-cols-[1fr_1.1fr] lg:gap-6">
                    <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                            <Sparkles size={13} /> AI-assisted portfolio builder
                        </span>

                        <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                            {portfolio ? (portfolio.title || 'Your portfolio') : 'Create your portfolio'}
                        </h3>
                        <p className="mt-3 line-clamp-4 max-w-md text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                            {portfolio
                                ? (portfolio.summary || 'Add a short summary so visitors know who you are.')
                                : 'Turn your skills, projects and experience into a professional portfolio with templates, sections and instant AI feedback.'}
                        </p>

                        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
                            {heroStats.map((s) => (
                                <div key={s.label} className={`rounded-xl p-2 sm:px-3 sm:py-2.5 hover:-translate-y-0.5 ${glass}`}>
                                    <small className="block truncate text-[11px] sm:text-xs text-[#d3e5fa]">{s.label}</small>
                                    <strong className="mt-0.5 block truncate text-xs sm:text-sm font-semibold">{s.value}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
                            <button
                                onClick={() => navigate(editUrl)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 min-[440px]:w-auto sm:px-5 sm:py-3"
                            >
                                {portfolio ? 'Edit Portfolio' : 'Create Portfolio'} <Plus size={16} />
                            </button>
                            <button
                                onClick={() => navigate('/templates')}
                                className={`w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium hover:-translate-y-0.5 active:scale-95 min-[440px]:w-auto sm:px-5 sm:py-3 ${glass}`}
                            >
                                View templates
                            </button>
                        </div>
                    </div>

                    {portfolio ? (
                        <PortfolioHeroDisplay portfolios={heroList} index={activeIndex} onIndexChange={setHeroIndex} />
                    ) : (
                        <div className="group relative min-h-72 overflow-hidden rounded-2xl border border-white/30 bg-white/10 p-3 transition duration-300 hover:bg-white/15 sm:min-h-80 sm:p-4 lg:min-h-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <strong className="block text-sm font-semibold">Portfolio inspiration</strong>
                                    <small className="text-xs text-[#d3e5fa]">Preview your portfolio hero</small>
                                </div>
                                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${glass}`}>
                                    <Sparkles size={13} /> Sample preview
                                </span>
                            </div>
                            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${glass}`}>
                                <CheckCircle2 size={13} /> Make it yours
                            </span>
                            <img
                                src={puppetImg}
                                alt="Hulma mascot"
                                className="pointer-events-none absolute bottom-0 right-2 h-52 w-auto max-w-[70%] origin-bottom object-contain object-bottom transition-transform duration-500 group-hover:scale-105 sm:right-4 sm:h-60 lg:h-[85%]"
                            />
                        </div>
                    )}
                </div>

                {portfolio && (
                    <div className="mt-5">
                        <PortfolioReviewCard
                            portfolio={portfolio}
                            review={review}
                            completion={portfolio.completion}
                            views={portfolio.views}
                            statusText={portfolio.completion >= 100 ? 'Ready to publish' : portfolio.completion > 0 ? 'In progress' : 'Draft'}
                            templateLabel={templateLabel}
                            lastUpdated={updated}
                            sectionCount={sectionCount}
                            onOpen={() => setShowPortfolio(true)}
                            onEdit={() => navigate(editUrl)}
                        />
                    </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {steps.map((s, i) => (
                        <button key={s.title} onClick={() => navigate(s.path === '/portfolio/create' ? editUrl : s.path)} className={`${cardHover} text-left`}>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-transform duration-200 group-hover:scale-110 ${s.done ? TONES.green : TONES[s.tone]}`}>
                                {s.done ? <><CheckCircle2 size={12} /> Done</> : `Step ${i + 1}`}
                            </span>
                            <h5 className="mt-2.5 text-sm font-semibold text-slate-800">{s.title}</h5>
                            <p className="mt-1 text-xs leading-snug text-slate-500">{s.text}</p>
                        </button>
                    ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((f) => (
                        <article key={f.title} className={`flex flex-col ${cardHover}`}>
                            <div className="flex items-center justify-between gap-2">
                                <h5 className="text-sm font-semibold text-slate-800">{f.title}</h5>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-transform duration-200 group-hover:scale-110 ${TONES[f.tone]}`}>{f.badge}</span>
                            </div>
                            <p className="mt-2 line-clamp-4 text-xs leading-snug text-slate-500">{f.text}</p>
                            <button
                                onClick={() => navigate(f.path === '/portfolio/create' ? editUrl : f.path)}
                                className="mt-3 self-start rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                            >
                                Open
                            </button>
                        </article>
                    ))}
                </div>

                {heroList.length > 0 && (
                    <div className="mt-6">
                        <h5 className="text-sm font-semibold text-slate-800">Your completed portfolios</h5>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {heroList.map((p) => (
                                <button key={p?.id ?? p?.title} onClick={() => { setHeroIndex(heroList.indexOf(p)); setShowPortfolio(true); }} className={`${cardHover} text-left`}>
                                    {(() => {
    const pct = Math.min(Math.max(Number(p?.completion) || 0, 0), 100)
    const label = pct >= 100 ? 'Complete' : pct > 0 ? `In progress (${pct}%)` : 'Not started'
    return <>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${pct >= 100 ? 'bg-[#dcf3e7] text-[#12875a]' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}><CheckCircle2 size={12} /> {label}</span>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-[#1f6fdc]" style={{ width: `${pct}%` }} /></div>
        <p className="mt-0.5 text-[11px] text-slate-400">{pct}% complete</p>
    </>
})()}
                                    <h6 className="mt-2 text-sm font-semibold text-slate-800">{p?.title || 'Portfolio'}</h6>
                                    <p className="mt-1 text-xs text-slate-500">{p?.templateId ? titleCase(p.templateId) + ' template' : 'No template'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <PortfolioModal
                portfolio={portfolio}
                open={showPortfolio}
                onClose={() => setShowPortfolio(false)}
                onEdit={() => navigate(editUrl)}
                onDelete={handleDelete}
            />
        </DashboardLayout>
    )
}
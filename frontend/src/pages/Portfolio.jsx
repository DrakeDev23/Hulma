import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/react'
import { Sparkles, Clock, CheckCircle2, Plus, ChevronLeft, ChevronRight, Trash2, Layers, Link as LinkIcon, Zap, ListChecks, History, CircleDot, BarChart3, ArrowRight } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import PortfolioModal from '../components/PortfolioModal'
import { resolvePortfolio, resolvePortfolioList, countSections, reviewInfo, relativeTime, titleCase } from '../utils/portfolioUtils'

const cardHover = 'group rounded-xl bg-[#f3f6fb] p-4 transition duration-300 hover:-translate-y-1 hover:bg-[#e8effa] hover:shadow-md'

export default function Portfolio() {
    const navigate = useNavigate()
    const { user } = useUser()
    const { getToken } = useAuth()
    const { portfolio: raw, loading, error, refetch } = usePortfolio()
    const [showPortfolio, setShowPortfolio] = useState(false)
    const [selectedPortfolio, setSelectedPortfolio] = useState(null)
    const [slideIndex, setSlideIndex] = useState(0)
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })

    const userName = user?.fullName || user?.firstName || user?.username || 'User'
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'

    const { portfolio, source } = useMemo(() => resolvePortfolio(raw), [raw])
    const heroList = useMemo(() => resolvePortfolioList(raw), [raw])

    const d = useMemo(() => {
        const sectionCount = countSections(portfolio)
        const projectCount = portfolio?.projects?.length || 0
        const review = reviewInfo(portfolio?.review)
        return {
            sectionCount, projectCount, review,
            templateLabel: titleCase(portfolio?.templateId) || 'Not chosen',
            updated: relativeTime(portfolio?.updatedAt),
        }
    }, [portfolio])

    const { sectionCount, projectCount, review, templateLabel, updated } = d
    const totalProjects = heroList.reduce((sum, p) => sum + (p.projects?.length || 0), 0)
    const totalSections = heroList.reduce((sum, p) => sum + countSections(p), 0)

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

    const openDeleteConfirm = (id) => {
        if (!id) return
        setDeleteConfirm({ open: true, id })
    }

    const confirmDelete = async () => {
        const id = deleteConfirm.id
        if (!id) return
        try {
            const token = await getToken?.()
            const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
            if (res.ok) { refetch?.(); setSelectedPortfolio(null); setShowPortfolio(false); }
        } catch (e) { console.error('Delete failed', e) }
        finally { setDeleteConfirm({ open: false, id: null }) }
    }

    const checkTips = []
    if (!portfolio?.summary) checkTips.push('Add a short summary')
    if (!portfolio?.sections?.socialLinks || Object.keys(portfolio.sections?.socialLinks || {}).length === 0) checkTips.push('Add social links')
    if (!portfolio?.review) checkTips.push('Run AI review')
    if (portfolio?.completion < 100) checkTips.push('Complete all sections')

    return (
        <DashboardLayout userName={userName} email={email} subtitle={portfolio ? 'Content Health & Quick Actions' : 'Create your first portfolio'}>
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Content Health Center</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Review, edit and optimize your portfolio drafts</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc]">
                    <Clock size={13} /> {portfolio ? `Updated ${updated || 'recently'}` : 'Not started'}
                </span>
            </div>

            {source === 'local' && (
                <p className="mt-3 rounded-xl bg-[#fde6d8] px-3 py-2 text-xs text-[#a8400f]">Showing a draft saved on this device. It was not found on your account yet.</p>
            )}

            <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-[#f3f6fb] to-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><BarChart3 size={14} className="text-[#1f6fdc]" /> Completion Score</div>
                        <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-black text-[#1f6fdc]">{portfolio?.completion || 0}%</span></div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-[#1f6fdc]" style={{ width: `${portfolio?.completion || 0}%` }} /></div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-[#f3f6fb] to-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Zap size={14} className="text-[#ffa502]" /> AI Audit</div>
                        <div className="mt-2 text-3xl font-black text-slate-800">{review?.label || 'Not run yet'}</div>
                        <p className="mt-1 text-xs text-slate-500">{review?.summary || 'Run AI audit for optimization feedback'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-[#f3f6fb] to-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Layers size={14} className="text-[#12875a]" /> Content Count</div>
                        <div className="mt-2 text-3xl font-black text-slate-800">{heroList.length}</div>
                        <p className="mt-1 text-xs text-slate-500">{totalProjects} projects · {totalSections} sections active</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] p-5 text-white shadow-lg shadow-blue-900/10">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-xl font-bold">{portfolio?.title || 'Untitled Portfolio'}</h4>
                                    <p className="text-sm text-[#cfe0fa]">{templateLabel} template · Published</p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">Ready to publish</span>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#cfe0fa]">
                                {portfolio?.id && <a href="#" className="inline-flex items-center gap-1 text-white hover:underline"><LinkIcon size={12} /> Live URL</a>}
                                <span>Updated {updated || 'recently'}</span>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button onClick={() => navigate('/portfolio/create')} className="inline-flex items-center gap-2 rounded-xl bg-white text-[#1d4ed8] px-4 py-2.5 text-sm font-semibold shadow hover:bg-slate-100 active:scale-95">Edit in Portfolio Tab <ArrowRight size={14} /></button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h5 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><ListChecks size={16} className="text-[#1f6fdc]" /> AI Recommendations & Checklist</h5>
                            <ul className="mt-3 space-y-2">
                                {checkTips.length === 0 ? (
                                    <li className="flex items-start gap-2 text-xs text-slate-500"><CheckCircle2 size={14} className="text-green-500 shrink-0" /> All good — portfolio looks complete.</li>
                                ) : checkTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600"><CircleDot size={14} className="text-[#ffa502] shrink-0" /> {tip}</li>
                                ))}
                            </ul>
                            <button onClick={() => navigate('/review')} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1f6fdc] px-4 py-2 text-xs font-medium text-white hover:bg-[#1558c4] shadow transition">Run AI Audit <Zap size={12} /></button>
                        </div>
                    </div>

                    <aside className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h5 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Zap size={16} className="text-[#ffa502]" /> Quick Actions</h5>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button onClick={() => navigate('/portfolio/create')} className="rounded-xl bg-[#f3f6fb] hover:bg-[#e8effa] px-3 py-3 text-xs font-medium text-[#1f6fdc] transition text-center">Add Project</button>
                                <button onClick={() => navigate('/templates')} className="rounded-xl bg-[#f3f6fb] hover:bg-[#e8effa] px-3 py-3 text-xs font-medium text-[#1f6fdc] transition text-center">Change Template</button>
                                <button onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/' + (portfolio?.id || '')); }} className="rounded-xl bg-[#f3f6fb] hover:bg-[#e8effa] px-3 py-3 text-xs font-medium text-[#1f6fdc] transition text-center">Copy Link</button>
                                <button onClick={() => navigate('/review')} className="rounded-xl bg-[#1f6fdc] hover:bg-[#1558c4] px-3 py-3 text-xs font-medium text-white transition text-center shadow">Run AI Audit</button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h5 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><History size={16} className="text-slate-500" /> Recent Activity</h5>
                            <div className="mt-3 space-y-3">
                                <div className="flex gap-2 text-xs text-slate-600"><span className="shrink-0 text-slate-400 w-16">{updated || 'Recently'}</span><span>Portfolio updated · {portfolio?.title || 'Untitled'}</span></div>
                                <div className="flex gap-2 text-xs text-slate-400"><span className="shrink-0 w-16">Earlier</span><span>Created portfolio draft</span></div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-800">Your portfolios</h4>
                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex gap-3 px-3 py-3 overflow-x-auto snap-x snap-mandatory">
                                {heroList.map((p, i) => (
                                    <button key={p?.id ?? i} onClick={() => { setSelectedPortfolio(p); setShowPortfolio(true); }} className={`snap-start shrink-0 rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md text-left px-4 py-3 w-56 ${i === slideIndex ? 'border-[#1f6fdc] bg-[#f3f6fb]' : 'border-slate-200 bg-white'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="block truncate text-sm font-semibold text-slate-800">{p.title || 'Portfolio'}</span>
                                            <span onClick={(e) => { e.stopPropagation(); openDeleteConfirm(p?.id); }} className="text-red-500 hover:text-red-700 cursor-pointer" aria-label="Delete portfolio" role="button" tabIndex={0}><Trash2 size={14} /></span>
                                        </div>
                                        <span className="block truncate text-xs text-slate-500">{titleCase(p.templateId) || 'Simple'} template</span>
                                    </button>
                                ))}
                            </div>
                            {heroList.length >= 5 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
                                <button onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={slideIndex <= 0} className="rounded-full p-1 hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
                                <span className="text-xs text-slate-500">{slideIndex + 1} / {heroList.length}</span>
                                <button onClick={() => setSlideIndex((i) => Math.min(heroList.length - 1, i + 1))} disabled={slideIndex >= heroList.length - 1} className="rounded-full p-1 hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={16} /></button>
                            </div>
                            )}
                        </div>
                    </div>
            </section>

            {deleteConfirm.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
                        <h4 className="text-base font-semibold text-slate-800">Delete portfolio?</h4>
                        <p className="mt-2 text-sm text-slate-500">This action cannot be undone. The portfolio will be permanently removed.</p>
                        <div className="mt-5 flex gap-3 justify-end">
                            <button onClick={() => setDeleteConfirm({ open: false, id: null })} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                            <button onClick={() => confirmDelete()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 shadow transition">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <PortfolioModal portfolio={selectedPortfolio || portfolio} open={showPortfolio} onClose={() => { setShowPortfolio(false); setSelectedPortfolio(null); }} onEdit={() => navigate('/portfolio/create')} />
        </DashboardLayout>
    )
}

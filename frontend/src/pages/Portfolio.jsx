import { useNavigate } from 'react-router-dom'
import { Sparkles, Clock, CheckCircle2, Plus } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import puppetImg from '../assets/puppet.png'

const HERO_STATS = [
    { label: 'Templates', value: '3 ready' },
    { label: 'Sections', value: '12 built-in' },
    { label: 'AI review', value: 'Instant feedback' },
]

const STEPS = [
    { num: '01', tone: 'blue', title: 'Choose a template', text: 'Start with a curated layout and swap sections in seconds.' },
    { num: '02', tone: 'green', title: 'Add projects and sections', text: 'Organize case studies, skills and experience into a clear story.' },
    { num: '03', tone: 'orange', title: 'Review AI feedback', text: 'Get clarity checks, tone suggestions and publish-ready guidance.' },
]

const FEATURES = [
    {
        title: 'AI review',
        badge: 'Instant feedback',
        tone: 'green',
        text: 'Get clarity checks, tone suggestions and publish-ready guidance as soon as you add content.',
        path: '/review',
    },
    {
        title: 'Templates',
        badge: '24 ready',
        tone: 'blue',
        text: 'Browse curated layouts for designers, writers, product teams and creative professionals.',
        path: '/templates',
    },
    {
        title: 'Sections',
        badge: '12 built-in',
        tone: 'blue',
        text: 'Use pre-built blocks for hero, about, projects, skills and testimonials to keep your story structured.',
        path: '/templates',
    },
]

const TONES = {
    blue: 'bg-[#dce9fb] text-[#1f6fdc]',
    green: 'bg-[#dcf3e7] text-[#12875a]',
    orange: 'bg-[#fde6d8] text-[#e0561b]',
}

const glass = 'border border-white/40 bg-white/15 backdrop-blur-sm transition duration-200 hover:bg-white/25'

export default function Portfolio({ userName = 'Drake', email = 'youremail@gmail.com' }) {
    const navigate = useNavigate()
    const { portfolio, loading, error } = usePortfolio()

    if (loading) return <DashboardLayout userName={userName} email={email} subtitle="Loading portfolio..."><div className="mt-6 text-center text-slate-500">Loading...</div></DashboardLayout>
    if (error) return <DashboardLayout userName={userName} email={email} subtitle="Portfolio error"><div className="mt-4 rounded-2xl bg-red-50 p-6 text-red-700 shadow"><p className="font-medium">Failed to load portfolio.</p><button onClick={() => window.location.reload()} className="mt-3 rounded-xl bg-[#1f6fdc] px-4 py-2 text-sm font-medium text-white hover:bg-[#1558c4]">Retry</button></div></DashboardLayout>
    const hasPortfolio = Boolean(portfolio)

    return (
        <DashboardLayout userName={userName} email={email} subtitle="Create your first portfolio · Start with a template">
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Your Portfolio</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Bring your projects, skills and experience together</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                    <Clock size={13} /> Ready when you are
                </span>
            </div>

            <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-6">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <h4 className="text-lg font-semibold leading-tight">{portfolio ? (portfolio.title || 'Your Portfolio') : 'No portfolios yet'}</h4>
                        <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">{portfolio ? 'Live portfolio preview' : 'Create your first portfolio to organize projects, sections and AI feedback in one place.'}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#dce9fb] px-3 py-1 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:scale-105 hover:bg-[#cfe0fa]">
                        24 templates ready
                    </span>
                </div>

                <div className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white sm:p-5 lg:grid-cols-[1fr_1.1fr] lg:gap-6">
                    <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                            <Sparkles size={13} /> AI-assisted portfolio builder
                        </span>

                        <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">Create your portfolio</h3>
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                            Turn your skills, projects and experience into a professional portfolio with templates, sections and instant AI feedback.
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
                            {portfolio ? (
                                <button
                                    onClick={() => navigate('/portfolio/create')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-[#1558c4] active:scale-95 sm:px-5 sm:py-3"
                                >
                                    Edit Portfolio <Plus size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/portfolio/create')}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 sm:px-5 sm:py-3"
                            >
                                Create Portfolio <Plus size={18} />
                            </button>
                            )}
                            <button
                                onClick={() => navigate('/templates')}
                                className={`rounded-xl px-4 py-2.5 text-sm font-medium hover:-translate-y-0.5 active:scale-95 sm:px-5 sm:py-3 ${glass}`}
                            >
                                View templates
                            </button>
                        </div>
                    </div>

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
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {STEPS.map((s) => (
                        <article key={s.num} className="group rounded-xl bg-[#f3f6fb] p-4 transition duration-300 hover:-translate-y-1 hover:bg-[#e8effa] hover:shadow-md">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-transform duration-200 group-hover:scale-110 ${TONES[s.tone]}`}>{s.num}</span>
                            <h5 className="mt-2.5 text-sm font-semibold text-slate-800">{s.title}</h5>
                            <p className="mt-1 text-xs leading-snug text-slate-500">{s.text}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {FEATURES.map((f) => (
                        <article key={f.title} className="flex flex-col group rounded-xl bg-[#f3f6fb] p-4 transition duration-300 hover:-translate-y-1 hover:bg-[#e8effa] hover:shadow-md">
                            <div className="flex items-center justify-between gap-2">
                                <h5 className="text-sm font-semibold text-slate-800">{f.title}</h5>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-transform duration-200 group-hover:scale-110 ${TONES[f.tone]}`}>{f.badge}</span>
                            </div>
                            <p className="mt-2 text-xs leading-snug text-slate-500">{f.text}</p>
                            <button
                                onClick={() => navigate(f.path)}
                                className="mt-3 self-start rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                            >
                                Open
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </DashboardLayout>
    )
}
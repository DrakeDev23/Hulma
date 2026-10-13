import { useNavigate } from 'react-router-dom'
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

const ACTIVITY = [
    { Icon: FileText, tone: 'blue', title: 'Added new project case study', text: 'Northstar redesign draft was saved to your portfolio', time: '2m ago' },
    { Icon: CheckCircle2, tone: 'green', title: 'AI review completed', text: 'Your portfolio passed 9 of 10 clarity checks', time: '18m ago' },
    { Icon: Link2, tone: 'orange', title: 'Public link copied', text: 'Shared with hiring managers and your network', time: '1h ago' },
]

const NEXT_STEPS = [
    { Icon: PenLine, tone: 'blue', title: 'Add a stronger headline', text: 'Make your hero copy more concise and outcome-focused' },
    { Icon: CheckCircle2, tone: 'green', title: 'Review AI feedback', text: '9 clarity checks passed and 1 suggestion remains' },
    { Icon: Link2, tone: 'orange', title: 'Share public link', text: 'Send the latest version to your network and hiring managers' },
]

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

export default function Dashboard({ userName = 'Drake', email = 'youremail@gmail.com' }) {
    const navigate = useNavigate()

    return (
        <DashboardLayout userName={userName} email={email} subtitle="3 active portfolios · 12 sections ready to publish">
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
                            onClick={() => navigate('/portfolio')}
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

                    <article className={card}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="text-lg font-semibold leading-tight sm:text-xl">Portfolio Preview</h4>
                                <p className="mt-0.5 text-xs text-slate-500">Drake's personal portfolio · 3 sections</p>
                            </div>
                            <span className={bluePill}>
                                <CheckCircle2 size={13} /> Ready to publish
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
                                DESIGN
                                <br />
                                PORTFOLIO
                            </div>
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-[#1c3f9c] transition-transform duration-300 hover:scale-110 px-3 py-1.5 text-[11px] font-medium text-white sm:right-3 sm:px-3.5 sm:py-2 sm:text-xs">
                                <Eye size={14} /> 128 views
                            </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-[#eef2f9] px-2.5 py-0.5">3 sections</span>
                            <span className="rounded-full bg-[#eef2f9] px-2.5 py-0.5">2 projects</span>
                            <span className="rounded-full bg-[#dcf3e7] px-2.5 py-0.5 text-[#12875a]">AI review</span>
                            <span className="ml-auto text-xs text-slate-500">Last edited today</span>
                        </div>
                    </article>

                    <article className={card}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="text-base font-semibold leading-tight sm:text-lg">Recent activity</h4>
                                <p className="mt-0.5 text-xs text-slate-500">What changed in your portfolio today</p>
                            </div>
                            <button className={pillBtn}>View all</button>
                        </div>
                        <ul className="mt-3 flex flex-col gap-2.5">
                            {ACTIVITY.map((a) => (
                                <Row key={a.title} {...a} right={<time className="shrink-0 text-[11px] text-slate-500 sm:text-xs">{a.time}</time>} />
                            ))}
                        </ul>
                    </article>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-1">
                    <article className={card}>
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-base font-semibold sm:text-lg">Portfolio stats</h4>
                            <span className={bluePill}>
                                <Sparkles size={13} /> This week
                            </span>
                        </div>

                        <div className="my-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                <small className="block text-xs text-slate-500">Views</small>
                                <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">128</strong>
                                <em className="text-[10px] not-italic leading-tight text-[#12875a] sm:text-[11px]">+18% vs last week</em>
                            </div>
                            <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                <small className="block text-xs text-slate-500">Sections</small>
                                <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">12</strong>
                                <em className="text-[10px] not-italic leading-tight text-[#1f6fdc] sm:text-[11px]">3 ready to publish</em>
                            </div>
                            <div className="rounded-xl bg-[#f3f6fb] px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e8effa] sm:px-3">
                                <small className="block text-xs text-slate-500">Projects</small>
                                <strong className="block text-2xl font-semibold leading-tight sm:text-[28px]">6</strong>
                                <em className="text-[10px] not-italic leading-tight text-[#e0561b] sm:text-[11px]">2 need review</em>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs">
                                <span>Completion</span>
                                <span>82%</span>
                            </div>
                            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#e1e8f4]">
                                <div className="h-full w-[82%] rounded-full bg-[#1f6fdc]" />
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
                                <CheckCircle2 size={13} /> 3 tasks
                            </span>
                        </div>
                        <ul className="mt-3 flex flex-col gap-2.5">
                            {NEXT_STEPS.map((s) => (
                                <Row key={s.title} {...s} right={<button className={pillBtn}>Open</button>} />
                            ))}
                        </ul>
                    </article>
                </div>
            </div>
        </DashboardLayout>
    )
}
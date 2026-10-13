import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Sparkles,
    Clock,
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
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

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

function readTemplate() {
    try {
        return localStorage.getItem(TEMPLATE_KEY)
    } catch {
        return null
    }
}

/**
 * Sample review used when the backend endpoint isn't available yet.
 * The real endpoint should return the same shape:
 * { score, summary, categories: [{ key, label, score, note }],
 *   suggestions: [{ id, category, priority, title, text }] }
 */
function buildSampleReview(template) {
    const name = TEMPLATE_NAMES[template] ?? 'your'
    const byTemplate = {
        simple: {
            id: 't1',
            title: 'Add one visual anchor to the Simple layout',
            text: 'Simple works best with a strong first section. Add a project image or a short pull quote under the hero so the page does not read as only text.',
        },
        modern: {
            id: 't1',
            title: 'Keep card heights consistent',
            text: 'Modern layouts rely on even cards. Trim project descriptions to two lines so the grid stays aligned on every screen size.',
        },
        creative: {
            id: 't1',
            title: 'Calm down the background shapes behind text',
            text: 'Creative is bold, so keep body text on a plain surface. Move decorative shapes away from paragraphs to protect readability.',
        },
    }
    const templateTip = byTemplate[template] ?? {
        id: 't1',
        title: 'Choose a template to get a tailored review',
        text: 'Pick Simple, Modern or Creative on the Templates page so feedback can match the layout you are using.',
    }

    return {
        score: 82,
        summary: `Your ${name} portfolio has a clear structure. The biggest gains are a more outcome-focused headline and tighter spacing between sections.`,
        categories: [
            { key: 'template', label: 'Template fit', score: 88, note: 'Layout suits your content type' },
            { key: 'layout', label: 'Layout and spacing', score: 76, note: 'Sections feel slightly uneven' },
            { key: 'design', label: 'Color and typography', score: 84, note: 'Palette is consistent' },
            { key: 'content', label: 'Content clarity', score: 80, note: 'Headline can be more specific' },
        ],
        suggestions: [
            {
                id: 's1',
                category: 'content',
                priority: 'high',
                title: 'Rewrite the hero headline around an outcome',
                text: 'Replace a job title with the result you deliver, for example "I design onboarding flows that lift activation." Keep it under 12 words.',
            },
            {
                id: 's2',
                category: 'layout',
                priority: 'high',
                title: 'Use the same spacing between all sections',
                text: 'Your project section sits closer to the hero than the skills section does. Use one vertical spacing value across sections.',
            },
            { ...templateTip, category: 'template', priority: 'medium' },
            {
                id: 's4',
                category: 'design',
                priority: 'medium',
                title: 'Limit accent colors to one',
                text: 'Use your blue accent for buttons and links only. Extra accent colors on headings pull attention away from your projects.',
            },
            {
                id: 's5',
                category: 'content',
                priority: 'low',
                title: 'Add a one-line result to each project',
                text: 'Under each project title add a short result such as "Cut checkout time by 30%". Numbers help hiring managers scan quickly.',
            },
        ],
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
                    strokeDashoffset={c * (1 - value / 100)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <div className="absolute text-center">
                <strong className="block text-3xl font-semibold leading-none sm:text-4xl">{value}</strong>
                <small className="text-[11px] text-[#d3e5fa]">out of 100</small>
            </div>
        </div>
    )
}

export default function Review({ userName = 'Drake', email = 'youremail@gmail.com' }) {
    const navigate = useNavigate()
    const template = readTemplate()
    const templateName = TEMPLATE_NAMES[template]

    const [status, setStatus] = useState('idle') // idle | loading | done
    const [result, setResult] = useState(null)
    const [usedSample, setUsedSample] = useState(false)
    const [done, setDone] = useState({})

    const runReview = async () => {
        setStatus('loading')
        setDone({})
        try {
            const res = await fetch('/api/portfolio/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                },
                body: JSON.stringify({ template }),
            })
            if (!res.ok) throw new Error('Review request failed')
            setResult(await res.json())
            setUsedSample(false)
        } catch {
            // Backend not ready yet: show sample feedback so the page is usable.
            await new Promise((r) => setTimeout(r, 900))
            setResult(buildSampleReview(template))
            setUsedSample(true)
        }
        setStatus('done')
    }

    const toggleDone = (id) => setDone((d) => ({ ...d, [id]: !d[id] }))
    const doneCount = result ? result.suggestions.filter((s) => done[s.id]).length : 0

    return (
        <DashboardLayout userName={userName} email={email} subtitle="Design and layout feedback for your portfolio">
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">AI Review</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
                        Get feedback on your template, design and format, with suggestions to improve.
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                    <Clock size={13} /> {status === 'done' ? 'Reviewed just now' : 'Not reviewed yet'}
                </span>
            </div>

            <section className="mt-4 grid gap-5 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:p-5 lg:grid-cols-[1.12fr_1fr] lg:gap-6">
                <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${glass}`}>
                        <Sparkles size={13} /> AI-assisted review
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                        {status === 'done' ? 'Your portfolio review' : 'Review your portfolio'}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-[#bcd7f6] sm:text-base">
                        {status === 'done'
                            ? result.summary
                            : 'We check your template, layout, color, typography and content, then suggest what to change first.'}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            onClick={runReview}
                            disabled={status === 'loading'}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-4 py-2.5 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 sm:px-5 sm:py-3"
                        >
                            {status === 'loading' ? (
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
                        <button
                            onClick={() => navigate('/templates')}
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium hover:-translate-y-0.5 active:scale-95 sm:px-5 sm:py-3 ${glass}`}
                        >
                            Change template
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/30 bg-white/10 p-3 sm:p-4">
                    {status === 'done' ? (
                        <>
                            <ScoreRing value={result.score} />
                            <div className="min-w-0">
                                <strong className="block text-sm font-semibold">Overall score</strong>
                                <small className="block text-xs text-[#d3e5fa]">
                                    {doneCount} of {result.suggestions.length} suggestions done
                                </small>
                                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${glass}`}>
                                    <LayoutGrid size={12} /> {templateName ?? 'No'} template
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="min-w-0 py-2">
                            <strong className="block text-sm font-semibold">What gets reviewed</strong>
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

            {!template && status !== 'done' && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#fde6d8] p-3.5 text-sm text-[#e0561b]">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p className="min-w-0">
                        You have not chosen a template yet. Pick one first so the review can match your layout.
                    </p>
                </div>
            )}

            {status === 'done' && (
                <>
                    {usedSample && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#dce9fb] p-3.5 text-sm text-[#1f6fdc]">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="min-w-0">
                                The review service did not respond, so this is sample feedback. Connect <code>/api/portfolio/review</code> to see real results.
                            </p>
                        </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {result.categories.map((c) => {
                            const Icon = CATEGORY_ICONS[c.key] ?? Sparkles
                            const tone = c.score >= 85 ? 'green' : c.score >= 75 ? 'blue' : 'orange'
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

                        <ul className="mt-3 flex flex-col gap-2.5">
                            {result.suggestions.map((s) => {
                                const Icon = CATEGORY_ICONS[s.category] ?? Sparkles
                                const p = PRIORITY[s.priority] ?? PRIORITY.medium
                                const isDone = !!done[s.id]
                                return (
                                    <li
                                        key={s.id}
                                        className={`flex items-start gap-2.5 rounded-xl px-2.5 py-3 transition duration-200 hover:bg-[#e8effa] sm:gap-3 sm:px-3 ${isDone ? 'bg-[#eef6f1]' : 'bg-[#f3f6fb]'}`}
                                    >
                                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9 ${TONES[isDone ? 'green' : p.tone]}`}>
                                            {isDone ? <Check size={16} /> : <Icon size={16} />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className={`text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm ${isDone ? 'line-through opacity-60' : ''}`}>
                                                    {s.title}
                                                </p>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TONES[p.tone]}`}>{p.label}</span>
                                            </div>
                                            <p className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">{s.text}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleDone(s.id)}
                                            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95 sm:px-3.5"
                                        >
                                            {isDone ? 'Undo' : 'Mark done'}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <CheckCircle2 size={14} className="text-[#12875a]" />
                                {doneCount} of {result.suggestions.length} completed
                            </span>
                            <button
                                onClick={() => navigate('/portfolio')}
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
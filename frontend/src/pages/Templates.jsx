import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, FileText, LayoutGrid, Palette, Clock } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

const STORAGE_KEY = 'hulma-template'

function SimplePreview() {
    return (
        <div className="h-full rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="h-1.5 w-10 rounded bg-slate-300" />
                <div className="flex gap-1.5">
                    <div className="h-1.5 w-5 rounded bg-slate-200" />
                    <div className="h-1.5 w-5 rounded bg-slate-200" />
                    <div className="h-1.5 w-5 rounded bg-slate-200" />
                </div>
            </div>
            <div className="mt-5 h-3 w-28 rounded bg-slate-800" />
            <div className="mt-2 h-1.5 w-36 rounded bg-slate-300" />
            <div className="mt-1.5 h-1.5 w-28 rounded bg-slate-200" />
            <div className="mt-4 h-px bg-slate-200" />
            <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <div className="h-2 w-12 rounded bg-[#1f6fdc]" />
                    <div className="h-1.5 w-full rounded bg-slate-200" />
                    <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                    <div className="h-2 w-12 rounded bg-[#1f6fdc]" />
                    <div className="h-1.5 w-full rounded bg-slate-200" />
                    <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                </div>
            </div>
        </div>
    )
}

function ModernPreview() {
    return (
        <div className="h-full rounded-lg bg-[#eaf1fc] p-3">
            <div className="rounded-lg bg-linear-to-br from-[#3e90e2] to-[#1b5c9a] p-3">
                <div className="h-2.5 w-24 rounded bg-white" />
                <div className="mt-2 h-1.5 w-32 rounded bg-white/60" />
                <div className="mt-3 h-4 w-14 rounded-md bg-white/90" />
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-md bg-white p-2 shadow-sm">
                        <div className="h-3 w-3 rounded bg-[#1f6fdc]" />
                        <div className="mt-2 h-1.5 w-full rounded bg-slate-200" />
                        <div className="mt-1 h-1.5 w-2/3 rounded bg-slate-200" />
                    </div>
                ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-md bg-white p-2 shadow-sm">
                <div className="h-5 w-5 rounded-full bg-[#dce9fb]" />
                <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-3/4 rounded bg-slate-300" />
                    <div className="h-1.5 w-1/2 rounded bg-slate-200" />
                </div>
            </div>
        </div>
    )
}

function CreativePreview() {
    return (
        <div className="relative h-full overflow-hidden rounded-lg bg-[#14306b]">
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[#3e90e2]" />
            <div className="absolute bottom-3 left-4 h-14 w-14 rotate-12 rounded-[40%] bg-orange-400" />
            <div className="absolute bottom-6 right-10 h-8 w-8 rotate-45 rounded-md bg-emerald-400" />
            <div className="absolute left-4 top-3 text-4xl font-black leading-none text-white">Aa</div>
            <div className="absolute left-4 top-16 h-1.5 w-20 rounded bg-white/70" />
            <div className="absolute left-4 top-20 h-1.5 w-14 rounded bg-white/40" />
            <div className="absolute right-4 top-4 h-10 w-14 -rotate-6 rounded-md bg-white shadow-lg" />
            <div className="absolute right-8 top-9 h-10 w-14 rotate-6 rounded-md bg-[#dce9fb] shadow-lg" />
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

function readSaved() {
    try {
        return localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

export default function Templates({ userName = 'Drake', email = 'youremail@gmail.com' }) {
    const navigate = useNavigate()
    const [selected, setSelected] = useState(readSaved)
    const current = TEMPLATES.find((t) => t.id === selected)

    const choose = (id) => {
        setSelected(id)
        try {
            localStorage.setItem(STORAGE_KEY, id)
        } catch {
            return
        }
    }

    return (
        <DashboardLayout userName={userName} email={email} subtitle="Pick a layout for your portfolio">
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Choose a template</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Select the layout you want. You can change it anytime.</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition duration-200 hover:bg-[#1f6fdc] hover:text-white">
                    <Clock size={13} /> 3 templates available
                </span>
            </div>

            <div role="radiogroup" aria-label="Portfolio templates" className="mt-4 grid gap-4 md:grid-cols-3">
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

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    choose(id)
                                }}
                                className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 active:scale-95 ${isSelected
                                        ? 'bg-[#1f6fdc] text-white hover:bg-[#1558c4]'
                                        : 'border border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc]'
                                    }`}
                            >
                                {isSelected ? (
                                    <>
                                        <Check size={16} /> Selected
                                    </>
                                ) : (
                                    'Choose template'
                                )}
                            </button>
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
                <button
                    type="button"
                    disabled={!current}
                    onClick={() => navigate('/portfolio')}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-[#1b64dc] px-5 py-3 text-sm font-medium shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                    Continue <ArrowRight size={18} />
                </button>
            </div>
        </DashboardLayout>
    )
}
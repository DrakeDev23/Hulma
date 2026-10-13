import { useState } from 'react'
import { Clock, Check, User, LayoutGrid, Sparkles, Lock, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

const SETTINGS_KEY = 'hulma-settings'
const TEMPLATE_KEY = 'hulma-template'

const FOCUS_AREAS = [
    { id: 'template', label: 'Template fit' },
    { id: 'layout', label: 'Layout and spacing' },
    { id: 'design', label: 'Color and typography' },
    { id: 'content', label: 'Content clarity' },
]

const DEFAULTS = {
    username: 'Drake',
    email: 'youremail@gmail.com',
    defaultTemplate: 'simple',
    publicLink: true,
    autoReview: false,
    focus: ['template', 'layout', 'design', 'content'],
    tone: 'balanced',
}

const card = 'rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-5'
const input =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-[#1f6fdc] focus:outline-none focus:ring-2 focus:ring-[#1f6fdc]/20'
const label = 'mb-1.5 block text-xs font-medium text-slate-600'

function load() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
    } catch {
        return DEFAULTS
    }
}

function Section({ Icon, title, text, children }) {
    return (
        <article className={card}>
            <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#dce9fb] text-[#1f6fdc]">
                    <Icon size={17} />
                </span>
                <div className="min-w-0">
                    <h4 className="text-base font-semibold leading-tight sm:text-lg">{title}</h4>
                    <p className="mt-0.5 text-xs text-slate-500">{text}</p>
                </div>
            </div>
            <div className="mt-4">{children}</div>
        </article>
    )
}

function Toggle({ checked, onChange, title, text }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f6fb] px-3 py-3">
            <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 sm:text-sm">{title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{text}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={title}
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6fdc] ${checked ? 'bg-[#1f6fdc]' : 'bg-slate-300'}`}
            >
                <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
                />
            </button>
        </div>
    )
}

export default function Settings({ userName = 'Drake', email = 'youremail@gmail.com' }) {
    const [form, setForm] = useState(load)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [pwMsg, setPwMsg] = useState(null)

    const set = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }))
        setSaved(false)
    }

    const toggleFocus = (id) => {
        const has = form.focus.includes(id)
        set('focus', has ? form.focus.filter((f) => f !== id) : [...form.focus, id])
    }

    const onSave = (e) => {
        e.preventDefault()
        if (!form.username.trim()) return setError('Enter a username.')
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
        if (form.focus.length === 0) return setError('Choose at least one AI review focus area.')
        setError('')
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(form))
            localStorage.setItem(TEMPLATE_KEY, form.defaultTemplate)
            setSaved(true)
        } catch {
            setError('Could not save settings in this browser.')
        }
        // TODO: also send `form` to your backend, e.g. PUT /api/user/settings
    }

    const onChangePassword = (e) => {
        e.preventDefault()
        if (pw.next.length < 8) return setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' })
        if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'New passwords do not match.' })
        // TODO: call your backend, e.g. POST /api/user/password
        setPw({ current: '', next: '', confirm: '' })
        setPwMsg({ ok: true, text: 'Password updated.' })
    }

    return (
        <DashboardLayout userName={form.username || userName} email={form.email || email} subtitle="Manage your account and preferences">
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Settings</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Update your profile, portfolio defaults and AI review preferences</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#1f6fdc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6fdc]">
                    <Clock size={13} /> {saved ? 'All changes saved' : 'Unsaved changes'}
                </span>
            </div>

            <form onSubmit={onSave} className="mt-4 grid gap-4 lg:grid-cols-2">
                <Section Icon={User} title="Profile" text="How you appear in Hulma">
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="username" className={label}>Username</label>
                            <input id="username" className={input} value={form.username} onChange={(e) => set('username', e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="email" className={label}>Email</label>
                            <input id="email" type="email" className={input} value={form.email} onChange={(e) => set('email', e.target.value)} />
                        </div>
                    </div>
                </Section>

                <Section Icon={LayoutGrid} title="Portfolio defaults" text="Applied when you create a new portfolio">
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="template" className={label}>Default template</label>
                            <select id="template" className={input} value={form.defaultTemplate} onChange={(e) => set('defaultTemplate', e.target.value)}>
                                <option value="simple">Simple</option>
                                <option value="modern">Modern</option>
                                <option value="creative">Creative</option>
                            </select>
                        </div>
                        <Toggle
                            checked={form.publicLink}
                            onChange={(v) => set('publicLink', v)}
                            title="Public link"
                            text="Anyone with the link can view your published portfolio"
                        />
                    </div>
                </Section>

                <div className="lg:col-span-2">
                    <Section Icon={Sparkles} title="AI review" text="Choose what the AI looks at and how it responds">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <span className={label}>Focus areas</span>
                                <div className="flex flex-wrap gap-2">
                                    {FOCUS_AREAS.map((a) => {
                                        const on = form.focus.includes(a.id)
                                        return (
                                            <button
                                                key={a.id}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => toggleFocus(a.id)}
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition duration-200 active:scale-95 ${on ? 'bg-[#1f6fdc] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-[#1f6fdc] hover:text-[#1f6fdc]'}`}
                                            >
                                                {on && <Check size={13} />} {a.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="tone" className={label}>Feedback style</label>
                                    <select id="tone" className={input} value={form.tone} onChange={(e) => set('tone', e.target.value)}>
                                        <option value="gentle">Gentle: encouraging, few changes</option>
                                        <option value="balanced">Balanced: clear and practical</option>
                                        <option value="direct">Direct: strict, detailed critique</option>
                                    </select>
                                </div>
                            </div>
                            <div className="self-start">
                                <Toggle
                                    checked={form.autoReview}
                                    onChange={(v) => set('autoReview', v)}
                                    title="Review on save"
                                    text="Run an AI review every time you save your portfolio"
                                />
                            </div>
                        </div>
                    </Section>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                    <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-5 py-3 text-sm font-medium text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95"
                    >
                        <Check size={17} /> Save changes
                    </button>
                    {error && <p role="alert" className="text-sm text-[#e0561b]">{error}</p>}
                    {saved && !error && <p role="status" className="text-sm text-[#12875a]">Settings saved.</p>}
                </div>
            </form>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <form onSubmit={onChangePassword}>
                    <Section Icon={Lock} title="Password" text="Use at least 8 characters">
                        <div className="grid gap-3">
                            <div>
                                <label htmlFor="pw-current" className={label}>Current password</label>
                                <input id="pw-current" type="password" autoComplete="current-password" className={input} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="pw-new" className={label}>New password</label>
                                    <input id="pw-new" type="password" autoComplete="new-password" className={input} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="pw-confirm" className={label}>Confirm new password</label>
                                    <input id="pw-confirm" type="password" autoComplete="new-password" className={input} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-200 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95">
                                    Update password
                                </button>
                                {pwMsg && (
                                    <p role="status" className={`text-sm ${pwMsg.ok ? 'text-[#12875a]' : 'text-[#e0561b]'}`}>{pwMsg.text}</p>
                                )}
                            </div>
                        </div>
                    </Section>
                </form>

                <Section Icon={Trash2} title="Delete account" text="This removes your portfolios and cannot be undone">
                    <button
                        type="button"
                        onClick={() => window.confirm('Delete your account and all portfolios? This cannot be undone.')}
                        className="rounded-xl bg-[#fde6d8] px-4 py-2.5 text-sm font-medium text-[#e0561b] transition duration-200 hover:bg-[#fbd5bd] active:scale-95"
                    >
                        Delete account
                    </button>
                </Section>
            </div>
        </DashboardLayout>
    )
}
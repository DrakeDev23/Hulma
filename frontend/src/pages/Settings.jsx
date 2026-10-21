import { useEffect, useState } from 'react'
import { useUser, useAuth, useClerk } from '@clerk/react'
import { Check, User, LayoutGrid, Sparkles, Lock, Trash2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { resolveDisplayName } from '../utils/portfolioUtils'
import { apiUrl } from '../utils/api'

import { clearAuthSession } from '../utils/session'

const FOCUS_AREAS = [
    { id: 'template', label: 'Template fit' },
    { id: 'layout', label: 'Layout and spacing' },
    { id: 'design', label: 'Color and typography' },
    { id: 'content', label: 'Content clarity' },
]

const DEFAULTS = {
    username: '',
    email: '',
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

const isPlaceholderEmail = (email) => {
    if (!email || typeof email !== 'string') return true
    const lower = email.trim().toLowerCase()
    return lower.includes('@clerk.local') || lower.includes('@example.com') || lower.startsWith('user_')
}

const isPlaceholderUsername = (uname) => {
    if (!uname || typeof uname !== 'string') return true
    const trimmed = uname.trim()
    return (
        (trimmed.startsWith('user_') && trimmed.length > 20) ||
        trimmed.toLowerCase() === 'user' ||
        trimmed.toLowerCase() === 'untitled'
    )
}

function loadLocal(userId) {
    if (!userId) return DEFAULTS
    try {
        const raw = localStorage.getItem(`hulma-settings:${userId}`)
        if (!raw) return DEFAULTS
        const parsed = JSON.parse(raw)
        return {
            ...DEFAULTS,
            defaultTemplate: parsed.defaultTemplate ?? DEFAULTS.defaultTemplate,
            publicLink: parsed.publicLink ?? DEFAULTS.publicLink,
            autoReview: parsed.autoReview ?? DEFAULTS.autoReview,
            focus: Array.isArray(parsed.focus) && parsed.focus.length ? parsed.focus : DEFAULTS.focus,
            tone: parsed.tone ?? DEFAULTS.tone,
        }
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

export default function Settings() {
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const { signOut } = useClerk()

    const clerkEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
    const clerkUsername = resolveDisplayName(user, '')

    const [form, setForm] = useState(() => ({
        ...loadLocal(user?.id),
        username: clerkUsername || '',
        email: clerkEmail || '',
    }))
    const [saved, setSaved] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [error, setError] = useState('')
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
    const [pwMsg, setPwMsg] = useState(null)
    const [isUpdatingPw, setIsUpdatingPw] = useState(false)

    useEffect(() => {
        if (!user) return
        setForm((f) => ({
            ...f,
            username: f.username || clerkUsername || '',
            email: f.email || clerkEmail || '',
        }))
    }, [user, clerkUsername, clerkEmail])

    useEffect(() => {
        let isMounted = true

        const fetchServerSettings = async () => {
            try {
                const token = await getToken()
                if (!token) return

                const headers = {
                    Authorization: `Bearer ${token}`,
                }

                const res = await fetch(apiUrl('/api/auth/me'), { headers })
                if (!res.ok) return
                const data = await res.json()

                if (isMounted && data) {
                    setForm((prev) => {
                        const serverSettings = data.settings || {}
                        const serverUser = !isPlaceholderUsername(data.username) ? data.username : ''
                        const serverMail = !isPlaceholderEmail(data.email) ? data.email : ''

                        const authoritativeUser = clerkUsername || serverUser || prev.username || ''
                        const authoritativeMail = clerkEmail || serverMail || prev.email || ''

                        const merged = {
                            ...prev,
                            username: authoritativeUser,
                            email: authoritativeMail,
                            defaultTemplate: serverSettings.defaultTemplate ?? prev.defaultTemplate ?? 'simple',
                            publicLink: serverSettings.publicLink ?? prev.publicLink ?? true,
                            autoReview: serverSettings.autoReview ?? prev.autoReview ?? false,
                            focus: Array.isArray(serverSettings.focus) && serverSettings.focus.length > 0 ? serverSettings.focus : prev.focus,
                            tone: serverSettings.tone ?? prev.tone ?? 'balanced',
                        }
                        if (user?.id) {
                            try {
                                localStorage.setItem(`hulma-settings:${user.id}`, JSON.stringify({
                                    defaultTemplate: merged.defaultTemplate,
                                    publicLink: merged.publicLink,
                                    autoReview: merged.autoReview,
                                    focus: merged.focus,
                                    tone: merged.tone,
                                }))
                                if (merged.defaultTemplate) {
                                    localStorage.setItem(`hulma-template:${user.id}`, merged.defaultTemplate)
                                }
                            } catch {}
                        }
                        return merged
                    })
                }
            } catch (err) {
                console.warn('Could not fetch server settings:', err)
            }
        }

        if (isLoaded && user?.id) {
            fetchServerSettings()
        }

        return () => {
            isMounted = false
        }
    }, [isLoaded, getToken, user?.id, clerkEmail, clerkUsername])

    const set = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }))
        setSaved(false)
        setError('')
    }

    const toggleFocus = (id) => {
        const has = form.focus.includes(id)
        const updated = has ? form.focus.filter((f) => f !== id) : [...form.focus, id]
        set('focus', updated)
    }

    const onSave = async (e) => {
        e.preventDefault()
        if (!form.username.trim()) return setError('Enter a username.')
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
        if (form.focus.length === 0) return setError('Choose at least one AI review focus area.')
        setError('')
        setIsSaving(true)

        try {
            if (user && typeof user.update === 'function') {
                try {
                    const trimmedName = form.username.trim()
                    const parts = trimmedName.split(/\s+/)
                    const firstName = parts[0] || ''
                    const lastName = parts.slice(1).join(' ')
                    await user.update({
                        firstName,
                        lastName: lastName || '',
                        unsafeMetadata: {
                            ...user.unsafeMetadata,
                            username: trimmedName,
                        },
                    })
                } catch (clerkErr) {
                    console.warn('Clerk user update notice:', clerkErr)
                }
            }

            const token = await getToken()
            const res = await fetch(apiUrl('/api/auth/me'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    username: form.username.trim(),
                    email: form.email.trim(),
                    settings: {
                        defaultTemplate: form.defaultTemplate,
                        publicLink: form.publicLink,
                        autoReview: form.autoReview,
                        focus: form.focus,
                        tone: form.tone,
                    },
                }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => null)
                throw new Error(errData?.detail || 'Could not save settings on the server.')
            }

            if (user?.id) {
                try {
                    localStorage.setItem(`hulma-settings:${user.id}`, JSON.stringify({
                        defaultTemplate: form.defaultTemplate,
                        publicLink: form.publicLink,
                        autoReview: form.autoReview,
                        focus: form.focus,
                        tone: form.tone,
                    }))
                    localStorage.setItem(`hulma-template:${user.id}`, form.defaultTemplate)
                } catch {}
            }
            setSaved(true)
        } catch (err) {
            setError(err?.message || 'Could not save settings.')
        } finally {
            setIsSaving(false)
        }
    }

    const onChangePassword = async (e) => {
        e.preventDefault()
        setPwMsg(null)
        if (pw.next.length < 8) return setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' })
        if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'New passwords do not match.' })

        setIsUpdatingPw(true)
        try {
            if (user && typeof user.updatePassword === 'function') {
                if (user?.passwordEnabled === false) {
                    await user.updatePassword({ newPassword: pw.next })
                    setPw({ current: '', next: '', confirm: '' })
                    setPwMsg({ ok: true, text: 'Password set successfully! You can now also sign in with your email and password.' })
                } else {
                    if (!pw.current) {
                        setIsUpdatingPw(false)
                        return setPwMsg({ ok: false, text: 'Please enter your current password.' })
                    }
                    await user.updatePassword({ currentPassword: pw.current, newPassword: pw.next })
                    setPw({ current: '', next: '', confirm: '' })
                    setPwMsg({ ok: true, text: 'Password updated successfully.' })
                }
            } else {
                setPwMsg({ ok: true, text: 'Password updates are managed through your account security provider.' })
            }
        } catch (err) {
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Could not update password.'
            setPwMsg({ ok: false, text: msg })
        } finally {
            setIsUpdatingPw(false)
        }
    }

    const onDeleteAccount = () => {
        setShowDeleteModal(true)
    }

    const confirmDeleteAccount = async () => {
        setIsDeleting(true)
        setError('')

        try {
            const token = await getToken()
            if (token) {
                const res = await fetch(apiUrl('/api/auth/me'), {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                if (!res.ok) {
                    const errData = await res.json().catch(() => null)
                    throw new Error(errData?.detail || 'Failed to delete account on server.')
                }
            }

            clearAuthSession()

            if (user && typeof user.delete === 'function') {
                try {
                    await user.delete()
                } catch (clerkErr) {
                    console.warn('Clerk user delete skipped:', clerkErr)
                }
            }

            if (signOut) {
                await signOut({ redirectUrl: '/' })
            } else {
                window.location.href = '/'
            }
        } catch (err) {
            setError('Could not delete account: ' + (err?.message || 'Unknown error'))
            setIsDeleting(false)
            setShowDeleteModal(false)
        }
    }

    const currentDisplay = clerkUsername || (!isPlaceholderUsername(form.username) ? form.username : '') || 'User'
    const currentEmail = clerkEmail || (!isPlaceholderEmail(form.email) ? form.email : '') || ''

    return (
        <DashboardLayout
            userName={currentDisplay}
            email={currentEmail}
            eyebrow="Your account, {name}"
            title={
                <>
                    Make Hulma work <span className="text-[#1d6fe0]">your</span> <span className="text-[#2020d0]">way</span>
                </>
            }
            subtitle="Manage your account and preferences"
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Settings</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Update your profile, portfolio defaults and AI review preferences</p>
                </div>
                
            </div>

            <form onSubmit={onSave} className="mt-4 grid gap-4 lg:grid-cols-2">
                <Section Icon={User} title="Profile" text="How you appear in Hulma">
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="username" className={label}>Username</label>
                            <input
                                id="username"
                                className={input}
                                value={form.username}
                                onChange={(e) => set('username', e.target.value)}
                                placeholder="e.g. johndoe"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className={label}>Email</label>
                            <input
                                id="email"
                                type="email"
                                className={input}
                                value={form.email}
                                onChange={(e) => set('email', e.target.value)}
                                placeholder="youremail@example.com"
                            />
                        </div>
                    </div>
                </Section>

                <Section Icon={LayoutGrid} title="Portfolio defaults" text="Applied when you create a new portfolio">
                    <div className="grid gap-3">
                        <div>
                            <label htmlFor="template" className={label}>Default template</label>
                            <select
                                id="template"
                                className={input}
                                value={form.defaultTemplate}
                                onChange={(e) => set('defaultTemplate', e.target.value)}
                            >
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
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition duration-200 active:scale-95 ${
                                                    on
                                                        ? 'bg-[#1f6fdc] text-white shadow-sm'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:border-[#1f6fdc] hover:text-[#1f6fdc]'
                                                }`}
                                            >
                                                {on && <Check size={13} />} {a.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="tone" className={label}>Feedback style</label>
                                    <select
                                        id="tone"
                                        className={input}
                                        value={form.tone}
                                        onChange={(e) => set('tone', e.target.value)}
                                    >
                                        <option value="gentle">Gentle: encouraging, soft critique</option>
                                        <option value="balanced">Balanced: clear and practical</option>
                                        <option value="direct">Direct: strict, detailed recruiter critique</option>
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
                        disabled={isSaving}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-[#1f6fdc] px-5 py-3 text-sm font-medium text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                        {isSaving ? 'Saving changes...' : 'Save changes'}
                    </button>
                    {error && (
                        <p role="alert" className="inline-flex items-center gap-1.5 text-sm text-[#e0561b]">
                            <AlertCircle size={15} /> {error}
                        </p>
                    )}
                    {saved && !error && <p role="status" className="text-sm font-medium text-[#12875a]">Settings saved.</p>}
                </div>
            </form>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <form onSubmit={onChangePassword}>
                    <Section
                        Icon={Lock}
                        title={user?.passwordEnabled === false ? 'Set password' : 'Password'}
                        text={user?.passwordEnabled === false ? 'Enable password sign-in for your account' : 'Use at least 8 characters'}
                    >
                        <div className="grid gap-3">
                            {user?.passwordEnabled === false ? (
                                <div className="rounded-xl bg-[#dce9fb]/70 p-3 text-xs leading-relaxed text-[#1f6fdc]">
                                    You are signed in with Google. You can create a password below to allow signing in directly with your email as well.
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="pw-current" className={label}>Current password</label>
                                    <div className="relative">
                                        <input
                                            id="pw-current"
                                            type={showPw.current ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            className={`${input} pr-10`}
                                            value={pw.current}
                                            onChange={(e) => setPw({ ...pw, current: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((prev) => ({ ...prev, current: !prev.current }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                                            aria-label={showPw.current ? 'Hide password' : 'Show password'}
                                        >
                                            {showPw.current ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="pw-new" className={label}>New password</label>
                                    <div className="relative">
                                        <input
                                            id="pw-new"
                                            type={showPw.next ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            className={`${input} pr-10`}
                                            value={pw.next}
                                            onChange={(e) => setPw({ ...pw, next: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((prev) => ({ ...prev, next: !prev.next }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                                            aria-label={showPw.next ? 'Hide password' : 'Show password'}
                                        >
                                            {showPw.next ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="pw-confirm" className={label}>Confirm new password</label>
                                    <div className="relative">
                                        <input
                                            id="pw-confirm"
                                            type={showPw.confirm ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            className={`${input} pr-10`}
                                            value={pw.confirm}
                                            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw((prev) => ({ ...prev, confirm: !prev.confirm }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                                            aria-label={showPw.confirm ? 'Hide password' : 'Show password'}
                                        >
                                            {showPw.confirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isUpdatingPw}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-200 hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95 disabled:opacity-60"
                                >
                                    {isUpdatingPw && <Loader2 size={15} className="animate-spin" />}
                                    {isUpdatingPw
                                        ? 'Saving password...'
                                        : user?.passwordEnabled === false
                                          ? 'Set password'
                                          : 'Update password'}
                                </button>
                                {pwMsg && (
                                    <p role="status" className={`text-sm ${pwMsg.ok ? 'text-[#12875a]' : 'text-[#e0561b]'}`}>{pwMsg.text}</p>
                                )}
                            </div>
                        </div>
                    </Section>
                </form>

                <Section Icon={Trash2} title="Delete account" text="This removes your portfolios and cannot be undone">
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500">
                            Once your account is deleted, all created portfolios, uploaded images, and reviews will be permanently deleted.
                        </p>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={onDeleteAccount}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#fde6d8] px-4 py-2.5 text-sm font-medium text-[#e0561b] transition duration-200 hover:bg-[#fbd5bd] active:scale-95 disabled:opacity-60"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            {isDeleting ? 'Deleting account...' : 'Delete account'}
                        </button>
                    </div>
                </Section>
            </div>

            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                    onClick={() => !isDeleting && setShowDeleteModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200/90 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
                                <Trash2 className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 id="delete-account-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                                    Delete Account?
                                </h3>
                                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                                    Are you sure you want to delete your account? All your portfolios, uploaded images, and settings will be permanently removed. This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="h-11 sm:h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px] sm:min-h-0"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteAccount}
                                disabled={isDeleting}
                                className="h-11 sm:h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-60 cursor-pointer min-h-[44px] sm:min-h-0"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>Delete account</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
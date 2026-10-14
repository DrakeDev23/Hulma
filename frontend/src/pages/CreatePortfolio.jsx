import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { ArrowRight, BrainCircuit, Lightbulb, Save, Share2, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ShareLink, { buildShareUrl, getShareSlug } from '../components/ShareLink'

const MAX_IMAGE_BYTES = 7 * 1024 * 1024
const REVIEW_KEY = 'hulmaPortfolioReview'
const DRAFT_KEY = 'hulmaPortfolio'

const DEFAULT_FORM = {
    title: '',
    fullName: '',
    profilePicture: '',
    email: '',
    contactNumber: '',
    address: '',
    aboutMe: '',
    education: '',
    skills: '',
    projects: '',
    workExperience: '',
    socialLinks: '',
}

const safeGet = (key) => {
    try {
        return window.localStorage.getItem(key)
    } catch {
        return null
    }
}

const safeSet = (key, value) => {
    try {
        window.localStorage.setItem(key, value)
    } catch {
        return
    }
}

const readReview = () => {
    try {
        const raw = safeGet(REVIEW_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

const parseList = (value) =>
    value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)

const parseLines = (value) =>
    value
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean)

const parseProjects = (value) =>
    parseLines(value).map((line) => ({
        name: line.split(':')[0]?.trim() || 'Project',
        description: line.includes(':') ? line.split(':').slice(1).join(':').trim() : line,
        link: '',
    }))

const parseLinks = (value) =>
    parseLines(value).reduce((acc, line) => {
        const [label, ...rest] = line.split(':')
        const key = label.trim() || 'Link'
        const url = rest.join(':').trim()
        if (url) acc[key] = url
        return acc
    }, {})

function buildPortfolioPayload(form, user, emailAddress, templateId) {
    const fullName = form.fullName || user?.fullName || user?.firstName || ''
    const email = form.email || emailAddress || ''

    const checks = [fullName, form.aboutMe, form.skills, form.projects, form.education, form.workExperience, form.socialLinks]
    const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100)

    return {
        title: form.title || (fullName ? `${fullName}'s Portfolio` : 'My Portfolio'),
        summary: form.aboutMe,
        sections: {
            meta: { templateId },
            profile: {
                fullName,
                profilePicture: form.profilePicture || '',
                email,
                contactNumber: form.contactNumber || '',
                address: form.address || '',
                aboutMe: form.aboutMe || '',
            },
            education: parseLines(form.education),
            skills: parseList(form.skills),
            workExperience: parseLines(form.workExperience),
            socialLinks: parseLinks(form.socialLinks),
        },
        projects: parseProjects(form.projects),
        views: 0,
        completion,
    }
}

const inputClass = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700'

export default function CreatePortfolio() {
    const navigate = useNavigate()
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
    const urlTemplate = searchParams.get('template')
    const { getToken } = useAuth()
    const { user } = useUser()
    const userId = user?.id
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''

    const userRef = useRef({ user, emailAddress })
    userRef.current = { user, emailAddress }

    const [form, setForm] = useState(DEFAULT_FORM)
    const [review, setReview] = useState(readReview)
    const [isSaving, setIsSaving] = useState(false)
    const [isReviewing, setIsReviewing] = useState(false)
    const [notice, setNotice] = useState('')
    const [selectedImageName, setSelectedImageName] = useState('')
    const [loadedTemplate, setLoadedTemplate] = useState('')
    const [slug, setSlug] = useState('')

    const templateId = urlTemplate || loadedTemplate || safeGet('hulma-template') || 'simple'

    useEffect(() => {
        if (!userId) return
        let cancelled = false

        const loadCurrentPortfolio = async () => {
            try {
                const token = await getToken()
                const res = await fetch('/api/portfolio/me', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })

                if (!res.ok) return
                const data = await res.json()
                if (!data || cancelled) return
                const portfolioData = Array.isArray(data) ? data[0] : data
                if (!portfolioData) return
                const { user: currentUser, emailAddress: currentEmail } = userRef.current
                const profile = portfolioData.sections?.profile || {}
                setForm({
                    title: portfolioData.title || '',
                    fullName: profile.fullName || currentUser?.fullName || '',
                    profilePicture: profile.profilePicture || '',
                    email: profile.email || currentEmail || '',
                    contactNumber: profile.contactNumber || '',
                    address: profile.address || '',
                    aboutMe: profile.aboutMe || '',
                    education: Array.isArray(portfolioData.sections?.education) ? portfolioData.sections.education.join('\n') : '',
                    skills: Array.isArray(portfolioData.sections?.skills) ? portfolioData.sections.skills.join(', ') : '',
                    projects: Array.isArray(portfolioData.projects) ? portfolioData.projects.map((project) => `${project.name}: ${project.description}`).join('\n\n') : '',
                    workExperience: Array.isArray(portfolioData.sections?.workExperience) ? portfolioData.sections.workExperience.join('\n') : '',
                    socialLinks: portfolioData.sections?.socialLinks ? Object.entries(portfolioData.sections.socialLinks).map(([key, value]) => `${key}: ${value}`).join('\n') : '',
                })
                setSelectedImageName(profile.profilePicture ? profile.profilePicture.split('/').pop() || '' : '')
                setLoadedTemplate(portfolioData.sections?.meta?.templateId || '')
                setSlug(getShareSlug(portfolioData))
            } catch (error) {
                console.error('Failed to load portfolio:', error)
            }
        }

        loadCurrentPortfolio()
        return () => {
            cancelled = true
        }
    }, [userId, getToken])

    const uploadProfilePicture = async (file) => {
        if (!file) return ''

        if (!file.type.startsWith('image/')) {
            throw new Error('Please choose a valid image file.')
        }

        if (file.size > MAX_IMAGE_BYTES) {
            throw new Error('Image must be 7 MB or smaller.')
        }

        const token = await getToken()
        if (!token) {
            throw new Error('Your Clerk session is expired. Please log in again.')
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/portfolio/images/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        })

        if (!response.ok) {
            const rawText = await response.text()
            let message = 'Image upload failed.'

            try {
                const parsed = rawText ? JSON.parse(rawText) : null
                message = parsed?.detail || parsed?.message || rawText || message
            } catch {
                message = rawText || message
            }

            throw new Error(message)
        }

        const payload = await response.json()
        return payload.url
    }

    const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

    const previewPortfolio = useMemo(
        () => buildPortfolioPayload(form, user, emailAddress, templateId),
        [form, user, emailAddress, templateId],
    )

    const canReview = Boolean(
        form.fullName || form.aboutMe || form.skills || form.projects || form.workExperience || form.education || form.socialLinks
    )

    const getAuthHeaders = async () => {
        const token = await getToken()
        if (!token) {
            throw new Error('No Clerk session token available. Please sign in again.')
        }

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setNotice('')

        try {
            const response = await fetch('/api/portfolio/me', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(previewPortfolio),
            })

            if (!response.ok) {
                const text = await response.text()
                if (response.status === 401) {
                    throw new Error('Your session is expired or invalid. Please log in again.')
                }
                throw new Error(text || 'Failed to save portfolio')
            }

            const saved = await response.json()
            safeSet(DRAFT_KEY, JSON.stringify(saved))
            const savedSlug = getShareSlug(saved)
            if (savedSlug) {
                setSlug(savedSlug)
                setNotice('Portfolio saved. Your public link is ready to share.')
            } else {
                setNotice('Portfolio saved, but the server did not return an id or slug for the public link.')
            }
            return saved
        } catch (error) {
            console.error(error)
            setNotice(error.message || 'Could not save the portfolio yet. Please check your session and try again.')
            return null
        } finally {
            setIsSaving(false)
        }
    }

    const handleReview = async () => {
        if (!canReview) {
            setNotice('Add your portfolio information before running AI review.')
            setReview(null)
            return false
        }

        setIsReviewing(true)
        setReview(null)
        setNotice('')

        try {
            const response = await fetch('/api/portfolio/review', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(previewPortfolio),
            })

            if (!response.ok) {
                const text = await response.text()
                if (response.status === 401) {
                    throw new Error('Your session is expired or invalid. Please log in again.')
                }
                throw new Error(text || 'Review request failed')
            }

            const data = await response.json()
            setReview(data)
            safeSet(REVIEW_KEY, JSON.stringify({ ...data, reviewed_at: new Date().toISOString() }))
            setNotice('AI review completed.')
            return true
        } catch (error) {
            console.error(error)
            setNotice(error.message || 'AI review is unavailable right now. Please try again.')
            return false
        } finally {
            setIsReviewing(false)
        }
    }

    const handleSubmit = async () => {
        const saved = await handleSave()
        if (saved) {
            await handleReview()
            navigate('/portfolio/live')
        }
    }

    const shareUrl = buildShareUrl(slug)

    return (
        <DashboardLayout
            userName={user?.fullName || user?.firstName || 'Portfolio creator'}
            email={emailAddress || 'No email'}
            subtitle="Fill in your portfolio details"
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Create Portfolio</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Add your information, save it, and share it with a public link. View your finished portfolio from the dashboard.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleReview}
                        disabled={isReviewing || !canReview}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <BrainCircuit size={16} /> {isReviewing ? 'Reviewing...' : 'AI review'}
                    </button>
                </div>
            </div>

            <section className="mt-4 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className={labelClass}>
                            Portfolio title
                            <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="My Portfolio" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Full Name
                            <input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Jane Doe" className={inputClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className={labelClass}>
                            Profile Picture
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={async (event) => {
                                    const file = event.target.files?.[0]
                                    if (!file) {
                                        setSelectedImageName('')
                                        return
                                    }

                                    setSelectedImageName(file.name.split(/[\\/]/).pop() || 'image')

                                    try {
                                        const uploadedUrl = await uploadProfilePicture(file)
                                        updateField('profilePicture', uploadedUrl)
                                        setNotice('Profile picture uploaded successfully.')
                                    } catch (error) {
                                        console.error(error)
                                        setNotice(error.message || 'Please choose a valid image file.')
                                    }
                                }}
                                className={inputClass}
                            />
                            {selectedImageName ? (
                                <span className="mt-1 text-[11px] font-medium text-slate-500">Selected file: {selectedImageName}</span>
                            ) : (
                                <span className="mt-1 text-[11px] text-slate-400">No file selected</span>
                            )}
                        </label>
                        <label className={labelClass}>
                            Email
                            <input value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className={labelClass}>
                            Contact Number
                            <input value={form.contactNumber} onChange={(e) => updateField('contactNumber', e.target.value)} placeholder="+1 555 123 4567" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Address
                            <input value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Lagos, Nigeria" className={inputClass} />
                        </label>
                    </div>

                    <label className={labelClass}>
                        About Me
                        <textarea
                            value={form.aboutMe}
                            onChange={(e) => updateField('aboutMe', e.target.value)}
                            rows={4}
                            placeholder="I design and build digital experiences that feel simple, useful, and memorable."
                            className={inputClass}
                        />
                    </label>

                    <label className={labelClass}>
                        Educational Background (one entry per line)
                        <textarea
                            value={form.education}
                            onChange={(e) => updateField('education', e.target.value)}
                            rows={3}
                            placeholder={'B.Sc. Computer Science - University of Lagos\n2020 - 2024'}
                            className={inputClass}
                        />
                    </label>

                    <label className={labelClass}>
                        Skills (separated by commas)
                        <input
                            value={form.skills}
                            onChange={(e) => updateField('skills', e.target.value)}
                            placeholder="Product design, UX research, React, Product strategy"
                            className={inputClass}
                        />
                    </label>

                    <label className={labelClass}>
                        Projects (Name: description, one per line)
                        <textarea
                            value={form.projects}
                            onChange={(e) => updateField('projects', e.target.value)}
                            rows={4}
                            placeholder={'Hulma redesign: Rebuilt the portfolio experience across landing pages and onboarding flows.\nGrowth dashboard: Built analytics views for product teams.'}
                            className={inputClass}
                        />
                    </label>

                    <label className={labelClass}>
                        Work Experience (one entry per line)
                        <textarea
                            value={form.workExperience}
                            onChange={(e) => updateField('workExperience', e.target.value)}
                            rows={4}
                            placeholder={'Product Designer - Pixel Labs\n2022 - Present\nBuilt user flows, improved conversion, and supported design systems.'}
                            className={inputClass}
                        />
                    </label>

                    <label className={labelClass}>
                        Social Media / Website Links (Label: url, one per line)
                        <textarea
                            value={form.socialLinks}
                            onChange={(e) => updateField('socialLinks', e.target.value)}
                            rows={3}
                            placeholder={'LinkedIn: https://linkedin.com/in/janedoe\nGitHub: https://github.com/janedoe\nPortfolio: https://janedoe.dev'}
                            className={inputClass}
                        />
                    </label>
                </div>

                <aside className="h-fit space-y-4 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:p-5 xl:sticky xl:top-4">
                    <div className="flex items-center gap-2">
                        <Share2 size={18} />
                        <h4 className="text-lg font-semibold">Public link</h4>
                    </div>

                    {shareUrl ? (
                        <>
                            <ShareLink slug={slug} dark />
                            <p className="text-xs text-[#d3e5fa]">Anyone with this link can view your portfolio. Save again to publish your latest changes.</p>
                        </>
                    ) : (
                        <p className="rounded-2xl border border-white/30 bg-white/10 p-4 text-sm leading-relaxed text-[#eaf3ff]">
                            Save your portfolio to get a public link you can share.
                        </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <Sparkles size={18} />
                        <h4 className="text-lg font-semibold">AI review</h4>
                    </div>

                    {review ? (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-[#d3e5fa]">Score</span>
                                <span className="text-2xl font-semibold">{review.score}</span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-[#ebf3ff]">{review.summary}</p>
                            {Array.isArray(review.suggestions) && review.suggestions.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {review.suggestions.slice(0, 4).map((s) => (
                                        <li key={s} className="flex gap-1.5 text-xs leading-snug text-[#ebf3ff]">
                                            <Lightbulb size={12} className="mt-0.5 shrink-0" /> {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4 text-sm leading-relaxed text-[#eaf3ff]">
                            Add your portfolio content, then run the AI review for feedback.
                        </div>
                    )}

                    {notice && (
                        <div role="status" className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-xs text-[#ebf3ff]">
                            {notice}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || isReviewing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b64dc] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Save and review <ArrowRight size={16} />
                    </button>
                </aside>
            </section>
        </DashboardLayout>
    )
}
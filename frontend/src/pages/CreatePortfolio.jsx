import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { ArrowRight, BrainCircuit, CheckCircle2, Globe, Mail, MapPin, Phone, Save, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'

const MAX_IMAGE_BYTES = 7 * 1024 * 1024

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

const parseList = (value) =>
    value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)

const parseProjects = (value) => {
    const lines = value
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean)

    if (!lines.length) return []

    return lines.map((line) => ({
        name: line.split(':')[0]?.trim() || 'Project',
        description: line.includes(':') ? line.split(':').slice(1).join(':').trim() : line,
        impact: 'Impact tracked and documented',
        link: '',
    }))
}

const parseLinks = (value) => {
    const lines = value
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean)

    if (!lines.length) return {}

    return lines.reduce((acc, line) => {
        const [label, ...rest] = line.split(':')
        const key = label.trim() || 'Link'
        const url = rest.join(':').trim()
        if (url) acc[key] = url
        return acc
    }, {})
}

function buildPortfolioPayload(form, user, emailAddress) {
    const fullName = form.fullName || user?.fullName || user?.firstName || 'Portfolio Owner'
    const email = form.email || emailAddress || 'your@email.com'

    const payload = {
        title: form.title || `${fullName}'s Portfolio`,
        summary: form.aboutMe || 'Focused on building impactful digital experiences and measurable outcomes.',
        sections: {
            profile: {
                fullName,
                profilePicture: form.profilePicture || '',
                email,
                contactNumber: form.contactNumber || '',
                address: form.address || '',
                aboutMe: form.aboutMe || '',
            },
            education: parseList(form.education),
            skills: parseList(form.skills),
            workExperience: parseList(form.workExperience),
            socialLinks: parseLinks(form.socialLinks),
        },
        projects: parseProjects(form.projects),
        views: 0,
        completion: 0,
    }

    const filledFields = [
        fullName,
        form.aboutMe,
        form.skills,
        form.projects,
        form.education,
        form.workExperience,
        form.socialLinks,
    ].filter(Boolean).length

    payload.completion = Math.min(100, Math.max(30, filledFields * 12))
    return payload
}

export default function CreatePortfolio() {
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const { user } = useUser()
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''

    const [form, setForm] = useState(DEFAULT_FORM)
    const [review, setReview] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isReviewing, setIsReviewing] = useState(false)
    const [notice, setNotice] = useState('')
    const [selectedImageName, setSelectedImageName] = useState('')

    useEffect(() => {
        const loadCurrentPortfolio = async () => {
            try {
                const token = await getToken()
                const res = await fetch('/api/portfolio/me', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })

                if (!res.ok) return
                const data = await res.json()
                if (!data) return

                const profile = data.sections?.profile || {}
                const currentImageName = profile.profilePicture ? profile.profilePicture.split('/').pop() || '' : ''
                setForm({
                    title: data.title || '',
                    fullName: profile.fullName || user?.fullName || '',
                    profilePicture: profile.profilePicture || '',
                    email: profile.email || emailAddress || '',
                    contactNumber: profile.contactNumber || '',
                    address: profile.address || '',
                    aboutMe: profile.aboutMe || '',
                    education: Array.isArray(data.sections?.education) ? data.sections.education.join('\n') : '',
                    skills: Array.isArray(data.sections?.skills) ? data.sections.skills.join(', ') : '',
                    projects: Array.isArray(data.projects) ? data.projects.map((project) => `${project.name}: ${project.description}`).join('\n\n') : '',
                    workExperience: Array.isArray(data.sections?.workExperience) ? data.sections.workExperience.join('\n') : '',
                    socialLinks: data.sections?.socialLinks ? Object.entries(data.sections.socialLinks).map(([key, value]) => `${key}: ${value}`).join('\n') : '',
                })
                setSelectedImageName(currentImageName)
            } catch (error) {
                console.error('Failed to load portfolio:', error)
            }
        }

        loadCurrentPortfolio()
    }, [emailAddress, getToken, user])

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
            headers: {
                Authorization: `Bearer ${token}`,
            },
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

    const preview = useMemo(() => {
        const fullName = form.fullName || user?.fullName || 'Your Name'
        const email = form.email || emailAddress || 'your@email.com'
        const skills = parseList(form.skills)
        const education = parseList(form.education)
        const workExperience = parseList(form.workExperience)
        const projects = parseProjects(form.projects)
        const links = parseLinks(form.socialLinks)

        return { fullName, email, skills, education, workExperience, projects, links }
    }, [emailAddress, form, user])

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
            const payload = buildPortfolioPayload(form, user, emailAddress)
            const response = await fetch('/api/portfolio/me', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const text = await response.text()
                if (response.status === 401) {
                    throw new Error('Your session is expired or invalid. Please log in again.')
                }
                throw new Error(text || 'Failed to save portfolio')
            }

            const saved = await response.json()
            localStorage.setItem('hulmaPortfolio', JSON.stringify(saved))
            setNotice('Portfolio saved successfully. Preview is ready below.')
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
            return
        }

        setIsReviewing(true)
        setReview(null)
        setNotice('')

        try {
            const payload = buildPortfolioPayload(form, user, emailAddress)
            const response = await fetch('/api/portfolio/review', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(payload),
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
            setNotice('AI review completed.')
        } catch (error) {
            console.error(error)
            setReview({
                summary: 'Your portfolio is clear and strong. Add a few measurable results and tighten the headline to increase impact.',
                score: 84,
                suggestions: [
                    'Highlight one measurable outcome for each project.',
                    'Keep the profile summary direct and specific.',
                    'Use consistent spacing and keep the strongest work first.',
                ],
            })
            setNotice(error.message || 'AI review is unavailable right now, so a sample review was used instead.')
        } finally {
            setIsReviewing(false)
        }
    }

    const handleSubmit = async () => {
        const saved = await handleSave()
        if (saved) {
            await handleReview()
            navigate('/portfolio')
        }
    }

    return (
        <DashboardLayout
            userName={user?.fullName || user?.firstName || 'Portfolio creator'}
            email={emailAddress || 'your@email.com'}
            subtitle="Fill in your portfolio details and review the final preview"
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Create Portfolio</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Add your portfolio information, review it, and save a live preview.</p>
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
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                            Portfolio title
                            <input
                                value={form.title}
                                onChange={(event) => updateField('title', event.target.value)}
                                placeholder="My Portfolio"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                            Full Name
                            <input
                                value={form.fullName}
                                onChange={(event) => updateField('fullName', event.target.value)}
                                placeholder="Jane Doe"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
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

                                    const fileName = file.name.split(/[\\/]/).pop() || 'image'
                                    setSelectedImageName(fileName)

                                    try {
                                        const uploadedUrl = await uploadProfilePicture(file)
                                        updateField('profilePicture', uploadedUrl)
                                        setNotice('Profile picture uploaded successfully.')
                                    } catch (error) {
                                        console.error(error)
                                        setNotice(error.message || 'Please choose a valid image file.')
                                    }
                                }}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                            {selectedImageName ? (
                                <span className="mt-1 text-[11px] font-medium text-slate-500">Selected file: {selectedImageName}</span>
                            ) : (
                                <span className="mt-1 text-[11px] text-slate-400">No file selected</span>
                            )}
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                            Email
                            <input
                                value={form.email}
                                onChange={(event) => updateField('email', event.target.value)}
                                placeholder="you@example.com"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                            Contact Number
                            <input
                                value={form.contactNumber}
                                onChange={(event) => updateField('contactNumber', event.target.value)}
                                placeholder="+1 555 123 4567"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                            Address
                            <input
                                value={form.address}
                                onChange={(event) => updateField('address', event.target.value)}
                                placeholder="Lagos, Nigeria"
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                            />
                        </label>
                    </div>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        About Me
                        <textarea
                            value={form.aboutMe}
                            onChange={(event) => updateField('aboutMe', event.target.value)}
                            rows={4}
                            placeholder="I design and build digital experiences that feel simple, useful, and memorable."
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Educational Background
                        <textarea
                            value={form.education}
                            onChange={(event) => updateField('education', event.target.value)}
                            rows={3}
                            placeholder="B.Sc. Computer Science - University of Lagos\n2020 - 2024"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Skills
                        <input
                            value={form.skills}
                            onChange={(event) => updateField('skills', event.target.value)}
                            placeholder="Product design, UX research, React, Product strategy"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Projects
                        <textarea
                            value={form.projects}
                            onChange={(event) => updateField('projects', event.target.value)}
                            rows={4}
                            placeholder="Hulma redesign: Rebuilt the portfolio experience across landing pages and onboarding flows.\n\nGrowth dashboard: Built analytics views for product teams."
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Work Experience
                        <textarea
                            value={form.workExperience}
                            onChange={(event) => updateField('workExperience', event.target.value)}
                            rows={4}
                            placeholder="Product Designer - Pixel Labs\n2022 - Present\nBuilt user flows, improved conversion, and supported design systems."
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Social Media / Website Links
                        <textarea
                            value={form.socialLinks}
                            onChange={(event) => updateField('socialLinks', event.target.value)}
                            rows={3}
                            placeholder="LinkedIn: https://linkedin.com/in/janedoe\nGitHub: https://github.com/janedoe\nPortfolio: https://janedoe.dev"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#1f6fdc] focus:bg-white"
                        />
                    </label>
                </div>

                <aside className="space-y-4 rounded-2xl bg-linear-to-br from-[#3e90e2] via-[#2272c4] to-[#1b5c9a] p-4 text-white shadow-md sm:p-5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} />
                        <h4 className="text-lg font-semibold">Live portfolio preview</h4>
                    </div>

                    <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                        <div className="flex items-center gap-3">
                            {form.profilePicture ? (
                                <img src={form.profilePicture} alt={preview.fullName} className="h-14 w-14 rounded-full object-cover ring-2 ring-white/40" />
                            ) : (
                                <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-lg font-semibold text-white">
                                    {preview.fullName?.charAt(0)?.toUpperCase() || 'Y'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h5 className="truncate text-lg font-semibold">{preview.fullName}</h5>
                                <p className="text-sm text-[#dbeaff]">{form.title || 'Portfolio'}</p>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-[#ebf3ff]">
                            <div className="flex items-center gap-2"><Mail size={15} /> <span className="truncate">{preview.email}</span></div>
                            {form.contactNumber && <div className="flex items-center gap-2"><Phone size={15} /> <span>{form.contactNumber}</span></div>}
                            {form.address && <div className="flex items-center gap-2"><MapPin size={15} /> <span>{form.address}</span></div>}
                            {Object.keys(preview.links).length > 0 && <div className="flex items-center gap-2"><Globe size={15} /> <span>{Object.keys(preview.links).length} links</span></div>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                        <h6 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d3e5fa]">About</h6>
                        <p className="mt-2 text-sm leading-relaxed text-[#ebf3ff]">{form.aboutMe || 'Add a short introduction about yourself and your work.'}</p>
                    </div>

                    <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                        <h6 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d3e5fa]">Skills</h6>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {preview.skills.length ? preview.skills.map((skill) => (
                                <span key={skill} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] text-white">{skill}</span>
                            )) : <span className="text-sm text-[#ebf3ff]">Add some skills to show your strengths.</span>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                        <h6 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d3e5fa]">Projects</h6>
                        <div className="mt-2 space-y-2 text-sm text-[#ebf3ff]">
                            {preview.projects.length ? preview.projects.map((project) => (
                                <div key={`${project.name}-${project.description}`} className="rounded-xl bg-white/10 p-2.5">
                                    <div className="font-medium">{project.name}</div>
                                    <div className="mt-1 text-xs text-[#dbeaff]">{project.description}</div>
                                </div>
                            )) : <div className="text-sm text-[#ebf3ff]">Project details will appear here once added.</div>}
                        </div>
                    </div>

                    {review ? (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs uppercase tracking-[0.16em] text-[#d3e5fa]">AI score</span>
                                <span className="text-2xl font-semibold">{review.score}</span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-[#ebf3ff]">{review.summary}</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4 text-sm leading-relaxed text-[#eaf3ff]">
                            Add real portfolio content to enable AI scanning and generate review suggestions.
                        </div>
                    )}

                    {notice && (
                        <div className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-xs text-[#ebf3ff]">
                            {notice}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b64dc] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4]"
                    >
                        Save and review <ArrowRight size={16} />
                    </button>
                </aside>
            </section>
        </DashboardLayout>
    )
}

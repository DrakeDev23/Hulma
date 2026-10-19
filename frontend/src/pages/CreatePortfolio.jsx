import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { ArrowRight, Save, Share2, Sparkles, Check, RefreshCw } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ShareLink, { buildShareUrl, getShareSlug } from '../components/ShareLink'
import { resolveDisplayName } from '../utils/portfolioUtils'
import { apiUrl } from '../utils/api'

const MAX_IMAGE_BYTES = 7 * 1024 * 1024
const TEMPLATES = ['simple', 'modern', 'creative']

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

const getDraftKey = (uid) => `hulma-draft:${uid}`

const getDraft = (uid) => {
    if (!uid) return null
    try {
        const raw = window.localStorage.getItem(getDraftKey(uid))
        return raw ? JSON.parse(raw) : null
    } catch (err) {
        console.error('Failed to read draft from localStorage:', err)
        return null
    }
}

const saveDraft = (uid, data) => {
    if (!uid) return
    try {
        window.localStorage.setItem(getDraftKey(uid), JSON.stringify(data))
    } catch (err) {
        console.error('Failed to save draft to localStorage:', err)
    }
}

const removeDraft = (uid) => {
    if (!uid) return
    try {
        window.localStorage.removeItem(getDraftKey(uid))
    } catch (err) {
        console.error('Failed to remove draft from localStorage:', err)
    }
}

const getImageNameFromUrl = (url) => (url ? url.split(/[\\/]/).pop() || '' : '')

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

function portfolioToForm(portfolioData, currentUser, currentEmail) {
    const profile = portfolioData?.sections?.profile || {}
    return {
        title: portfolioData?.title || '',
        fullName: profile.fullName || resolveDisplayName(currentUser, ''),
        profilePicture: profile.profilePicture || '',
        email: profile.email || currentEmail || '',
        contactNumber: profile.contactNumber || '',
        address: profile.address || '',
        aboutMe: profile.aboutMe || '',
        education: Array.isArray(portfolioData?.sections?.education)
            ? portfolioData.sections.education.join('\n')
            : '',
        skills: Array.isArray(portfolioData?.sections?.skills)
            ? portfolioData.sections.skills.join(', ')
            : '',
        projects: Array.isArray(portfolioData?.projects)
            ? portfolioData.projects.map((project) => `${project.name}: ${project.description}`).join('\n\n')
            : '',
        workExperience: Array.isArray(portfolioData?.sections?.workExperience)
            ? portfolioData.sections.workExperience.join('\n')
            : '',
        socialLinks: portfolioData?.sections?.socialLinks
            ? Object.entries(portfolioData.sections.socialLinks).map(([key, value]) => `${key}: ${value}`).join('\n')
            : '',
    }
}

function buildPortfolioPayload(form, user, emailAddress, templateId) {
    const fullName = form.fullName || resolveDisplayName(user, '')
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
    const navigateRef = useRef(navigate)
    useEffect(() => {
        navigateRef.current = navigate
    }, [navigate])

    const [searchParams] = useSearchParams()
    const urlTemplate = searchParams.get('template')
    const { getToken } = useAuth()
    const { user } = useUser()
    const userId = user?.id
    const emailAddress = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''

    const userRef = useRef({ user, emailAddress })
    useEffect(() => {
        userRef.current = { user, emailAddress }
    }, [user, emailAddress])

    const urlTemplateRef = useRef(urlTemplate)
    useEffect(() => {
        urlTemplateRef.current = urlTemplate
    }, [urlTemplate])

    const [savedDraft] = useState(() => {
        const rawDraft = userId ? getDraft(userId) : null
        return rawDraft && rawDraft.version === 1 ? rawDraft : null
    })
    const savedDraftRef = useRef(savedDraft)
    useEffect(() => {
        savedDraftRef.current = savedDraft
    }, [savedDraft])

    const [form, setForm] = useState(() => {
        if (savedDraft?.form && savedDraft.version === 1) {
            return { ...DEFAULT_FORM, ...savedDraft.form }
        }
        return DEFAULT_FORM
    })
    const [selectedImageName, setSelectedImageName] = useState(() => {
        if (savedDraft?.selectedImageName !== undefined) {
            return savedDraft.selectedImageName
        }
        if (savedDraft?.form?.profilePicture) {
            return getImageNameFromUrl(savedDraft.form.profilePicture)
        }
        return ''
    })
    const [isDirty, setIsDirty] = useState(() => Boolean(savedDraft?.form && savedDraft.version === 1))
    const isDirtyRef = useRef(isDirty)
    useEffect(() => {
        isDirtyRef.current = isDirty
    }, [isDirty])

    const [draftFeedback, setDraftFeedback] = useState(null)
    const [portfolioId, setPortfolioId] = useState(null)
    const [userPortfolios, setUserPortfolios] = useState([])
    const userPortfoliosRef = useRef([])
    useEffect(() => {
        userPortfoliosRef.current = userPortfolios
    }, [userPortfolios])

    const [savedTemplates, setSavedTemplates] = useState([])
    const [isSaving, setIsSaving] = useState(false)
    const [isCheckingDraft, setIsCheckingDraft] = useState(false)
    const [notice, setNotice] = useState(() => (savedDraft?.form && savedDraft.version === 1 ? 'Draft restored.' : ''))
    const [loadedTemplate, setLoadedTemplate] = useState('')
    const [slug, setSlug] = useState('')

    const initialLoadDoneRef = useRef(false)

    const templateId =
        urlTemplate ||
        (savedDraft?.template && TEMPLATES.includes(savedDraft.template) ? savedDraft.template : null) ||
        loadedTemplate ||
        (user?.id ? safeGet(`hulma-template:${user.id}`) : null) ||
        (() => {
            try {
                if (!user?.id) return 'simple'
                const parsed = JSON.parse(safeGet(`hulma-settings:${user.id}`) || '{}')
                return parsed.defaultTemplate || 'simple'
            } catch {
                return 'simple'
            }
        })()

    const prevTemplateRef = useRef(templateId)
    const templateIdRef = useRef(templateId)
    useEffect(() => {
        templateIdRef.current = templateId
    }, [templateId])

    useEffect(() => {
        if (!userId) return
        let cancelled = false

        const loadCurrentPortfolio = async () => {
            const raw = savedDraftRef.current || getDraft(userId)
            const draft = raw && raw.version === 1 ? raw : null
            const hasDraft = Boolean(draft && draft.form)

            if (hasDraft) {
                setForm({ ...DEFAULT_FORM, ...draft.form })
                if (draft.selectedImageName !== undefined) {
                    setSelectedImageName(draft.selectedImageName)
                } else if (draft.form?.profilePicture) {
                    setSelectedImageName(getImageNameFromUrl(draft.form.profilePicture))
                }
                setIsDirty(true)
                isDirtyRef.current = true
                setNotice('Draft restored.')
                if (!urlTemplateRef.current && draft.template && TEMPLATES.includes(draft.template)) {
                    navigateRef.current(`/portfolio/create?template=${draft.template}`, { replace: true })
                }
            }

            try {
                const token = await getToken()
                const res = await fetch(apiUrl('/api/portfolio/me'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })

                if (!res.ok) return
                const data = await res.json()
                if (!data || cancelled) return
                const list = (Array.isArray(data) ? data : [data]).filter(Boolean)
                setUserPortfolios(list)
                userPortfoliosRef.current = list
                setSavedTemplates(list.map((p) => p.sections?.meta?.templateId || 'simple'))

                const activeTemplate =
                    urlTemplateRef.current || (hasDraft && draft.template) || list[0]?.sections?.meta?.templateId || 'simple'
                const matchedPortfolio = list.find((p) => (p.sections?.meta?.templateId || 'simple') === activeTemplate)

                if (matchedPortfolio) {
                    setPortfolioId(matchedPortfolio.id ?? null)
                    setSlug(getShareSlug(matchedPortfolio))
                    setLoadedTemplate(matchedPortfolio.sections?.meta?.templateId || '')
                } else {
                    setPortfolioId(null)
                    setSlug('')
                }

                if (hasDraft) {
                    return
                }

                const { user: currentUser, emailAddress: currentEmail } = userRef.current
                if (matchedPortfolio) {
                    if (!isDirtyRef.current) {
                        setForm(portfolioToForm(matchedPortfolio, currentUser, currentEmail))
                        setSelectedImageName(
                            matchedPortfolio.sections?.profile?.profilePicture
                                ? getImageNameFromUrl(matchedPortfolio.sections.profile.profilePicture)
                                : ''
                        )
                    }
                    setLoadedTemplate(matchedPortfolio.sections?.meta?.templateId || '')
                } else if (!urlTemplateRef.current && list[0]) {
                    const firstP = list[0]
                    setPortfolioId(firstP.id ?? null)
                    setSlug(getShareSlug(firstP))
                    if (!isDirtyRef.current) {
                        setForm(portfolioToForm(firstP, currentUser, currentEmail))
                        setSelectedImageName(
                            firstP.sections?.profile?.profilePicture
                                ? getImageNameFromUrl(firstP.sections.profile.profilePicture)
                                : ''
                        )
                    }
                    setLoadedTemplate(firstP.sections?.meta?.templateId || '')
                } else {
                    if (!isDirtyRef.current) {
                        setForm({
                            ...DEFAULT_FORM,
                            fullName: resolveDisplayName(currentUser, ''),
                            email: currentEmail || '',
                        })
                        setSelectedImageName('')
                    }
                    setLoadedTemplate('')
                    setSlug('')
                    setPortfolioId(null)
                }
            } catch (error) {
                console.error('Failed to load portfolio:', error)
            } finally {
                if (!cancelled) {
                    initialLoadDoneRef.current = true
                    prevTemplateRef.current = templateIdRef.current
                }
            }
        }

        loadCurrentPortfolio()
        return () => {
            cancelled = true
        }
    }, [userId, getToken])

    useEffect(() => {
        if (!initialLoadDoneRef.current) {
            prevTemplateRef.current = templateId
            return
        }

        if (prevTemplateRef.current === templateId) return
        prevTemplateRef.current = templateId

        const targetPortfolio = userPortfoliosRef.current.find(
            (p) => (p.sections?.meta?.templateId || 'simple') === templateId
        )

        if (targetPortfolio) {
            setPortfolioId(targetPortfolio.id ?? null)
            setSlug(getShareSlug(targetPortfolio))
        } else {
            setPortfolioId(null)
            setSlug('')
        }

        if (!isDirtyRef.current) {
            if (targetPortfolio) {
                const { user: currentUser, emailAddress: currentEmail } = userRef.current
                setForm(portfolioToForm(targetPortfolio, currentUser, currentEmail))
                setSelectedImageName(
                    targetPortfolio.sections?.profile?.profilePicture
                        ? getImageNameFromUrl(targetPortfolio.sections.profile.profilePicture)
                        : ''
                )
            }
        }
    }, [templateId])

    useEffect(() => {
        if (!isDirty || !userId) return

        const timer = setTimeout(() => {
            saveDraft(userId, {
                version: 1,
                updatedAt: Date.now(),
                form,
                selectedImageName,
                template: templateId,
            })
        }, 400)

        return () => {
            clearTimeout(timer)
        }
    }, [form, selectedImageName, templateId, isDirty, userId])

    const draftDataRef = useRef({ form, selectedImageName, templateId })
    useEffect(() => {
        draftDataRef.current = { form, selectedImageName, templateId }
    }, [form, selectedImageName, templateId])

    useEffect(() => {
        return () => {
            if (isDirtyRef.current && userId) {
                saveDraft(userId, {
                    version: 1,
                    updatedAt: Date.now(),
                    form: draftDataRef.current.form,
                    selectedImageName: draftDataRef.current.selectedImageName,
                    template: draftDataRef.current.templateId,
                })
            }
        }
    }, [userId])

    useEffect(() => {
        if (!isDirty) return

        const handleBeforeUnload = (event) => {
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isDirty])

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

        const queryParams = new URLSearchParams()
        if (templateId) queryParams.set('template_id', templateId)
        if (portfolioId) queryParams.set('portfolio_id', String(portfolioId))
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : ''

        const response = await fetch(apiUrl(`/api/portfolio/images/upload${queryStr}`), {
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

    const updateField = (field, value) => {
        isDirtyRef.current = true
        setIsDirty(true)
        setForm((current) => ({ ...current, [field]: value }))
    }

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
            const response = await fetch(apiUrl('/api/portfolio/me'), {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ ...previewPortfolio, id: portfolioId }),
            })

            if (!response.ok) {
                const text = await response.text()
                if (response.status === 401) {
                    throw new Error('Your session is expired or invalid. Please log in again.')
                }
                throw new Error(text || 'Failed to save portfolio')
            }

            const saved = await response.json()
            removeDraft(userId)
            isDirtyRef.current = false
            setIsDirty(false)
            setPortfolioId(saved.id ?? null)
            setUserPortfolios((prev) => {
                const filtered = prev.filter(
                    (p) => p.id !== saved.id && (p.sections?.meta?.templateId || 'simple') !== templateId
                )
                const updated = [...filtered, saved]
                userPortfoliosRef.current = updated
                return updated
            })
            setSavedTemplates((current) => (current.includes(templateId) ? current : [...current, templateId]))
            const rawSettings = user?.id ? localStorage.getItem(`hulma-settings:${user.id}`) : null
            let userSettings = {}
            try {
                if (rawSettings) userSettings = JSON.parse(rawSettings)
            } catch {}

            const savedSlug = getShareSlug(saved)
            if (savedSlug) {
                setSlug(savedSlug)
                setNotice(
                    userSettings.publicLink === false
                        ? 'Portfolio saved. (Public link sharing is currently disabled in your Settings).'
                        : 'Portfolio saved. Your public link is ready to share.'
                )
            } else {
                setNotice('Portfolio saved.')
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

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear your portfolio inputs?')) {
            setForm(DEFAULT_FORM)
            setSelectedImageName('')
            setPortfolioId(null)
            setSlug('')
            isDirtyRef.current = false
            setIsDirty(false)
            removeDraft(userId)
        }
    }

    const handleCheckDraft = async () => {
        if (!canReview) {
            setNotice('Please enter some information in the form before checking draft quality.')
            return
        }

        setIsCheckingDraft(true)
        setNotice('')

        try {
            const response = await fetch(apiUrl('/api/portfolio/draft-check'), {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(previewPortfolio),
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Draft check failed.')
            }

            const data = await response.json()
            setDraftFeedback(data)
            setNotice('Draft quality evaluated.')
        } catch (error) {
            console.error(error)
            setNotice(error.message || 'Draft check is currently unavailable.')
        } finally {
            setIsCheckingDraft(false)
        }
    }

    const handleSubmit = async () => {
        const saved = await handleSave()
        if (saved) {
            const shareSlug = getShareSlug(saved) || slug
            if (shareSlug) {
                navigate(`/p/${shareSlug}`)
            } else {
                navigate('/portfolio/live')
            }
        }
    }

    const shareUrl = buildShareUrl(slug)

    return (
        <DashboardLayout
            userName={resolveDisplayName(user, 'Portfolio creator')}
            email={emailAddress || 'No email'}
            subtitle="Fill in your portfolio details"
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">Create Portfolio</h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">Add your information, save it, and share it with a public link. View your finished portfolio from the dashboard.</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={handleCheckDraft}
                        disabled={isCheckingDraft || !canReview}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6fdc] px-4 py-2.5 text-sm font-medium text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        <Sparkles size={16} className={isCheckingDraft ? 'animate-spin' : ''} />
                        {isCheckingDraft ? 'Checking draft...' : 'Check draft'}
                    </button>
                </div>
            </div>

            <section className="mt-4 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(30,70,140,0.10)] sm:p-5">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Template</span>
                            {TEMPLATES.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={id === templateId}
                                    onClick={() => {
                                        if (id !== templateId) {
                                            navigate(`/portfolio/create?template=${id}`)
                                        }
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition active:scale-95 ${
                                        id === templateId ? 'bg-[#1f6fdc] text-white shadow' : 'bg-[#f3f6fb] text-slate-600 hover:bg-[#e8effa]'
                                    }`}
                                >
                                    {id}
                                    {savedTemplates.includes(id) && <span title="Saved" className={`h-1.5 w-1.5 rounded-full ${id === templateId ? 'bg-white' : 'bg-[#12875a]'}`} />}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">Your information is kept when you switch templates. Save to publish each template.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                            Portfolio title
                            <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="My Portfolio" className={inputClass} />
                        </label>
                        <label className={labelClass}>
                            Full Name
                            <input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Jane Doe" className={inputClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                                        isDirtyRef.current = true
                                        setIsDirty(true)
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

                    <div className="grid gap-4 sm:grid-cols-2">
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

                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} />
                            <h4 className="text-lg font-semibold">AI Draft Assistant</h4>
                        </div>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                            Live Check
                        </span>
                    </div>

                    {draftFeedback ? (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-[#d3e5fa]">Draft Readiness</span>
                                <span className="text-2xl font-semibold">{draftFeedback.score}%</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                                <div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${draftFeedback.score}%` }} />
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-[#ebf3ff]">{draftFeedback.summary}</p>

                            {draftFeedback.tips && draftFeedback.tips.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <span className="block text-[11px] font-semibold text-[#d3e5fa] uppercase tracking-wider">Form Tips</span>
                                    {draftFeedback.tips.slice(0, 3).map((tip, idx) => (
                                        <div key={idx} className="rounded-xl bg-white/10 p-2 text-xs leading-snug text-[#ebf3ff]">
                                            <span className="font-semibold text-amber-200">{tip.label}: </span>
                                            {tip.tip}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCheckDraft}
                                disabled={isCheckingDraft}
                                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/25 active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw size={13} className={isCheckingDraft ? 'animate-spin' : ''} />
                                {isCheckingDraft ? 'Checking draft...' : 'Re-check draft quality'}
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
                            <p className="text-xs leading-relaxed text-[#eaf3ff]">
                                Get instant tips on your bio, skills, and projects as you type to ensure high quality before publishing.
                            </p>
                            <button
                                type="button"
                                onClick={handleCheckDraft}
                                disabled={isCheckingDraft || !canReview}
                                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Sparkles size={14} className={isCheckingDraft ? 'animate-spin' : ''} />
                                {isCheckingDraft ? 'Analyzing draft...' : 'Check draft quality'}
                            </button>
                        </div>
                    )}

                    {notice && (
                        <div role="status" className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-xs text-[#ebf3ff]">
                            {notice}
                        </div>
                    )}

                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving || isCheckingDraft}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b64dc] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save portfolio'} <Check size={16} />
                        </button>
                    </div>

                    <div className="pt-1 text-center">
                        <Link to="/review" className="inline-flex items-center gap-1 text-xs text-[#d3e5fa] transition hover:text-white hover:underline">
                            <Sparkles size={13} /> Open full Recruiter AI Review page <ArrowRight size={13} />
                        </Link>
                    </div>
                </aside>
            </section>
        </DashboardLayout>
    )
}
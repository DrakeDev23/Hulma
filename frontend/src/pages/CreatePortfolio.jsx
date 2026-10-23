import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { ArrowRight, Save, Share2, Sparkles, RefreshCw, Eye, CheckCircle2, AlertCircle, X, Trash2, Lock, Clock } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import PortfolioModal from '../components/PortfolioModal'
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

const getDraftKey = (uid, editId = null) =>
    editId ? `hulma-draft:${uid}:edit:${editId}` : `hulma-draft:${uid}:create`

const getDraft = (uid, editId = null) => {
    if (!uid) return null
    try {
        const raw = window.localStorage.getItem(getDraftKey(uid, editId))
        if (raw) return JSON.parse(raw)
        if (!editId) {
            const legacy = window.localStorage.getItem(`hulma-draft:${uid}`)
            return legacy ? JSON.parse(legacy) : null
        }
        return null
    } catch (err) {
        console.error('Failed to read draft from localStorage:', err)
        return null
    }
}

const saveDraft = (uid, editId, data) => {
    if (!uid) return
    try {
        window.localStorage.setItem(getDraftKey(uid, editId), JSON.stringify(data))
    } catch (err) {
        console.error('Failed to save draft to localStorage:', err)
    }
}

const removeDraft = (uid, editId = null) => {
    if (!uid) return
    try {
        window.localStorage.removeItem(getDraftKey(uid, editId))
        if (!editId) {
            window.localStorage.removeItem(`hulma-draft:${uid}`)
        }
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
        fullName: (profile.fullName || resolveDisplayName(currentUser, '')).replace(/[0-9]/g, ''),
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
    const fullName = (form.fullName || resolveDisplayName(user, '')).replace(/[0-9]/g, '').trim()
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

const inputBaseClass = 'rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white'
const getFieldClass = (hasError) =>
    `${inputBaseClass} ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-[#1f6fdc]'}`
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700'

export default function CreatePortfolio() {
    const navigate = useNavigate()
    const navigateRef = useRef(navigate)
    useEffect(() => {
        navigateRef.current = navigate
    }, [navigate])

    const [searchParams] = useSearchParams()
    const urlTemplate = searchParams.get('template')
    const urlId = searchParams.get('id')
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

    const urlIdRef = useRef(urlId)
    useEffect(() => {
        urlIdRef.current = urlId
    }, [urlId])

    const [savedDraft, setSavedDraft] = useState(() => {
        const rawDraft = userId ? getDraft(userId, urlId) : null
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

    const [showClearModal, setShowClearModal] = useState(false)
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
    const [errors, setErrors] = useState({})
    const [previewOpen, setPreviewOpen] = useState(false)
    const [toast, setToast] = useState(null)
    const toastTimerRef = useRef(null)

    const [reviewLimits, setReviewLimits] = useState({
        remaining: 5,
        maxPerWindow: 5,
        dailyRemaining: 5,
        maxPerDay: 5,
        isPenaltyActive: false,
    })
    const [lockedUntil, setLockedUntil] = useState(null)

    function formatUnlockDay(targetDateOrSecs) {
        if (!targetDateOrSecs) return 'Available in 5 hours'
        const target = typeof targetDateOrSecs === 'number'
            ? new Date(Date.now() + targetDateOrSecs * 1000)
            : new Date(targetDateOrSecs)
        if (isNaN(target.getTime())) return 'Available in 5 hours'

        const now = new Date()
        const isToday = target.toDateString() === now.toDateString()
        const tomorrow = new Date(now)
        tomorrow.setDate(now.getDate() + 1)
        const isTomorrow = target.toDateString() === tomorrow.toDateString()

        const timeStr = target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

        if (isToday) {
            return `Available today at ${timeStr}`
        }
        if (isTomorrow) {
            return `Available tomorrow at ${timeStr}`
        }
        const dayName = target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
        return `Available ${dayName} at ${timeStr}`
    }

    const fetchReviewStatus = async () => {
        try {
            const token = await getToken()
            if (!token) return
            const res = await fetch(apiUrl('/api/ai-review/status'), {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return
            const data = await res.json()
            const rem = data.remaining_uses !== undefined ? data.remaining_uses : data.remaining
            setReviewLimits({
                remaining: rem,
                maxPerWindow: data.max_per_window ?? data.max_reviews_per_window ?? 5,
                dailyRemaining: data.daily_remaining,
                maxPerDay: data.max_daily ?? data.max_reviews_per_day ?? 25,
                isPenaltyActive: !!data.is_penalty_active,
            })
            if (data.locked_until) {
                setLockedUntil(data.locked_until)
            } else if (data.retry_after_seconds > 0 || rem <= 0) {
                const secs = data.retry_after_seconds > 0 ? data.retry_after_seconds : 18000
                setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
            } else {
                setLockedUntil(null)
            }
        } catch {
            // Silently ignore background errors
        }
    }

    useEffect(() => {
        fetchReviewStatus()
    }, [user?.id])

    useEffect(() => {
        const handleSync = (e) => {
            if (e?.detail) {
                const rem = e.detail.remaining_uses !== undefined ? e.detail.remaining_uses : e.detail.remaining
                if (rem !== undefined) {
                    setReviewLimits((prev) => ({ ...prev, remaining: rem }))
                }
                if (e.detail.locked_until) {
                    setLockedUntil(e.detail.locked_until)
                } else if (e.detail.retry_after_seconds > 0 || rem <= 0) {
                    const secs = e.detail.retry_after_seconds > 0 ? e.detail.retry_after_seconds : 18000
                    setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
                }
            }
            fetchReviewStatus()
        }
        window.addEventListener('hulma:ai-usage-updated', handleSync)
        return () => window.removeEventListener('hulma:ai-usage-updated', handleSync)
    }, [])

    useEffect(() => {
        if (!lockedUntil) return
        const msUntilReset = new Date(lockedUntil).getTime() - Date.now()
        if (msUntilReset <= 0) {
            fetchReviewStatus()
            return
        }
        const timer = setTimeout(() => {
            fetchReviewStatus()
        }, msUntilReset + 500)
        return () => clearTimeout(timer)
    }, [lockedUntil])

    const isLimitReached = reviewLimits.remaining <= 0 || (lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false)
    const availableSubtext = formatUnlockDay(lockedUntil)

    const showToast = (message, type = 'success') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
        }
        const id = Date.now()
        setToast({ message, type, id })
        toastTimerRef.current = setTimeout(() => {
            setToast((current) => (current?.id === id ? null : current))
        }, 4000)
    }

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current)
            }
        }
    }, [])

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
            const rawDraft = getDraft(userId, urlId)
            const draft = rawDraft && rawDraft.version === 1 ? rawDraft : null
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

                const { user: currentUser, emailAddress: currentEmail } = userRef.current

                if (urlId) {
                    let matchedPortfolio = list.find((p) => String(p.id) === String(urlId))
                    if (!matchedPortfolio) {
                        try {
                            const singleRes = await fetch(apiUrl(`/api/portfolio/${urlId}`), {
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                            })
                            if (singleRes.ok) {
                                matchedPortfolio = await singleRes.json()
                            }
                        } catch {}
                    }

                    if (matchedPortfolio && !cancelled) {
                        setPortfolioId(matchedPortfolio.id ?? null)
                        setSlug(getShareSlug(matchedPortfolio))
                        setLoadedTemplate(matchedPortfolio.sections?.meta?.templateId || '')
                        if (!hasDraft && !isDirtyRef.current) {
                            setForm(portfolioToForm(matchedPortfolio, currentUser, currentEmail))
                            setSelectedImageName(
                                matchedPortfolio.sections?.profile?.profilePicture
                                    ? getImageNameFromUrl(matchedPortfolio.sections.profile.profilePicture)
                                    : ''
                            )
                        }
                    } else if (!cancelled) {
                        setPortfolioId(null)
                        setSlug('')
                        setLoadedTemplate('')
                    }
                } else {
                    setPortfolioId(null)
                    setSlug('')
                    setLoadedTemplate('')
                    if (!hasDraft && !isDirtyRef.current) {
                        setForm({
                            ...DEFAULT_FORM,
                            title: currentUser?.fullName ? `${currentUser.fullName}'s Portfolio` : 'My Portfolio',
                            fullName: resolveDisplayName(currentUser, '').replace(/[0-9]/g, ''),
                            email: currentEmail || '',
                        })
                        setSelectedImageName('')
                    }
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
    }, [userId, urlId, getToken])

    useEffect(() => {
        if (!initialLoadDoneRef.current) {
            prevTemplateRef.current = templateId
            return
        }

        if (prevTemplateRef.current === templateId) return
        prevTemplateRef.current = templateId
    }, [templateId])

    useEffect(() => {
        if (!isDirty || !userId) return

        const timer = setTimeout(() => {
            saveDraft(userId, portfolioId, {
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
    }, [form, selectedImageName, templateId, isDirty, userId, portfolioId])

    const draftDataRef = useRef({ form, selectedImageName, templateId })
    useEffect(() => {
        draftDataRef.current = { form, selectedImageName, templateId }
    }, [form, selectedImageName, templateId])

    useEffect(() => {
        return () => {
            if (isDirtyRef.current && userId) {
                saveDraft(userId, portfolioId, {
                    version: 1,
                    updatedAt: Date.now(),
                    form: draftDataRef.current.form,
                    selectedImageName: draftDataRef.current.selectedImageName,
                    template: draftDataRef.current.templateId,
                })
            }
        }
    }, [userId, portfolioId])

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
        let nextValue = value
        if (field === 'fullName') {
            nextValue = typeof value === 'string' ? value.replace(/[0-9]/g, '') : value
        }
        isDirtyRef.current = true
        setIsDirty(true)
        setForm((current) => ({ ...current, [field]: nextValue }))
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!form.title || !form.title.trim()) {
            newErrors.title = 'Portfolio title is required.'
        }

        if (!form.fullName || !form.fullName.trim()) {
            newErrors.fullName = 'Full name is required.'
        } else if (/[0-9]/.test(form.fullName)) {
            newErrors.fullName = 'Full name must contain only letters, no numbers.'
        }

        const hasProfilePic = Boolean(
            (form.profilePicture && form.profilePicture.trim()) ||
            (selectedImageName && selectedImageName.trim())
        )
        if (!hasProfilePic) {
            newErrors.profilePicture = 'Profile picture is required.'
        }

        const emailTrimmed = (form.email || '').trim()
        if (!emailTrimmed) {
            newErrors.email = 'Email is required.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            newErrors.email = 'Please enter a valid email address.'
        }

        const contactTrimmed = (form.contactNumber || '').trim()
        if (!contactTrimmed) {
            newErrors.contactNumber = 'Contact number is required.'
        } else {
            const allowedChars = /^[+\d\s\-()]+$/
            const digitsOnly = contactTrimmed.replace(/\D/g, '')
            if (!allowedChars.test(contactTrimmed)) {
                newErrors.contactNumber = 'Contact number can only contain digits, +, spaces, and dashes.'
            } else if (digitsOnly.length < 7 || digitsOnly.length > 15) {
                newErrors.contactNumber = 'Please enter a valid contact number (7-15 digits).'
            }
        }

        if (!form.address || !form.address.trim()) {
            newErrors.address = 'Address is required.'
        }

        if (!form.aboutMe || !form.aboutMe.trim()) {
            newErrors.aboutMe = 'About Me is required.'
        }

        if (!form.education || !form.education.trim()) {
            newErrors.education = 'Educational background is required.'
        }

        if (!form.skills || !form.skills.trim()) {
            newErrors.skills = 'Skills are required.'
        }

        if (!form.projects || !form.projects.trim()) {
            newErrors.projects = 'Projects are required.'
        }

        if (!form.workExperience || !form.workExperience.trim()) {
            newErrors.workExperience = 'Work experience is required.'
        }

        if (!form.socialLinks || !form.socialLinks.trim()) {
            newErrors.socialLinks = 'Social media or website links are required.'
        }

        return newErrors
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
            const payloadToSend = { ...previewPortfolio }
            if (portfolioId) {
                payloadToSend.id = portfolioId
            } else {
                delete payloadToSend.id
            }

            const queryStr = portfolioId ? `?portfolio_id=${portfolioId}` : ''
            const response = await fetch(apiUrl(`/api/portfolio/me${queryStr}`), {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(payloadToSend),
            })

            if (!response.ok) {
                const text = await response.text()
                if (response.status === 401) {
                    throw new Error('Your session is expired or invalid. Please log in again.')
                }
                let errDetail = 'Failed to save portfolio'
                try {
                    const parsed = JSON.parse(text)
                    errDetail = parsed.detail || parsed.message || errDetail
                } catch {
                    errDetail = text || errDetail
                }
                throw new Error(errDetail)
            }

            const saved = await response.json()
            removeDraft(userId, portfolioId)
            isDirtyRef.current = false
            setIsDirty(false)
            setPortfolioId(saved.id ?? null)
            const currentList = userPortfoliosRef.current || []
            const filtered = currentList.filter((p) => p.id !== saved.id)
            const updated = [saved, ...filtered]
            userPortfoliosRef.current = updated
            setUserPortfolios(updated)
            try {
                if (userId) {
                    localStorage.setItem(`hulmaPortfolio:${userId}`, JSON.stringify(updated))
                }
            } catch {}
            setSavedTemplates((current) => (current.includes(templateId) ? current : [...current, templateId]))
            const rawSettings = user?.id ? localStorage.getItem(`hulma-settings:${user.id}`) : null
            let userSettings = {}
            try {
                if (rawSettings) userSettings = JSON.parse(rawSettings)
            } catch {}

            const savedSlug = getShareSlug(saved)
            if (savedSlug) {
                setSlug(savedSlug)
            }
            setNotice(
                <span>
                    Portfolio saved successfully. View all in your{' '}
                    <Link to="/portfolio" className="underline font-semibold hover:text-[#1558c4]">
                        Portfolios
                    </Link>
                    .
                </span>
            )

            if (!urlId && saved.id) {
                navigateRef.current(`/portfolio/create?id=${saved.id}&template=${templateId}`, { replace: true })
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
        setShowClearModal(true)
    }

    const handleConfirmClear = () => {
        setShowClearModal(false)
        setForm({
            ...DEFAULT_FORM,
            title: user?.fullName ? `${user.fullName}'s Portfolio` : 'My Portfolio',
            fullName: resolveDisplayName(user, '').replace(/[0-9]/g, ''),
            email: emailAddress || '',
        })
        setSelectedImageName('')
        if (!urlId) {
            setPortfolioId(null)
            setSlug('')
        }
        setErrors({})
        isDirtyRef.current = false
        setIsDirty(false)
        removeDraft(userId, portfolioId)
        setToast({ type: 'success', message: 'Form cleared.' })
    }

    const handleCheckDraft = async () => {
        if (isLimitReached) {
            setNotice(`You hit 5 trials, please come back in 5 hours. ${availableSubtext}`)
            return
        }
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

            if (response.status === 429) {
                const errData = await response.json().catch(() => null)
                const retrySecs = errData?.retry_after_seconds ?? parseInt(response.headers.get('Retry-After') || '18000', 10)
                const lockedAt = errData?.locked_until || new Date(Date.now() + retrySecs * 1000).toISOString()
                setLockedUntil(lockedAt)
                setReviewLimits((prev) => ({
                    ...prev,
                    remaining: 0,
                    isPenaltyActive: !!errData?.is_penalty_active,
                }))
                setNotice(`You hit 5 trials, please come back in 5 hours. ${formatUnlockDay(lockedAt)}`)
                fetchReviewStatus()
                window.dispatchEvent(new CustomEvent('hulma:ai-usage-updated', { detail: { remaining: 0, locked_until: lockedAt, retry_after_seconds: retrySecs } }))
                return
            }

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Draft check failed.')
            }

            const data = await response.json()
            const rem = data.remaining_uses !== undefined ? data.remaining_uses : data.remaining
            if (rem !== undefined) {
                setReviewLimits((prev) => ({
                    ...prev,
                    remaining: rem,
                }))
                if (data.locked_until) {
                    setLockedUntil(data.locked_until)
                } else if (data.retry_after_seconds > 0 || rem <= 0) {
                    const secs = data.retry_after_seconds > 0 ? data.retry_after_seconds : 18000
                    setLockedUntil(new Date(Date.now() + secs * 1000).toISOString())
                } else {
                    setLockedUntil(null)
                }
            }
            fetchReviewStatus()
            window.dispatchEvent(new CustomEvent('hulma:ai-usage-updated', { detail: data }))
            setDraftFeedback(data)
            setNotice('Draft quality evaluated.')
        } catch (error) {
            console.error(error)
            setNotice(error.message || 'Draft check is currently unavailable.')
        } finally {
            setIsCheckingDraft(false)
        }
    }

    const handleSaveClick = async () => {
        if (isSaving) return

        const validationErrors = validateForm()
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            showToast('Please fix all required fields before saving.', 'error')

            const fieldOrder = [
                'title',
                'fullName',
                'profilePicture',
                'email',
                'contactNumber',
                'address',
                'aboutMe',
                'education',
                'skills',
                'projects',
                'workExperience',
                'socialLinks',
            ]
            const firstInvalid = fieldOrder.find((key) => validationErrors[key])
            if (firstInvalid) {
                const el = document.getElementById(`field-${firstInvalid}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.focus()
                }
            }
            return
        }

        setErrors({})
        const saved = await handleSave()
        if (saved) {
            showToast('Portfolio saved successfully.', 'success')
        } else {
            showToast('Failed to save portfolio. Please try again.', 'error')
        }
    }

    const shareUrl = buildShareUrl(slug)

    return (
        <DashboardLayout
            userName={resolveDisplayName(user, 'Portfolio creator')}
            email={emailAddress || 'No email'}
            subtitle={portfolioId ? 'Edit your portfolio details' : 'Fill in your portfolio details'}
        >
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:justify-between sm:gap-3">
                <div>
                    <h3 className="text-2xl font-medium leading-tight sm:text-[26px] lg:text-[28px]">
                        {portfolioId ? 'Edit Portfolio' : 'Create Portfolio'}
                    </h3>
                    <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
                        {portfolioId
                            ? 'Update your portfolio details and save changes.'
                            : 'Add your information to create a new portfolio. Your existing portfolios will be kept safe.'}
                    </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-[#1f6fdc] hover:text-[#1f6fdc] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
                    >
                        <Save size={16} className={isSaving ? 'animate-spin' : ''} /> {isSaving ? 'Saving...' : 'Save'}
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
                        disabled={isLimitReached || isCheckingDraft || !canReview}
                        aria-disabled={isLimitReached ? 'true' : undefined}
                        title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6fdc] px-4 py-2.5 text-sm font-medium text-white shadow-md transition duration-200 sm:w-auto ${
                            isLimitReached
                                ? 'cursor-not-allowed opacity-50 pointer-events-none'
                                : 'hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60'
                        }`}
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
                                            if (urlId) {
                                                navigate(`/portfolio/create?id=${urlId}&template=${id}`)
                                            } else {
                                                navigate(`/portfolio/create?template=${id}`)
                                            }
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
                        <label htmlFor="field-title" className={labelClass}>
                            <span>
                                Portfolio title <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-title"
                                name="title"
                                value={form.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                placeholder="My Portfolio"
                                aria-invalid={Boolean(errors.title)}
                                aria-describedby={errors.title ? 'error-title' : undefined}
                                className={getFieldClass(Boolean(errors.title))}
                            />
                            {errors.title && (
                                <span id="error-title" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.title}
                                </span>
                            )}
                        </label>
                        <label htmlFor="field-fullName" className={labelClass}>
                            <span>
                                Full Name <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-fullName"
                                name="fullName"
                                type="text"
                                value={form.fullName}
                                onChange={(e) => updateField('fullName', e.target.value)}
                                onKeyDown={(e) => {
                                    if (/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                        e.preventDefault()
                                    }
                                }}
                                placeholder="Jane Doe"
                                aria-invalid={Boolean(errors.fullName)}
                                aria-describedby={errors.fullName ? 'error-fullName' : undefined}
                                className={getFieldClass(Boolean(errors.fullName))}
                            />
                            {errors.fullName && (
                                <span id="error-fullName" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.fullName}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label htmlFor="field-profilePicture" className={labelClass}>
                            <span>
                                Profile Picture <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-profilePicture"
                                name="profilePicture"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={async (event) => {
                                    const file = event.target.files?.[0]
                                    if (!file) {
                                        setSelectedImageName('')
                                        return
                                    }

                                    setSelectedImageName(file.name.split(/[\\/]/).pop() || 'image')
                                    if (errors.profilePicture) {
                                        setErrors((prev) => {
                                            const next = { ...prev }
                                            delete next.profilePicture
                                            return next
                                        })
                                    }

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
                                aria-invalid={Boolean(errors.profilePicture)}
                                aria-describedby={errors.profilePicture ? 'error-profilePicture' : undefined}
                                className={getFieldClass(Boolean(errors.profilePicture))}
                            />
                            {selectedImageName ? (
                                <span className="mt-1 text-[11px] font-medium text-slate-500">Selected file: {selectedImageName}</span>
                            ) : (
                                <span className="mt-1 text-[11px] text-slate-400">No file selected</span>
                            )}
                            {errors.profilePicture && (
                                <span id="error-profilePicture" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.profilePicture}
                                </span>
                            )}
                        </label>
                        <label htmlFor="field-email" className={labelClass}>
                            <span>
                                Email <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                placeholder="you@example.com"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'error-email' : undefined}
                                className={getFieldClass(Boolean(errors.email))}
                            />
                            {errors.email && (
                                <span id="error-email" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.email}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label htmlFor="field-contactNumber" className={labelClass}>
                            <span>
                                Contact Number <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-contactNumber"
                                name="contactNumber"
                                value={form.contactNumber}
                                onChange={(e) => updateField('contactNumber', e.target.value)}
                                placeholder="+1 555 123 4567"
                                aria-invalid={Boolean(errors.contactNumber)}
                                aria-describedby={errors.contactNumber ? 'error-contactNumber' : undefined}
                                className={getFieldClass(Boolean(errors.contactNumber))}
                            />
                            {errors.contactNumber && (
                                <span id="error-contactNumber" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.contactNumber}
                                </span>
                            )}
                        </label>
                        <label htmlFor="field-address" className={labelClass}>
                            <span>
                                Address <span className="text-red-500 font-bold">*</span>
                            </span>
                            <input
                                id="field-address"
                                name="address"
                                value={form.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder="Lagos, Nigeria"
                                aria-invalid={Boolean(errors.address)}
                                aria-describedby={errors.address ? 'error-address' : undefined}
                                className={getFieldClass(Boolean(errors.address))}
                            />
                            {errors.address && (
                                <span id="error-address" className="mt-1 text-xs font-medium text-red-600">
                                    {errors.address}
                                </span>
                            )}
                        </label>
                    </div>

                    <label htmlFor="field-aboutMe" className={labelClass}>
                        <span>
                            About Me <span className="text-red-500 font-bold">*</span>
                        </span>
                        <textarea
                            id="field-aboutMe"
                            name="aboutMe"
                            value={form.aboutMe}
                            onChange={(e) => updateField('aboutMe', e.target.value)}
                            rows={4}
                            placeholder="I design and build digital experiences that feel simple, useful, and memorable."
                            aria-invalid={Boolean(errors.aboutMe)}
                            aria-describedby={errors.aboutMe ? 'error-aboutMe' : undefined}
                            className={getFieldClass(Boolean(errors.aboutMe))}
                        />
                        {errors.aboutMe && (
                            <span id="error-aboutMe" className="mt-1 text-xs font-medium text-red-600">
                                {errors.aboutMe}
                            </span>
                        )}
                    </label>

                    <label htmlFor="field-education" className={labelClass}>
                        <span>
                            Educational Background (one entry per line) <span className="text-red-500 font-bold">*</span>
                        </span>
                        <textarea
                            id="field-education"
                            name="education"
                            value={form.education}
                            onChange={(e) => updateField('education', e.target.value)}
                            rows={3}
                            placeholder={'B.Sc. Computer Science - University of Lagos\n2020 - 2024'}
                            aria-invalid={Boolean(errors.education)}
                            aria-describedby={errors.education ? 'error-education' : undefined}
                            className={getFieldClass(Boolean(errors.education))}
                        />
                        {errors.education && (
                            <span id="error-education" className="mt-1 text-xs font-medium text-red-600">
                                {errors.education}
                            </span>
                        )}
                    </label>

                    <label htmlFor="field-skills" className={labelClass}>
                        <span>
                            Skills (separated by commas) <span className="text-red-500 font-bold">*</span>
                        </span>
                        <input
                            id="field-skills"
                            name="skills"
                            value={form.skills}
                            onChange={(e) => updateField('skills', e.target.value)}
                            placeholder="Product design, UX research, React, Product strategy"
                            aria-invalid={Boolean(errors.skills)}
                            aria-describedby={errors.skills ? 'error-skills' : undefined}
                            className={getFieldClass(Boolean(errors.skills))}
                        />
                        {errors.skills && (
                            <span id="error-skills" className="mt-1 text-xs font-medium text-red-600">
                                {errors.skills}
                            </span>
                        )}
                    </label>

                    <label htmlFor="field-projects" className={labelClass}>
                        <span>
                            Projects (Name: description, one per line) <span className="text-red-500 font-bold">*</span>
                        </span>
                        <textarea
                            id="field-projects"
                            name="projects"
                            value={form.projects}
                            onChange={(e) => updateField('projects', e.target.value)}
                            rows={4}
                            placeholder={'Hulma redesign: Rebuilt the portfolio experience across landing pages and onboarding flows.\nGrowth dashboard: Built analytics views for product teams.'}
                            aria-invalid={Boolean(errors.projects)}
                            aria-describedby={errors.projects ? 'error-projects' : undefined}
                            className={getFieldClass(Boolean(errors.projects))}
                        />
                        {errors.projects && (
                            <span id="error-projects" className="mt-1 text-xs font-medium text-red-600">
                                {errors.projects}
                            </span>
                        )}
                    </label>

                    <label htmlFor="field-workExperience" className={labelClass}>
                        <span>
                            Work Experience (one entry per line) <span className="text-red-500 font-bold">*</span>
                        </span>
                        <textarea
                            id="field-workExperience"
                            name="workExperience"
                            value={form.workExperience}
                            onChange={(e) => updateField('workExperience', e.target.value)}
                            rows={4}
                            placeholder={'Product Designer - Pixel Labs\n2022 - Present\nBuilt user flows, improved conversion, and supported design systems.'}
                            aria-invalid={Boolean(errors.workExperience)}
                            aria-describedby={errors.workExperience ? 'error-workExperience' : undefined}
                            className={getFieldClass(Boolean(errors.workExperience))}
                        />
                        {errors.workExperience && (
                            <span id="error-workExperience" className="mt-1 text-xs font-medium text-red-600">
                                {errors.workExperience}
                            </span>
                        )}
                    </label>

                    <label htmlFor="field-socialLinks" className={labelClass}>
                        <span>
                            Social Media / Website Links (Label: url, one per line) <span className="text-red-500 font-bold">*</span>
                        </span>
                        <textarea
                            id="field-socialLinks"
                            name="socialLinks"
                            value={form.socialLinks}
                            onChange={(e) => updateField('socialLinks', e.target.value)}
                            rows={3}
                            placeholder={'LinkedIn: https://linkedin.com/in/janedoe\nGitHub: https://github.com/janedoe\nPortfolio: https://janedoe.dev'}
                            aria-invalid={Boolean(errors.socialLinks)}
                            aria-describedby={errors.socialLinks ? 'error-socialLinks' : undefined}
                            className={getFieldClass(Boolean(errors.socialLinks))}
                        />
                        {errors.socialLinks && (
                            <span id="error-socialLinks" className="mt-1 text-xs font-medium text-red-600">
                                {errors.socialLinks}
                            </span>
                        )}
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

                    {isLimitReached && (
                        <div className="flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-500/20 p-3 text-xs text-amber-100 backdrop-blur-xs">
                            <Clock size={18} className="shrink-0 text-amber-300" />
                            <div>
                                <p className="font-semibold text-white">
                                    You hit 5 trials, please come back in 5 hours
                                </p>
                                <p className="mt-0.5 text-amber-200">
                                    {availableSubtext}
                                </p>
                            </div>
                        </div>
                    )}

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
                                disabled={isLimitReached || isCheckingDraft}
                                aria-disabled={isLimitReached ? 'true' : undefined}
                                title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                                className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white transition ${
                                    isLimitReached
                                        ? 'cursor-not-allowed opacity-50 pointer-events-none'
                                        : 'hover:bg-white/25 active:scale-95 disabled:opacity-50'
                                }`}
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
                                disabled={isLimitReached || isCheckingDraft || !canReview}
                                aria-disabled={isLimitReached ? 'true' : undefined}
                                title={isLimitReached ? `Limit reached. ${availableSubtext}` : undefined}
                                className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-xs font-semibold text-white transition ${
                                    isLimitReached
                                        ? 'cursor-not-allowed opacity-50 pointer-events-none'
                                        : 'hover:bg-white/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
                                }`}
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
                            onClick={() => setPreviewOpen(true)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b64dc] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95"
                        >
                            Preview <Eye size={16} />
                        </button>
                    </div>

                    <div className="pt-1 text-center">
                        <Link to="/review" className="inline-flex items-center gap-1 text-xs text-[#d3e5fa] transition hover:text-white hover:underline">
                            <Sparkles size={13} /> Open full Recruiter AI Review page <ArrowRight size={13} />
                        </Link>
                    </div>
                </aside>
            </section>

            <PortfolioModal
                portfolio={previewPortfolio}
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
            />

            {showClearModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="clear-dialog-title"
                    onClick={() => setShowClearModal(false)}
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
                                <h3 id="clear-dialog-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                                    Clear portfolio inputs?
                                </h3>
                                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                                    Are you sure you want to clear your portfolio inputs? Any unsaved changes will be removed.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowClearModal(false)}
                                className="h-11 sm:h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClear}
                                className="h-11 sm:h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer min-h-[44px] sm:min-h-0"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                <span>Clear inputs</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    role={toast.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-3 duration-300 sm:bottom-6 sm:right-6"
                >
                    <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                            toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                    >
                        {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <p className="min-w-0 flex-1 text-sm font-medium text-slate-800 break-words">{toast.message}</p>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        aria-label="Dismiss notification"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}
        </DashboardLayout>
    )
}
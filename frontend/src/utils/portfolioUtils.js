export { apiUrl, API_BASE_URL } from './api'
export const DRAFT_KEY = 'hulmaPortfolio'

export const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== '')

export const isFilled = (v) => {
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object') return Object.values(v).some(isFilled)
    if (typeof v === 'string') return v.trim().length > 0
    return Boolean(v)
}

export const readLocalJSON = (key) => {
    try {
        if (typeof window === 'undefined') return null
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export const toText = (x) => (typeof x === 'string' ? x : pick(x?.text, x?.title, x?.name, x?.label, ''))

export const titleCase = (s) =>
    s ? String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''

export const relativeTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const min = Math.round((Date.now() - date.getTime()) / 60000)
    if (Math.abs(min) < 1) return 'just now'
    if (Math.abs(min) < 60) return rtf.format(-min, 'minute')
    const hr = Math.round(min / 60)
    if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour')
    const day = Math.round(hr / 24)
    if (Math.abs(day) < 30) return rtf.format(-day, 'day')
    return rtf.format(-Math.round(day / 30), 'month')
}

export function normalizePortfolio(raw) {
    if (!raw) return null
    let p = Array.isArray(raw) ? raw[0] : raw
    p = p?.portfolio || p?.data || p
    if (!p || typeof p !== 'object') return null

    const sections = p.sections && typeof p.sections === 'object' && !Array.isArray(p.sections) ? p.sections : {}
    const profile = sections.profile || {}
    const projects = Array.isArray(p.projects) ? p.projects : []
    const completionRaw = pick(p.completion, p.completion_percentage)

    return {
        ...p,
        sections,
        profile,
        projects,
        title: pick(p.title, profile.fullName),
        summary: pick(p.summary, profile.aboutMe),
        picture: pick(profile.profilePicture, p.profilePicture),
        skills: (Array.isArray(sections.skills) ? sections.skills : []).map(toText).filter(Boolean),
        templateId: pick(sections.meta?.templateId, p.template, p.templateId),
        completion: Number.isFinite(Number(completionRaw)) && completionRaw !== undefined ? Number(completionRaw) : 0,
        views: Number(p.views || 0),
        updatedAt: pick(p.updated_at, p.updatedAt),
        createdAt: pick(p.created_at, p.createdAt),
        review: p.review || null,
    }
}

export const hasContent = (p) =>
    Boolean(p && (p.title || p.summary || p.projects.length || countSections(p) > 0))

export const countSections = (p) =>
    Object.entries(p?.sections || {}).filter(([k, v]) => k !== 'meta' && isFilled(v)).length

export function resolvePortfolio(raw) {
    const fromBackend = normalizePortfolio(raw)
    if (hasContent(fromBackend)) return { portfolio: fromBackend, source: 'backend' }
    const fromLocal = normalizePortfolio(readLocalJSON(DRAFT_KEY))
    if (hasContent(fromLocal)) return { portfolio: fromLocal, source: 'local' }
    return { portfolio: null, source: 'none' }
}

export function resolvePortfolioList(raw) {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.portfolios) ? raw.portfolios : null
    if (list) {
        const items = list.map(normalizePortfolio).filter(hasContent)
        if (items.length) return items
    }
    const { portfolio } = resolvePortfolio(raw)
    return portfolio ? [portfolio] : []
}

export const reviewInfo = (review) => {
    if (!review) return { label: 'Not run yet', summary: '', suggestions: [] }
    if (typeof review === 'string') return { label: 'Completed', summary: review, suggestions: [] }
    const score = pick(review.score, review.rating)
    return {
        label: score !== undefined ? `Score ${score}` : 'Completed',
        summary: pick(review.summary, review.feedback, ''),
        suggestions: Array.isArray(review.suggestions) ? review.suggestions.map(toText).filter(Boolean) : [],
    }
}

export function getStoredUsername() {
    try {
        if (typeof window === 'undefined') return ''
        const raw = window.localStorage.getItem('hulma-settings')
        if (!raw) return ''
        const parsed = JSON.parse(raw)
        const u = parsed?.username
        if (u && typeof u === 'string' && !u.startsWith('user_') && u.toLowerCase() !== 'user') {
            return u.trim()
        }
        return ''
    } catch {
        return ''
    }
}

export function resolveDisplayName(user, fallback = 'User') {
    const metaUsername = user?.unsafeMetadata?.username
    if (metaUsername && typeof metaUsername === 'string' && !metaUsername.startsWith('user_')) {
        return metaUsername.trim()
    }
    const username = user?.username
    if (username && typeof username === 'string' && !username.startsWith('user_')) {
        return username.trim()
    }
    const stored = getStoredUsername()
    if (stored) {
        return stored
    }
    const fullName = user?.fullName
    if (fullName && typeof fullName === 'string' && !fullName.startsWith('user_')) {
        return fullName.trim()
    }
    const firstName = user?.firstName
    if (firstName && typeof firstName === 'string' && !firstName.startsWith('user_')) {
        return firstName.trim()
    }
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress
    if (email && typeof email === 'string' && !email.includes('@clerk.local')) {
        return email.split('@')[0]
    }
    return fallback
}
const BLOCKED = /^(javascript|data|vbscript|file|blob):/i

export function isSafeHttpUrl(value) {
    if (value == null) return false
    const raw = String(value).trim()
    if (!raw || raw.length > 2000) return false
    if (BLOCKED.test(raw) || raw.startsWith('//')) return false
    try {
        const parsed = new URL(raw)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

export function safeHref(url) {
    if (url == null) return ''
    const raw = String(url).trim()
    if (!raw) return ''
    if (BLOCKED.test(raw) || raw.startsWith('//')) return ''
    if (/^https?:\/\//i.test(raw)) {
        return isSafeHttpUrl(raw) ? raw : ''
    }
    if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw) || raw.startsWith('/')) {
        const candidate = raw.startsWith('/') ? raw : `https://${raw}`
        if (raw.startsWith('/')) return raw.startsWith('//') ? '' : raw
        return isSafeHttpUrl(candidate) ? candidate : ''
    }
    return ''
}

export function safeSrc(url) {
    if (url == null) return ''
    const raw = String(url).trim()
    if (!raw || raw.length > 2000) return ''
    if (BLOCKED.test(raw) || raw.startsWith('//')) return ''
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw
    return isSafeHttpUrl(raw) ? raw : ''
}

export function safeMailto(email) {
    if (email == null) return ''
    const raw = String(email).trim()
    if (!raw || raw.length > 254) return ''
    if (/[\s<>"']/.test(raw) || raw.includes('?') || raw.includes('&') || raw.includes('\n')) return ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return ''
    return `mailto:${raw}`
}

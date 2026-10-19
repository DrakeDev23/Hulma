
export function clearAuthSession() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear()
        }
    } catch (e) {
        console.warn('Failed to clear localStorage:', e)
    }

    try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.clear()
        }
    } catch (e) {
        console.warn('Failed to clear sessionStorage:', e)
    }

    try {
        if (typeof document !== 'undefined' && document.cookie) {
            const cookies = document.cookie.split(';')
            for (const cookie of cookies) {
                const eqPos = cookie.indexOf('=')
                const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim()
                if (name) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                    if (typeof window !== 'undefined' && window.location) {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
                        const parts = window.location.hostname.split('.')
                        if (parts.length > 1) {
                            const rootDomain = '.' + parts.slice(-2).join('.')
                            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${rootDomain}`
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Failed to clear cookies:', e)
    }
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import PortfolioSite from '../components/PortfolioSite'
import ShareLink from '../components/ShareLink'
import { apiUrl } from '../utils/api'

// Allowlist of safe internal routes to prevent open redirect vulnerabilities
const ALLOWED_INTERNAL_ROUTES = [
    '/portfolio/create',
    '/portfolio/live',
    '/dashboard',
    '/settings',
    '/review',
]

function getSafeBackUrl(searchParams, defaultUrl) {
    const rawTarget =
        searchParams.get('returnUrl') ||
        searchParams.get('redirect') ||
        searchParams.get('back') ||
        searchParams.get('from')

    if (!rawTarget) return defaultUrl

    // Security check: Must start with a single '/' and not '//' or '/\' to avoid open redirect vulnerabilities
    if (!rawTarget.startsWith('/') || rawTarget.startsWith('//') || rawTarget.startsWith('/\\')) {
        return defaultUrl
    }

    try {
        const parsed = new URL(rawTarget, 'https://hulma.local')
        const pathname = parsed.pathname
        const isAllowed = ALLOWED_INTERNAL_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(route + '/')
        )
        if (isAllowed) {
            return `${parsed.pathname}${parsed.search}${parsed.hash}`
        }
    } catch {
        return defaultUrl
    }

    return defaultUrl
}

export default function PortfolioPublic() {
    const { slug } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { isSignedIn, isLoaded } = useUser()
    const { getToken } = useAuth()
    const [portfolio, setPortfolio] = useState(null)
    const [status, setStatus] = useState('loading')

    useEffect(() => {
        // Wait for Clerk to finish loading so auth state and JWT are available
        if (!isLoaded) return

        let cancelled = false

        const load = async () => {
            setStatus('loading')
            try {
                const headers = {}
                if (isSignedIn) {
                    try {
                        const token = await getToken()
                        if (token) headers.Authorization = `Bearer ${token}`
                    } catch {}
                }
                const res = await fetch(apiUrl(`/api/portfolio/public/${encodeURIComponent(slug)}`), { headers })
                if (cancelled) return
                if (!res.ok) {
                    if (res.status === 403) setStatus('private')
                    else if (res.status === 404) setStatus('missing')
                    else setStatus('error')
                    return
                }
                const data = await res.json()
                setPortfolio(data)
                setStatus('ready')
            } catch {
                if (!cancelled) setStatus('error')
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [slug, isSignedIn, getToken, isLoaded])

    useEffect(() => {
        if (portfolio?.title) document.title = portfolio.title
    }, [portfolio])

    // Temporary console log to verify auth state and server-verified ownership (remove after confirming)
    useEffect(() => {
        console.log('[PortfolioPublic Auth Debug]', {
            isLoaded,
            isSignedIn,
            is_owner: portfolio?.is_owner ?? false,
        })
    }, [isLoaded, isSignedIn, portfolio?.is_owner])

    // Wait for Clerk's isLoaded before rendering so the button doesn't flicker
    if (status === 'loading' || !isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">
                Loading portfolio...
            </div>
        )
    }

    if (status !== 'ready') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#f8fafc] px-6 text-center text-slate-700">
                <h1 className="text-xl font-semibold">
                    {status === 'private'
                        ? 'This portfolio is private'
                        : status === 'missing'
                          ? 'Portfolio not found'
                          : 'Could not load this portfolio'}
                </h1>
                <p className="text-sm text-slate-500">
                    {status === 'private'
                        ? 'The owner has disabled public link sharing in their settings.'
                        : status === 'missing'
                          ? 'The link may be wrong or the portfolio is no longer shared.'
                          : 'Please try again in a moment.'}
                </p>
            </div>
        )
    }

    // Server-computed ownership: only true if verified server-side JWT subject matches portfolio owner
    const isOwner = Boolean(portfolio?.is_owner)

    const activeSlug = portfolio?.slug || slug
    const templateId = portfolio?.sections?.meta?.templateId || 'simple'
    const defaultCreateUrl = templateId
        ? `/portfolio/create?template=${encodeURIComponent(templateId)}`
        : '/portfolio/create'
    const backUrl = getSafeBackUrl(searchParams, defaultCreateUrl)

    return (
        <div className="relative min-h-screen">
            {/* Spot 1: Fixed at top-left of page (ONLY visible to portfolio owner) */}
            {isOwner && (
                <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(backUrl)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-md backdrop-blur border border-slate-200 transition hover:bg-white hover:text-blue-600 hover:shadow-lg active:scale-95"
                        title="Back to create portfolio"
                    >
                        <ArrowLeft size={14} />
                        <span>← Back to create portfolio</span>
                    </button>
                    <div className="hidden md:block">
                        <ShareLink slug={activeSlug} />
                    </div>
                </div>
            )}

            {/* Spot 2: Inside portfolio template navbar next to "Contact" (ONLY visible to portfolio owner) */}
            <PortfolioSite
                portfolio={portfolio}
                template={templateId}
                idPrefix="public"
                stickyNav={true}
                onBack={isOwner ? () => navigate(backUrl) : undefined}
                backLabel="← Back to create portfolio"
            />
        </div>
    )
}
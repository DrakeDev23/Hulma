import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import OwnerEditButton from '../components/OwnerEditButton'
import PortfolioSite from '../components/PortfolioSite'
import { getShareSlug } from '../components/ShareLink'
import { apiUrl } from '../utils/api'

export default function PortfolioPublic() {
    const { slug } = useParams()
    const { isLoaded, isSignedIn, getToken } = useAuth()
    const [portfolio, setPortfolio] = useState(null)
    const [status, setStatus] = useState('loading')
    const [isOwner, setIsOwner] = useState(false)

    const hasLoadedRef = useRef(false)
    const prevSlugRef = useRef(slug)

    useEffect(() => {
        let cancelled = false

        if (prevSlugRef.current !== slug) {
            prevSlugRef.current = slug
            hasLoadedRef.current = false
        }

        const load = async () => {
            if (!hasLoadedRef.current) {
                setStatus('loading')
            }
            try {
                const headers = {}
                if (isLoaded && isSignedIn) {
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
                if (cancelled) return
                hasLoadedRef.current = true
                setPortfolio(data)
                setStatus('ready')
            } catch {
                if (!cancelled) {
                    if (!hasLoadedRef.current) {
                        setStatus('error')
                    }
                }
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [slug, isLoaded, isSignedIn, getToken])

    useEffect(() => {
        if (portfolio?.title) document.title = portfolio.title
    }, [portfolio])

    useEffect(() => {
        let cancelled = false

        const checkOwnership = async () => {
            if (!isLoaded || !isSignedIn || !portfolio) {
                setIsOwner(false)
                return
            }

            try {
                const token = await getToken()
                if (!token || cancelled) return

                const res = await fetch(apiUrl('/api/portfolio/me'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!res.ok || cancelled) {
                    if (!cancelled) setIsOwner(false)
                    return
                }

                const data = await res.json()
                if (cancelled) return

                const list = (Array.isArray(data) ? data : [data]).filter(Boolean)

                const displayedId = portfolio.id
                const displayedSlug = portfolio.slug || slug

                const matches = list.some((p) => {
                    if (displayedId != null && p.id != null && String(p.id) === String(displayedId)) {
                        return true
                    }
                    if (displayedSlug) {
                        if (p.slug && p.slug === displayedSlug) return true
                        if (getShareSlug(p) === displayedSlug) return true
                    }
                    return false
                })

                if (!cancelled) {
                    setIsOwner(matches)
                }
            } catch {
                if (!cancelled) {
                    setIsOwner(false)
                }
            }
        }

        checkOwnership()

        return () => {
            cancelled = true
        }
    }, [isLoaded, isSignedIn, getToken, portfolio, slug])

    if (status === 'loading') {
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

    const templateId = portfolio?.sections?.meta?.templateId || 'simple'

    return (
        <div className="relative min-h-screen">
            {isOwner && <OwnerEditButton portfolioId={portfolio?.id} templateId={templateId} />}

            <PortfolioSite
                portfolio={portfolio}
                template={templateId}
                idPrefix="public"
                stickyNav={true}
            />
        </div>
    )
}
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import PortfolioSite from '../components/PortfolioSite'
import ShareLink from '../components/ShareLink'
import { apiUrl } from '../utils/api'

export default function PortfolioPublic() {
    const { slug } = useParams()
    const navigate = useNavigate()
    const { user, isSignedIn, isLoaded } = useUser()
    const { getToken } = useAuth()
    const [portfolio, setPortfolio] = useState(null)
    const [status, setStatus] = useState('loading')

    useEffect(() => {
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
    }, [slug, isSignedIn, getToken])

    useEffect(() => {
        if (portfolio?.title) document.title = portfolio.title
    }, [portfolio])

    if (status === 'loading' || !isLoaded) {
        return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">Loading portfolio...</div>
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

    const isOwner = Boolean(
        isSignedIn &&
        user?.id &&
        portfolio?.owner_clerk_id &&
        user.id === portfolio.owner_clerk_id
    )

    const activeSlug = portfolio?.slug || slug
    const templateId = portfolio?.sections?.meta?.templateId || 'simple'
    const createUrl = templateId ? `/portfolio/create?template=${encodeURIComponent(templateId)}` : '/portfolio/create'

    return (
        <div className="min-h-screen">
            {isOwner && (
                <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 bg-white/95 px-3 sm:px-4 py-2.5 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(createUrl)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1fc] px-3.5 py-1.5 text-xs font-medium text-[#1f6fdc] transition hover:bg-[#dce9fb] active:scale-95"
                            title="Back to create portfolio page"
                        >
                            <ArrowLeft size={14} /> <span className="hidden min-[380px]:inline">Back to create portfolio</span><span className="min-[380px]:hidden">Back</span>
                        </button>
                    </div>
                    <div className="w-full sm:w-auto min-w-0 sm:flex-1 sm:max-w-xl sm:ml-auto">
                        <ShareLink slug={activeSlug} />
                    </div>
                </div>
            )}
            <PortfolioSite
                portfolio={portfolio}
                template={templateId}
                idPrefix="public"
                stickyNav={!isOwner}
                onBack={isOwner ? () => navigate(createUrl) : undefined}
                backLabel="Back to create portfolio"
            />
        </div>
    )
}
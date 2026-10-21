import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import PortfolioSite from '../components/PortfolioSite'
import ShareLink, { getShareSlug } from '../components/ShareLink'
import { apiUrl } from '../utils/api'

function getStoredTemplate(userId) {
    try {
        if (userId) {
            const t = localStorage.getItem(`hulma-template:${userId}`)
            if (t) return t
        }
        return 'simple'
    } catch {
        return 'simple'
    }
}

export default function PortfolioLive() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const queryId = searchParams.get('id')
    const { getToken } = useAuth()
    const { user } = useUser()
    const [portfolio, setPortfolio] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await getToken()
                const res = await fetch(apiUrl('/api/portfolio/me'), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (res.ok) {
                    const data = await res.json()
                    const list = (Array.isArray(data) ? data : [data]).filter(Boolean)
                    let item = null
                    if (queryId) {
                        item = list.find((p) => String(p.id) === String(queryId))
                    }
                    if (!item && list.length > 0) {
                        item = list[0]
                    }
                    if (item) {
                        const slug = getShareSlug(item)
                        if (slug) {
                            navigate(`/p/${slug}`, { replace: true })
                            return
                        }
                        setPortfolio(item)
                    }
                }
            } catch (e) {
                console.error('Failed to load portfolio:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [getToken, navigate, queryId])

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-800">Loading portfolio...</div>
    if (!portfolio) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-800">
                No portfolio found.
                <button onClick={() => navigate('/portfolio/create')} className="ml-2 underline">Create one</button>
            </div>
        )
    }

    const template = portfolio.sections?.meta?.templateId || getStoredTemplate(user?.id)
    const slug = getShareSlug(portfolio)

    const createUrl = portfolio?.id
        ? `/portfolio/create?id=${portfolio.id}&template=${encodeURIComponent(template)}`
        : template
            ? `/portfolio/create?template=${encodeURIComponent(template)}`
            : '/portfolio/create'

    return (
        <div className="min-h-screen">
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
                    <ShareLink slug={slug} />
                </div>
            </div>
            <PortfolioSite
                portfolio={portfolio}
                template={template}
                idPrefix="live"
                stickyNav={false}
                onBack={() => navigate(createUrl)}
                backLabel="Back to create portfolio"
            />
        </div>
    )
}
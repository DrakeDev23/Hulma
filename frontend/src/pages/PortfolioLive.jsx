import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, PenLine } from 'lucide-react'
import PortfolioSite from '../components/PortfolioSite'
import ShareLink, { getShareSlug } from '../components/ShareLink'
import { apiUrl } from '../utils/api'

function getStoredTemplate() {
    try {
        return localStorage.getItem('hulma-template') || 'simple'
    } catch {
        return 'simple'
    }
}

export default function PortfolioLive() {
    const navigate = useNavigate()
    const { getToken } = useAuth()
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
                    const item = Array.isArray(data) ? data[0] : data
                    if (item) setPortfolio(item)
                }
            } catch (e) {
                console.error('Failed to load portfolio:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [getToken])

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-800">Loading portfolio...</div>
    if (!portfolio) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-800">
                No portfolio found.
                <button onClick={() => navigate('/portfolio/create')} className="ml-2 underline">Create one</button>
            </div>
        )
    }

    const template = portfolio.sections?.meta?.templateId || getStoredTemplate()
    const slug = getShareSlug(portfolio)

    return (
        <div className="min-h-screen">
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 bg-white/95 px-3 sm:px-4 py-2.5 backdrop-blur">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/portfolio/create')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1fc] px-3 py-1.5 text-xs font-medium text-[#1f6fdc] transition hover:bg-[#dce9fb] active:scale-95"
                    >
                        <ArrowLeft size={14} /> <span className="hidden min-[380px]:inline">Back to editor</span><span className="min-[380px]:hidden">Back</span>
                    </button>
                    <button
                        onClick={() => navigate('/portfolio/create')}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                    >
                        <PenLine size={13} /> Edit
                    </button>
                </div>
                <div className="w-full sm:w-auto min-w-0 sm:flex-1 sm:max-w-xl sm:ml-auto">
                    <ShareLink slug={slug} />
                </div>
            </div>
            <PortfolioSite portfolio={portfolio} template={template} idPrefix="live" stickyNav={false} />
        </div>
    )
}
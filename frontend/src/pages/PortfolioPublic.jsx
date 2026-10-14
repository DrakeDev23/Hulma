import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PortfolioSite from '../components/PortfolioSite'

export default function PortfolioPublic() {
    const { slug } = useParams()
    const [portfolio, setPortfolio] = useState(null)
    const [status, setStatus] = useState('loading')

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setStatus('loading')
            try {
                const res = await fetch(`/api/portfolio/public/${encodeURIComponent(slug)}`)
                if (cancelled) return
                if (!res.ok) {
                    setStatus(res.status === 404 ? 'missing' : 'error')
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
    }, [slug])

    useEffect(() => {
        if (portfolio?.title) document.title = portfolio.title
    }, [portfolio])

    if (status === 'loading') {
        return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">Loading portfolio...</div>
    }

    if (status !== 'ready') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#f8fafc] px-6 text-center text-slate-700">
                <h1 className="text-xl font-semibold">{status === 'missing' ? 'Portfolio not found' : 'Could not load this portfolio'}</h1>
                <p className="text-sm text-slate-500">
                    {status === 'missing' ? 'The link may be wrong or the portfolio is no longer shared.' : 'Please try again in a moment.'}
                </p>
            </div>
        )
    }

    return <PortfolioSite portfolio={portfolio} template={portfolio.sections?.meta?.templateId || 'simple'} idPrefix="public" />
}
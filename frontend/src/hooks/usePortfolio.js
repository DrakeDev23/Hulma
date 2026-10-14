import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'

export default function usePortfolio() {
    const { getToken } = useAuth()
    const [portfolio, setPortfolio] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const refetch = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = await getToken()
            const res = await fetch('/api/portfolio/me', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) {
                setError('Failed to load portfolio.')
                setPortfolio(null)
                return null
            }
            const data = await res.json()
            if (data) {
                const value = Array.isArray(data) ? data : data
                setPortfolio(value)
                try { localStorage.setItem('hulmaPortfolio', JSON.stringify(value)) } catch {}
            } else {
                setPortfolio(null)
            }
            return data
        } catch (e) {
            setError('Failed to load portfolio.')
            setPortfolio(null)
            return null
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refetch()
    }, [getToken])

    return { portfolio, loading, error, refetch }
}

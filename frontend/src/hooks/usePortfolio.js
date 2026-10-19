import { useEffect, useState, useRef } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { apiUrl } from '../utils/api'

export default function usePortfolio() {
    const { getToken } = useAuth()
    const { user, isLoaded: isUserLoaded } = useUser()
    const [portfolio, setPortfolio] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const activeUserIdRef = useRef(user?.id)

    const refetch = async () => {
        if (!user?.id) {
            setPortfolio(null)
            setLoading(false)
            return null
        }

        setLoading(true)
        setError(null)
        try {
            const token = await getToken()
            const res = await fetch(apiUrl('/api/portfolio/me'), {
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
                try {
                    if (user?.id) {
                        localStorage.setItem(`hulmaPortfolio:${user.id}`, JSON.stringify(value))
                    }
                } catch {}
            } else {
                setPortfolio(null)
            }
            return data
        } catch {
            setError('Failed to load portfolio.')
            setPortfolio(null)
            return null
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!isUserLoaded) return

        if (activeUserIdRef.current !== user?.id) {
            activeUserIdRef.current = user?.id
            setPortfolio(null)
            setError(null)
        }

        if (user?.id) {
            refetch()
        } else {
            setPortfolio(null)
            setLoading(false)
        }
    }, [isUserLoaded, user?.id, getToken])

    return { portfolio, loading, error, refetch }
}

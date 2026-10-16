import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClerk } from '@clerk/react'

export default function SSOCallback() {
  const clerk = useClerk()
  const navigate = useNavigate()
  const location = useLocation()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!clerk?.loaded || hasRun.current) return
    hasRun.current = true

    const searchParams = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
    const hasError =
      searchParams.get('error') ||
      hashParams.get('error') ||
      searchParams.get('error_description') ||
      hashParams.get('error_description')

    if (hasError) {
      navigate('/login', { replace: true })
      return
    }

    const completeSSO = async () => {
      try {
        await clerk.handleRedirectCallback(
          {
            signInForceRedirectUrl: '/dashboard',
            signUpForceRedirectUrl: '/dashboard',
            signInUrl: '/login',
            signUpUrl: '/login',
            signInFallbackRedirectUrl: '/login',
            signUpFallbackRedirectUrl: '/login',
          },
          (to) => navigate(to, { replace: true })
        )
      } catch (err) {
        console.warn('Google SSO callback cancelled or failed:', err)
        navigate('/login', { replace: true })
      }
    }

    completeSSO()

    const timeout = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 4000)

    return () => clearTimeout(timeout)
  }, [clerk, navigate, location])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fbff]">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium">Connecting with Google...</p>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useUser, HandleSSOCallback } from '@clerk/react'

export default function SSOCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded: isUserLoaded, isSignedIn } = useUser()
  const hasRedirected = useRef(false)

  const goToLogin = () => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    navigate('/login', { replace: true })
  }

  const goToDashboard = () => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    navigate('/dashboard', { replace: true })
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
    const hasError =
      searchParams.get('error') ||
      hashParams.get('error') ||
      searchParams.get('error_description') ||
      hashParams.get('error_description')

    if (hasError) {
      goToLogin()
    }
  }, [location])

  useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      goToDashboard()
    }
  }, [isUserLoaded, isSignedIn])

  useEffect(() => {
    const timer = setTimeout(() => {
      goToLogin()
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] p-4">
      <HandleSSOCallback
        navigateToApp={goToDashboard}
        navigateToSignIn={goToLogin}
        navigateToSignUp={goToLogin}
      />

      <div className="flex flex-col items-center gap-3 text-slate-600 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium">Connecting with Google...</p>
        <Link
          to="/login"
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          Cancel and return to login
        </Link>
      </div>
    </div>
  )
}

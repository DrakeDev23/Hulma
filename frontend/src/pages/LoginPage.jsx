import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignIn, useUser } from '@clerk/react'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

const errorText = (err, fallback) => err?.longMessage || err?.message || fallback

export default function LoginPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, fetchStatus } = useSignIn()
  const { isSignedIn } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(location.state?.notice || '')

  const busy = fetchStatus === 'fetching'
  const needsCode = signIn?.status === 'needs_client_trust'

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true })
  }, [isSignedIn, navigate])

  const goToApp = ({ session, decorateUrl }) => {
    if (session?.currentTask) {
      setError('Your account needs one more step before you can continue.')
      return
    }
    const url = decorateUrl('/dashboard')
    if (url.startsWith('http')) {
      window.location.href = url
    } else {
      navigate(url)
    }
  }

  const finish = async () => {
    const { error: finalizeError } = await signIn.finalize({ navigate: goToApp })
    if (finalizeError) setError(errorText(finalizeError, 'Could not finish signing in.'))
  }

  const handleGoogleLogin = async () => {
    if (!signIn) {
      setError('Authentication service is not ready yet.')
      return
    }

    setError('')

    try {
      const { error: ssoError } = await signIn.sso({
        strategy: 'oauth_google',
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: '/dashboard',
      })
      if (ssoError) {
        console.error('Google login failed:', ssoError)
        setError(errorText(ssoError, 'Google sign in failed.'))
      }
    } catch (err) {
      console.error('Google login failed:', err)
      setError(errorText(err, 'Google sign in failed.'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!signIn) {
      setError('Authentication service is not ready yet.')
      return
    }

    const { error: pwError } = await signIn.password({ emailAddress: email, password })
    if (pwError) {
      setError(errorText(pwError, 'Login failed. Please try again.'))
      return
    }

    if (signIn.status === 'complete') {
      await finish()
    } else if (signIn.status === 'needs_client_trust') {
      const canEmail = signIn.supportedSecondFactors?.some((f) => f.strategy === 'email_code')
      if (canEmail) {
        const { error: sendError } = await signIn.mfa.sendEmailCode()
        if (sendError) setError(errorText(sendError, 'Could not send the verification code.'))
      } else {
        setError('This device needs verification that is not supported here yet.')
      }
    } else {
      console.error('Sign-in not complete:', signIn)
      setError('Please complete the additional verification steps.')
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code })
    if (verifyError) {
      setError(errorText(verifyError, 'That code did not work. Try again.'))
      return
    }

    if (signIn.status === 'complete') {
      await finish()
    } else {
      setError('Could not verify this device. Please try again.')
    }
  }

  const inputClass =
    'w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600'

  return (
    <div data-mode={mode} className="auth-page min-h-screen w-full flex flex-col lg:flex-row bg-white">
      <div className="hidden lg:flex relative w-full lg:w-1/2 bg-linear-to-b from-blue-600 to-blue-950 px-8 pt-10 lg:px-14 lg:pt-16 flex-col overflow-hidden">
        <Link
          to="/"
          aria-label="Back to home"
          className="group absolute left-6 top-6 z-10 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white lg:left-8 lg:top-8"
        >
          <FiArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
          <span>Back to home</span>
        </Link>

        <h1 className="max-w-md mx-auto text-center text-3xl sm:text-4xl font-bold text-white leading-tight">
          Shape your <span className="text-blue-950">story</span>. Build your{' '}
          <span className="text-blue-950">portfolio</span>. Welcome to Hulma.
        </h1>

        <div className="mt-auto flex justify-center items-end pt-10">
          <img
            src={puppetImg}
            alt="Hulma mascot"
            className="h-80 sm:h-96 lg:h-[60vh] w-auto max-w-full object-contain object-bottom drop-shadow-xl"
          />
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            aria-label="Back to home"
            className="group mb-6 inline-flex items-center gap-2 text-sm text-slate-500 lg:hidden transition-colors duration-200 hover:text-blue-600"
          >
            <FiArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
            <span>Back to home</span>
          </Link>

          <div className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-8">
            <img src={logoImg} alt="Hulma logo" className="h-8 w-auto object-contain" />
            <span>Hulma</span>
          </div>

          {needsCode ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Verify this device</h2>
                <p className="text-xs text-slate-500">We sent a code to {email}. Enter it below to continue.</p>
              </div>

              <form className="w-full" onSubmit={handleVerify}>
                <div className="mb-6">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Verification code"
                    className={inputClass}
                  />
                </div>

                {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mb-4 bg-blue-400 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  Verify and continue
                </button>
              </form>

              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => signIn.mfa.sendEmailCode()} className="text-blue-600 font-semibold hover:underline">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCode('')
                    setError('')
                    signIn.reset()
                  }}
                  className="text-slate-500 hover:underline"
                >
                  Start over
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Login to your account</h2>
                <p className="text-xs text-slate-500">Welcome back! Select method to login in:</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-6 border border-slate-300 rounded-xl bg-white text-sm font-medium text-slate-700 shadow-sm cursor-pointer transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60"
              >
                <FcGoogle className="h-5 w-5" aria-hidden="true" />
                Google
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-xs text-slate-400">or continue with email</span>
              </div>

              <form className="w-full" onSubmit={handleSubmit}>
                <div className="mb-6">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <div className="relative mb-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`${inputClass} pr-8`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-0 top-3 text-slate-500 cursor-pointer transition-colors hover:text-slate-700"
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>

                {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

                <label className="flex items-center gap-2 mb-8 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600" />
                  Remember me
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mb-6 bg-blue-400 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  {busy ? 'Signing in...' : 'Login'}
                </button>
              </form>

              <p className="text-xs text-slate-600 text-center">
                Don&apos;t you have an account?{' '}
                <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
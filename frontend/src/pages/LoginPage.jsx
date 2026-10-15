import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignIn } from '@clerk/react/legacy'
import { useUser } from '@clerk/react'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

const errorText = (err, fallback) =>
  err?.errors?.[0]?.longMessage ||
  err?.errors?.[0]?.message ||
  err?.message ||
  fallback

export default function LoginPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useUser()

  const searchParams = new URLSearchParams(location.search)
  const initialEmail = searchParams.get('email') || location.state?.email || ''

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [isAccountNotFound, setIsAccountNotFound] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [error, setError] = useState(location.state?.notice || '')


  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true })
  }, [isSignedIn, navigate])

  const handleGoogleLogin = async () => {
    if (isGoogleSubmitting || isSubmitting) return

    if (!isLoaded || !signIn) {
      setError('Authentication service is still initializing. Please wait a moment and try again.')
      return
    }

    setError('')
    setIsAccountNotFound(false)
    setInfoMessage('')
    setIsGoogleSubmitting(true)

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
        continueSignUp: true,
      })
    } catch (err) {
      console.error('Google login failed:', err)
      setError(errorText(err, 'Google sign in failed.'))
      setIsGoogleSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsAccountNotFound(false)
    setInfoMessage('')

    if (!isLoaded || !signIn) {
      setError('Authentication service is not ready yet.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard')
      } else if (result.status === 'needs_second_factor') {
        setNeedsCode(true)
        const hasEmailCode = result.supportedSecondFactors?.some((f) => f.strategy === 'email_code')
        if (hasEmailCode) {
          await signIn.prepareSecondFactor({ strategy: 'email_code' })
        }
      } else if (result.status === 'needs_first_factor') {
        const factorResult = await signIn.attemptFirstFactor({
          strategy: 'password',
          password,
        })
        if (factorResult.status === 'complete') {
          await setActive({ session: factorResult.createdSessionId })
          navigate('/dashboard')
        } else {
          setError('Additional verification required.')
        }
      } else {
        setError('Sign in status: ' + result.status)
      }
    } catch (err) {
      console.error('Login error:', err)
      const errCode = err?.errors?.[0]?.code
      const errMsg = err?.errors?.[0]?.message || err?.message || ''
      const notFound =
        errCode === 'form_identifier_not_found' ||
        errMsg.toLowerCase().includes('find your account') ||
        errMsg.toLowerCase().includes('not found')

      if (notFound) {
        setIsAccountNotFound(true)
        setError("Couldn't find an account associated with this email.")
      } else {
        setError(errorText(err, 'Login failed. Please check your credentials and try again.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    if (!isLoaded || !signIn) return
    setIsSubmitting(true)

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: code.trim(),
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard')
      } else {
        setError('Could not verify this device. Please try again.')
      }
    } catch (err) {
      console.error('Verify error:', err)
      setError(errorText(err, 'That code did not work. Try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resendCode = async () => {
    try {
      await signIn.prepareSecondFactor({ strategy: 'email_code' })
      setError('')
      setInfoMessage('A new verification code has been sent to your email.')
    } catch (err) {
      setError(errorText(err, 'Could not send verification code.'))
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

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-5 py-8 sm:px-10 md:px-12">
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
                <p className="text-xs text-slate-500">We sent a verification code to <strong>{email}</strong>. Enter it below to continue.</p>
              </div>

              {infoMessage && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2">
                  <FiCheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                  <FiAlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="w-full" onSubmit={handleVerify}>
                <div className="mb-6">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value)
                      setError('')
                    }}
                    placeholder="Verification code"
                    className={inputClass}
                  />
                </div>

                <div id="clerk-captcha" className="my-2" />

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full py-3.5 mb-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify and continue'}
                </button>
              </form>

              <div className="flex justify-between text-xs">
                <button type="button" onClick={resendCode} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCode('')
                    setError('')
                    setInfoMessage('')
                    setNeedsCode(false)
                  }}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Start over
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Login to your account</h2>
                <p className="text-xs text-slate-500">Welcome back! Select a method to log in:</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-6 border border-slate-300 rounded-xl bg-white text-sm font-medium text-slate-700 shadow-sm cursor-pointer transition-colors duration-200 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FcGoogle className="h-5 w-5" aria-hidden="true" />
                <span>{isGoogleSubmitting ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-xs text-slate-400">or continue with email</span>
              </div>

              {isAccountNotFound ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">No account found</p>
                      <p className="text-slate-600 mb-3">
                        We couldn&apos;t find an account for <strong className="text-slate-900">{email}</strong>.
                      </p>
                      <Link
                        to={`/register?email=${encodeURIComponent(email)}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Create a new account &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                  <FiAlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <form className="w-full" onSubmit={handleSubmit}>
                <div className="mb-6">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setIsAccountNotFound(false)
                      if (error) setError('')
                    }}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <div className="relative mb-4">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
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

                <div id="clerk-captcha" className="my-2" />

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full py-3.5 mb-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  {isSubmitting ? 'Signing in...' : 'Login'}
                </button>
              </form>

              <p className="text-xs text-slate-600 text-center">
                Don&apos;t have an account?{' '}
                <Link
                  to={email ? `/register?email=${encodeURIComponent(email)}` : '/register'}
                  className="text-blue-600 font-semibold hover:underline"
                >
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
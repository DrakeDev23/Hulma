import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignUp } from '@clerk/react/legacy'
import { useUser, useClerk } from '@clerk/react'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

const errorText = (err, fallback) =>
  err?.errors?.[0]?.longMessage ||
  err?.errors?.[0]?.message ||
  err?.message ||
  fallback

export default function RegisterPage({ mode = 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded, signUp, setActive } = useSignUp()
  const { isSignedIn } = useUser()
  const clerk = useClerk()

  const searchParams = new URLSearchParams(location.search)
  const initialEmail = searchParams.get('email') || location.state?.email || ''

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [isEmailTaken, setIsEmailTaken] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [error, setError] = useState(location.state?.notice || '')

  const needsCode = pendingVerification

  const handleStartOver = () => {
    setCode('')
    setError('')
    setInfoMessage('')
    setPendingVerification(false)
    try {
      clerk?.client?.resetSignUp?.()
    } catch (err) {
      console.error('Error resetting sign up:', err)
    }
  }

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true })
  }, [isSignedIn, navigate])

  useEffect(() => {
    if (!pendingVerification && signUp?.status === 'missing_requirements') {
      try {
        clerk?.client?.resetSignUp?.()
      } catch (err) {
        console.error('Error resetting sign up:', err)
      }
    }
  }, [pendingVerification, signUp?.status, clerk])

  const handleGoogleRegister = async () => {
    if (isGoogleSubmitting || isSubmitting) return

    if (!isLoaded || !signUp) {
      setError('Registration service is still initializing. Please wait a moment and try again.')
      return
    }

    setError('')
    setIsEmailTaken(false)
    setInfoMessage('')
    setIsGoogleSubmitting(true)

    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
        continueSignIn: true,
      })
    } catch (err) {
      console.error('Google register error:', err)
      setError(errorText(err, 'Google registration failed.'))
      setIsGoogleSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsEmailTaken(false)
    setInfoMessage('')

    if (!isLoaded || !signUp) {
      setError('Registration service is not ready yet.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setIsSubmitting(true)

    if (signUp?.status === 'missing_requirements') {
      try {
        clerk?.client?.resetSignUp?.()
      } catch {}
    }

    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: username.trim() || undefined,
        unsafeMetadata: { username: username.trim() },
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard')
        return
      }

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      })

      setPendingVerification(true)
    } catch (err) {
      console.error('Sign up error:', err)
      const errCode = err?.errors?.[0]?.code
      const errMsg = err?.errors?.[0]?.message || err?.message || ''
      const isTaken =
        errCode === 'form_identifier_exists' ||
        errMsg.toLowerCase().includes('taken') ||
        errMsg.toLowerCase().includes('already in use') ||
        errMsg.toLowerCase().includes('already exists')

      if (isTaken) {
        setIsEmailTaken(true)
        setError('An account with this email address already exists.')
      } else {
        setError(errorText(err, 'Registration failed. Please check your information.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')

    if (!isLoaded || !signUp) return
    setIsSubmitting(true)

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        navigate('/dashboard')
      } else {
        console.error('Sign-up not complete:', completeSignUp)
        setError('Verification incomplete. Please check the code and try again.')
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
      setError('')
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setInfoMessage('A new verification code has been sent to your email.')
    } catch (err) {
      setError(errorText(err, 'Could not send verification code.'))
    }
  }

  const inputClass =
    'w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600'

  return (
    <div data-mode={mode} className="auth-page min-h-screen w-full flex flex-col lg:flex-row bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-5 py-8 sm:px-10 md:px-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            aria-label="Back to home"
            onClick={handleStartOver}
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
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Verify your email</h2>
                <p className="text-xs text-slate-500">We sent a verification code to <strong>{email || signUp?.emailAddress}</strong>. Enter it below to finish.</p>
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
                  {isSubmitting ? 'Verifying...' : 'Verify and create account'}
                </button>
              </form>

              <div className="flex justify-between text-xs">
                <button type="button" onClick={resendCode} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Start over
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Register your account</h2>
                <p className="text-xs text-slate-500">Create your account. Select a method to get started:</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleRegister}
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

              {isEmailTaken ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Account already exists</p>
                      <p className="text-slate-600 mb-3">
                        An account is already registered with <strong className="text-slate-900">{email}</strong>.
                      </p>
                      <Link
                        to={`/login?email=${encodeURIComponent(email)}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Sign in to your account &rarr;
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
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Username"
                    className={inputClass}
                  />
                </div>

                <div className="mb-6">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setIsEmailTaken(false)
                      if (error) setError('')
                    }}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <div className="relative mb-6">
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

                <div className="relative mb-8">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Confirm Password"
                    className={`${inputClass} pr-8`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-0 top-3 text-slate-500 cursor-pointer transition-colors hover:text-slate-700"
                  >
                    {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>

                <div id="clerk-captcha" className="my-2" />

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting || !isLoaded}
                  className="w-full py-3.5 mb-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  {isSubmitting ? 'Creating account...' : !isLoaded ? 'Loading...' : 'Create account'}
                </button>
              </form>

              <p className="text-xs text-slate-600 text-center">
                Already have an account?{' '}
                <Link
                  to={email ? `/login?email=${encodeURIComponent(email)}` : '/login'}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex relative w-full lg:w-1/2 bg-linear-to-b from-blue-600 to-blue-950 px-8 pt-10 lg:px-14 lg:pt-16 flex-col overflow-hidden">
        <Link
          to="/"
          aria-label="Back to home"
          onClick={handleStartOver}
          className="group absolute right-6 top-6 z-10 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white lg:right-8 lg:top-8"
        >
          <FiArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
          <span>Back to home</span>
        </Link>

        <h1 className="max-w-md mx-auto text-center text-3xl sm:text-4xl font-bold text-white leading-tight">
          Your portfolio <span className="text-blue-950">journey</span> starts here. Create your Hulma account.
        </h1>

        <div className="mt-auto flex justify-center items-end pt-10">
          <img
            src={puppetImg}
            alt="Hulma mascot"
            className="h-80 sm:h-96 lg:h-[60vh] w-auto max-w-full object-contain object-bottom drop-shadow-xl"
          />
        </div>
      </div>
    </div>
  )
}
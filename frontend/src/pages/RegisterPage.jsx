import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignUp } from '@clerk/react/legacy'
import { useUser, useClerk } from '@clerk/react'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import zxcvbn from 'zxcvbn'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

const WORD_LIST = [
  'falcon', 'harbor', 'galaxy', 'timber', 'breeze', 'summit', 'shadow', 'beacon',
  'cosmic', 'anchor', 'spark', 'vector', 'valley', 'orbit', 'matrix', 'shield',
  'crystal', 'fusion', 'dynamo', 'phoenix', 'stride', 'zenith', 'pulse', 'aurora'
]

const generateStrongPassword = () => {
  const array = new Uint32Array(4)
  crypto.getRandomValues(array)
  const words = [
    WORD_LIST[array[0] % WORD_LIST.length],
    WORD_LIST[array[1] % WORD_LIST.length],
    WORD_LIST[array[2] % WORD_LIST.length],
    WORD_LIST[array[3] % WORD_LIST.length],
  ]
  const num = Math.floor(10 + Math.random() * 90)
  return `${words.join('-')}-${num}`
}

const errorText = (err, fallback) =>
  err?.errors?.[0]?.longMessage ||
  err?.errors?.[0]?.message ||
  err?.message ||
  fallback

const evaluatePasswordStrength = (pass) => {
  if (!pass) return null

  if (pass.length < 8) {
    const diff = 8 - pass.length
    return {
      score: 1,
      label: 'Weak',
      barColor: 'bg-red-500',
      textColor: 'text-red-600',
      tip: `Add ${diff} more character${diff === 1 ? '' : 's'} (minimum 8 required)`,
    }
  }

  const result = zxcvbn(pass)

  let score = 1
  let label = 'Weak'
  let barColor = 'bg-red-500'
  let textColor = 'text-red-600'

  if (result.score <= 1) {
    score = 1
    label = 'Weak'
    barColor = 'bg-red-500'
    textColor = 'text-red-600'
  } else if (result.score === 2) {
    score = 2
    label = 'Fair'
    barColor = 'bg-amber-500'
    textColor = 'text-amber-600'
  } else if (result.score === 3) {
    score = 3
    label = 'Good'
    barColor = 'bg-blue-600'
    textColor = 'text-blue-600'
  } else {
    score = 4
    label = 'Strong'
    barColor = 'bg-emerald-600'
    textColor = 'text-emerald-600'
  }

  let tip = ''
  if (result.feedback?.warning) {
    tip = result.feedback.warning
  } else if (result.feedback?.suggestions?.length > 0) {
    tip = result.feedback.suggestions[0]
  } else if (score === 4) {
    tip = 'Great, this is hard to guess'
  } else if (score === 3) {
    tip = 'Good password! Add a bit more length to make it even stronger'
  } else {
    tip = 'Avoid common words, names, or predictable patterns'
  }

  return {
    score,
    label,
    barColor,
    textColor,
    tip,
  }
}

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
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [error, setError] = useState(location.state?.notice || '')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  const strength = evaluatePasswordStrength(password)

  useEffect(() => {
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard', { replace: true })
    }
  }, [isSignedIn, navigate])

  const handleSuggestPassword = () => {
    const suggested = generateStrongPassword()
    setPassword(suggested)
    setConfirmPassword(suggested)
    setConfirmTouched(true)
    setShowPassword(true)
    setShowConfirmPassword(true)
    if (error) setError('')
  }

  const handleStartOver = () => {
    setCode('')
    setError('')
    setInfoMessage('')
    setNeedsCode(false)
    try {
      clerk?.client?.resetSignUp?.()
    } catch (err) {
      console.error('Error resetting sign up:', err)
    }
  }

  const handleGoogleRegister = async () => {
    if (isGoogleSubmitting || isSubmitting) return

    if (!isLoaded || !signUp) {
      setError('Authentication service is still initializing. Please wait a moment and try again.')
      return
    }

    setError('')
    setInfoMessage('')
    setIsGoogleSubmitting(true)

    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
        continueSignUp: true,
      })
    } catch (err) {
      console.error('Google register error:', err)
      const msg = errorText(err, 'Unable to sign up with Google.')
      if (
        msg.toLowerCase().includes('already signed in') ||
        msg.toLowerCase().includes('session already exists')
      ) {
        navigate('/dashboard')
        return
      }
      setError('Unable to sign up with Google. Please try again or use email.')
      setIsGoogleSubmitting(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!isLoaded || isSubmitting) return

    setConfirmTouched(true)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setInfoMessage('')

    if (signUp?.status === 'missing_requirements') {
      try {
        clerk?.client?.resetSignUp?.()
      } catch {}
    }

    try {
      const trimmedEmail = email.trim()
      const trimmedUsername = username.trim()

      const created = await signUp.create({
        emailAddress: trimmedEmail,
        password,
        firstName: trimmedUsername || undefined,
        unsafeMetadata: { username: trimmedUsername },
      })

      if (created.status === 'complete') {
        await setActive({ session: created.createdSessionId })
        navigate('/dashboard')
        return
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setNeedsCode(true)
      setInfoMessage(`We've sent a 6-digit code to ${trimmedEmail}.`)
    } catch (err) {
      console.error('Registration error:', err)
      const errCode = err?.errors?.[0]?.code
      const errMsg = err?.errors?.[0]?.message || err?.message || ''
      const isTaken =
        errCode === 'form_identifier_exists' ||
        errMsg.toLowerCase().includes('taken') ||
        errMsg.toLowerCase().includes('already in use') ||
        errMsg.toLowerCase().includes('already exists')

      if (isTaken) {
        setError('Unable to complete registration. Please check your details or try signing in.')
      } else {
        setError(errorText(err, 'Unable to create account. Please check your information and try again.'))
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
                <p className="text-xs text-slate-500">
                  We sent a verification code to <strong>{email || signUp?.emailAddress}</strong>. Enter it below to finish.
                </p>
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
                <button
                  type="button"
                  onClick={resendCode}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
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
                <p className="text-xs text-slate-500">
                  Create your account. Select a method to get started:
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                  <FiAlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={isSubmitting || isGoogleSubmitting}
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

              <form className="w-full" onSubmit={handleRegister}>
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
                      if (error) setError('')
                    }}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                {/* Password field with suggest button and slim strength bar */}
                <div className="relative mb-4">
                  <div className="flex justify-end mb-1">
                    <button
                      type="button"
                      onClick={handleSuggestPassword}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer focus:outline-none"
                    >
                      Suggest a strong password
                    </button>
                  </div>

                  <div className="relative">
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

                  {/* Slim 4-segment strength bar, hidden until user types */}
                  {strength && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="grid grid-cols-4 gap-1.5 flex-1" aria-hidden="true">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-1 rounded-full transition-all duration-200 ${
                                strength.score >= step ? strength.barColor : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${strength.textColor}`}>
                          {strength.label}
                        </span>
                      </div>

                      {/* ONE line of helper text showing next useful tip */}
                      <p
                        aria-live="polite"
                        className="text-[11px] text-slate-500 leading-snug"
                      >
                        {strength.tip}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="relative mb-2">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onBlur={() => setConfirmTouched(true)}
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

                {/* Match status shown ONLY after user leaves the field */}
                {confirmTouched && confirmPassword ? (
                  <div className="mb-6 text-xs flex items-center gap-1.5" aria-live="polite">
                    {password === confirmPassword ? (
                      <span className="text-emerald-600 flex items-center gap-1.5 font-medium">
                        <FiCheckCircle className="h-3.5 w-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1.5 font-medium">
                        <FiAlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mb-6" />
                )}

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
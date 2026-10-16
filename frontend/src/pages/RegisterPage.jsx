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

const evaluatePasswordStrength = (pass) => {
  if (!pass) {
    return {
      score: 0,
      label: 'Too short',
      barColor: 'bg-slate-200',
      textColor: 'text-slate-400',
      checks: [
        { id: 'length', label: '8+ characters', met: false },
        { id: 'upper', label: 'Uppercase letter (A-Z)', met: false },
        { id: 'lower', label: 'Lowercase letter (a-z)', met: false },
        { id: 'number', label: 'Number (0-9)', met: false },
        { id: 'symbol', label: 'Special symbol (!@#$...)', met: false },
      ],
    }
  }

  const checks = [
    { id: 'length', label: '8+ characters', met: pass.length >= 8 },
    { id: 'upper', label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(pass) },
    { id: 'lower', label: 'Lowercase letter (a-z)', met: /[a-z]/.test(pass) },
    { id: 'number', label: 'Number (0-9)', met: /[0-9]/.test(pass) },
    { id: 'symbol', label: 'Special symbol (!@#$...)', met: /[^A-Za-z0-9]/.test(pass) },
  ]

  const passedCount = checks.filter((c) => c.met).length

  let score = 1
  if (pass.length < 8) {
    score = 1
  } else if (passedCount <= 2) {
    score = 1
  } else if (passedCount === 3) {
    score = 2
  } else if (passedCount === 4) {
    score = 3
  } else {
    score = 4
  }

  const configs = {
    1: { label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-600' },
    2: { label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-600' },
    3: { label: 'Good', barColor: 'bg-blue-600', textColor: 'text-blue-600' },
    4: { label: 'Strong', barColor: 'bg-emerald-600', textColor: 'text-emerald-600' },
  }

  return {
    score,
    ...configs[score],
    checks,
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
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [error, setError] = useState(location.state?.notice || '')

  const passwordStrength = evaluatePasswordStrength(password)

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

              {error ? (
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
                      if (error) setError('')
                    }}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <div className="relative mb-2">
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

                {password ? (
                  <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Password strength</span>
                      <span className={`font-semibold ${passwordStrength.textColor}`}>
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            passwordStrength.score >= step ? passwordStrength.barColor : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {passwordStrength.checks.map((c) => (
                        <div
                          key={c.id}
                          className={`flex items-center gap-1.5 transition-colors ${
                            c.met ? 'text-emerald-700 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {c.met ? (
                            <FiCheckCircle className="h-3 w-3 shrink-0 text-emerald-600" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-0.5 shrink-0" />
                          )}
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[11px] text-slate-400">
                    Must be at least 8 characters long.
                  </div>
                )}

                <div className="relative mb-2">
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

                {confirmPassword ? (
                  <div className="mb-6 text-xs flex items-center gap-1.5">
                    {password === confirmPassword ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-medium">
                        <FiCheckCircle className="h-3.5 w-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1 font-medium">
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
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignUp, useUser } from '@clerk/react'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

const errorText = (err, fallback) => err?.longMessage || err?.message || fallback

export default function RegisterPage({ mode = 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp, fetchStatus } = useSignUp()
  const { isSignedIn } = useUser()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(location.state?.notice || '')

  const busy = fetchStatus === 'fetching'
  const needsCode =
    signUp?.status === 'missing_requirements' &&
    signUp.unverifiedFields?.includes('email_address') &&
    signUp.missingFields?.length === 0

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

  const handleGoogleRegister = async () => {
    if (!signUp) return
    setError('')

    try {
      const { error: ssoError } = await signUp.sso({
        strategy: 'oauth_google',
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: '/dashboard',
      })
      if (ssoError) {
        console.error(ssoError)
        setError(errorText(ssoError, 'Google registration failed.'))
      }
    } catch (err) {
      console.error(err)
      setError(errorText(err, 'Google registration failed.'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!signUp) {
      setError('Registration service is not ready yet.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const { error: pwError } = await signUp.password({ emailAddress: email, password, unsafeMetadata: { username } })
    if (pwError) {
      console.error(pwError)
      setError(errorText(pwError, 'Registration failed. Please try again.'))
      return
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode()
    if (sendError) setError(errorText(sendError, 'Could not send the verification code.'))
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code })
    if (verifyError) {
      setError(errorText(verifyError, 'That code did not work. Try again.'))
      return
    }

    if (signUp.status === 'complete') {
      const { error: finalizeError } = await signUp.finalize({ navigate: goToApp })
      if (finalizeError) setError(errorText(finalizeError, 'Could not finish creating your account.'))
    } else {
      console.error('Sign-up not complete:', signUp)
      setError('Could not complete registration. Please try again.')
    }
  }

  const inputClass =
    'w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600'

  return (
    <div data-mode={mode} className="auth-page min-h-screen w-full flex flex-col lg:flex-row bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-8">
            <img src={logoImg} alt="Hulma logo" className="h-8 w-auto object-contain" />
            <span>Hulma</span>
          </div>

          {needsCode ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Verify your email</h2>
                <p className="text-xs text-slate-500">We sent a code to {email}. Enter it below to finish.</p>
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
                  Verify and create account
                </button>
              </form>

              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => signUp.verifications.sendEmailCode()} className="text-blue-600 font-semibold hover:underline">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCode('')
                    setError('')
                    signUp.reset()
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
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Register your account</h2>
                <p className="text-xs text-slate-500">Create your account. Select a method to get started:</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleRegister}
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
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className={inputClass}
                  />
                </div>

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

                <div className="relative mb-6">
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

                <div className="relative mb-8">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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

                {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

                <div id="clerk-captcha" />

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 mb-6 bg-blue-400 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
                >
                  {busy ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <p className="text-xs text-slate-600 text-center">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-green-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex relative w-full lg:w-1/2 bg-linear-to-b from-blue-600 to-blue-950 px-8 pt-10 lg:px-14 lg:pt-16 flex-col overflow-hidden">
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
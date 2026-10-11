import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import logoImg from '../assets/logo.png'
import puppetImg from '../assets/puppet.png'

export default function RegisterPage({ mode = 'register' }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div data-mode={mode} className="auth-page min-h-screen w-full flex flex-col lg:flex-row bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-8">
            <img src={logoImg} alt="Hulma logo" className="h-8 w-auto object-contain" />
            <span>Hulma</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Register your account</h2>
            <p className="text-xs text-slate-500">Create your account. Select a method to get started:</p>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-6 border border-slate-300 rounded-xl bg-white text-sm font-medium text-slate-700 shadow-sm cursor-pointer transition-colors duration-200 hover:bg-slate-50"
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

          <form className="w-full">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Username"
                className="w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="mb-6">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="relative mb-6">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 pr-8 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600"
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
                placeholder="Confirm Password"
                className="w-full rounded-none border-b border-slate-400 bg-transparent px-0 py-2.5 pr-8 text-sm text-slate-900 placeholder-slate-500 transition-colors focus:outline-none focus:border-blue-600"
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

            <button
              type="submit"
              className="w-full py-3.5 mb-6 bg-blue-400 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-colors duration-200"
            >
              Create account
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-green-600 hover:underline">
              Sign in
            </Link>
          </p>
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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL

const missingKeyElement = (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-800">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
      <h1 className="text-xl font-bold text-slate-900 mb-2">Clerk Configuration Required</h1>
      <p className="text-sm text-slate-600 mb-6">
        The environment variable <code className="bg-slate-100 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> is not configured.
      </p>
      <p className="text-xs text-slate-500">
        Please provide your Clerk Publishable Key in your deployment environment variables or <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">.env</code> file.
      </p>
    </div>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider
        publishableKey={publishableKey}
        proxyUrl={proxyUrl || undefined}
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    ) : (
      missingKeyElement
    )}
  </StrictMode>,
)

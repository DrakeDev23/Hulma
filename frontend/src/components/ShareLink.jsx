import { useState } from 'react'
import { Check, Copy, ExternalLink, Link2, Share2 } from 'lucide-react'

export const getShareSlug = (p) => p?.slug || p?.public_id || p?.share_id || p?.id || p?._id || ''

export const buildShareUrl = (slug) =>
    slug && typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}` : ''

export default function ShareLink({ slug, dark = false }) {
    const [copied, setCopied] = useState(false)
    const url = buildShareUrl(slug)

    const isPublicDisabled = (() => {
        try {
            const raw = localStorage.getItem('hulma-settings')
            if (raw) {
                const parsed = JSON.parse(raw)
                return parsed.publicLink === false
            }
        } catch {}
        return false
    })()

    if (!url) return null

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            window.prompt('Copy your portfolio link', url)
        }
    }

    const share = async () => {
        try {
            await navigator.share({ title: 'My portfolio', url })
        } catch {
            return
        }
    }

    const box = dark ? 'border-white/30 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-800'
    const btn = dark
        ? 'bg-white/15 text-white hover:bg-white/25'
        : 'bg-[#dce9fb] text-[#1f6fdc] hover:bg-[#cfe0fa]'

    return (
        <div className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 ${box}`}>
            <Link2 size={15} className="shrink-0 opacity-70" />
            <span className="min-w-0 flex-1 truncate text-xs sm:text-sm" title={url}>{url}</span>
            {isPublicDisabled && (
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dark ? 'bg-amber-400/25 text-amber-100' : 'bg-amber-100 text-amber-700'}`} title="Public access is turned off in Settings">
                    Private
                </span>
            )}
            <button onClick={copy} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95 ${btn}`}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={url} target="_blank" rel="noreferrer" aria-label="Open public page" className={`inline-flex shrink-0 items-center rounded-full p-1.5 transition active:scale-95 ${btn}`}>
                <ExternalLink size={12} />
            </a>
            {typeof navigator !== 'undefined' && navigator.share && (
                <button onClick={share} aria-label="Share" className={`inline-flex shrink-0 items-center rounded-full p-1.5 transition active:scale-95 ${btn}`}>
                    <Share2 size={12} />
                </button>
            )}
        </div>
    )
}
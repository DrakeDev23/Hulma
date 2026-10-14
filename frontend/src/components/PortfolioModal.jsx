import { useEffect } from 'react'
import { PenLine, X } from 'lucide-react'
import PortfolioSite from './PortfolioSite'
import ShareLink, { getShareSlug } from './ShareLink'

export default function PortfolioModal({ portfolio, open, onClose, onEdit }) {
    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        const previousOverflow = document.body.style.overflow
        document.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = previousOverflow
        }
    }, [open, onClose])

    if (!open || !portfolio) return null

    const template = portfolio.sections?.meta?.templateId || portfolio.templateId || portfolio.template || 'simple'
    const slug = getShareSlug(portfolio)
    const name = portfolio.sections?.profile?.fullName || portfolio.title || 'Your portfolio'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-6"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${name} portfolio`}
                className="flex h-full max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-[#f3f6fb] px-3 py-2.5 sm:px-4">
                    <div className="min-w-0 flex-1 sm:flex-none">
                        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                        <p className="text-[11px] capitalize text-slate-500">{template} template</p>
                    </div>
                    <div className="order-last w-full min-w-0 sm:order-none sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1">
                        <ShareLink slug={slug} />
                    </div>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                        >
                            <PenLine size={12} /> Edit
                        </button>
                    )}
                    <button
                        autoFocus
                        onClick={onClose}
                        aria-label="Close portfolio"
                        className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-600 transition hover:bg-slate-100 active:scale-95"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <PortfolioSite portfolio={portfolio} template={template} idPrefix="modal" />
                </div>
            </div>
        </div>
    )
}
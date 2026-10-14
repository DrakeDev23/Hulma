import { useEffect, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import PortfolioSite from './PortfolioSite'

export default function PortfolioPreviewModal({ portfolio, open, onClose, onEdit, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.()
        }
        document.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [open, onClose])

    if (!open || !portfolio) return null

    const sections = { ...(portfolio.sections || {}) }
    if (!sections.profile && portfolio.profile) sections.profile = portfolio.profile
    if (!sections.skills && portfolio.skills) sections.skills = portfolio.skills
    const site = { ...portfolio, sections }

    const template =
        portfolio.sections?.meta?.templateId || portfolio.templateId || portfolio.template || 'simple'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Portfolio preview"
            onClick={onClose}
        >
            <div
                className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <div className="min-w-0">
                        <strong className="block truncate text-sm font-semibold text-slate-800">
                            {portfolio.title || 'Portfolio'}
                        </strong>
                        <small className="text-xs text-slate-500">Live preview</small>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#1f6fdc] hover:text-[#1f6fdc] active:scale-95"
                            >
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 active:scale-95"
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close preview"
                            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <PortfolioSite portfolio={site} template={template} idPrefix="preview" />
                </div>

                {confirmDelete && (
                    <div className="border-t border-red-200 bg-red-50 px-4 py-3"> 
                        <p className="text-sm font-semibold text-red-700">Delete this portfolio?</p>
                        <p className="mt-0.5 text-xs text-red-600">This cannot be undone.</p>
                        <div className="mt-2 flex gap-2">
                            <button onClick={() => { setConfirmDelete(false); onDelete?.(); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 active:scale-95">Confirm delete</button>
                            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95">Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
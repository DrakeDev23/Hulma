import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react'

export default function ProjectActionsMenu({
    index,
    totalCount,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)
    const buttonRef = useRef(null)

    const isFirst = index === 0
    const isLast = index === totalCount - 1
    const isMax = totalCount >= 7
    const isOnlyOne = totalCount <= 1

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
                setIsOpen(false)
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false)
                buttonRef.current?.focus()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const handleAction = (callback) => {
        setIsOpen(false)
        callback()
    }

    return (
        <div className="relative inline-block text-left">
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen((prev) => !prev)
                }}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`Project #${index + 1} actions`}
                className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
                <MoreHorizontal size={20} aria-hidden="true" />
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        role="menuitem"
                        disabled={isFirst}
                        onClick={() => handleAction(onMoveUp)}
                        className="w-full min-h-[40px] px-3 py-2 text-left text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 transition cursor-pointer"
                    >
                        <ArrowUp size={15} className="text-slate-500" aria-hidden="true" />
                        <span>Move up</span>
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        disabled={isLast}
                        onClick={() => handleAction(onMoveDown)}
                        className="w-full min-h-[40px] px-3 py-2 text-left text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 transition cursor-pointer"
                    >
                        <ArrowDown size={15} className="text-slate-500" aria-hidden="true" />
                        <span>Move down</span>
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        disabled={isMax}
                        onClick={() => handleAction(onDuplicate)}
                        className="w-full min-h-[40px] px-3 py-2 text-left text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 transition cursor-pointer"
                    >
                        <Copy size={15} className="text-slate-500" aria-hidden="true" />
                        <span>Duplicate</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                        type="button"
                        role="menuitem"
                        disabled={isOnlyOne}
                        onClick={() => handleAction(onDelete)}
                        className="w-full min-h-[40px] px-3 py-2 text-left text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 transition cursor-pointer"
                    >
                        <Trash2 size={15} className="text-red-500" aria-hidden="true" />
                        <span>Delete project</span>
                    </button>
                </div>
            )}
        </div>
    )
}

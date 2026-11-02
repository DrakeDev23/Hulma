import { useState } from 'react'
import { X, Plus } from 'lucide-react'

const COMMON_SUGGESTIONS = [
    'React',
    'TypeScript',
    'Next.js',
    'Tailwind CSS',
    'Node.js',
    'Python',
    'PostgreSQL',
    'Figma',
]

export default function TechChipInput({ value = '', onChange, placeholder = 'e.g. React, Python...' }) {
    const [inputValue, setInputValue] = useState('')

    const chips = value
        ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : []

    const addChip = (tag) => {
        const trimmed = tag.trim().replace(/,+$/, '')
        if (!trimmed) return
        if (!chips.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            const updated = [...chips, trimmed]
            onChange(updated.join(', '))
        }
        setInputValue('')
    }

    const removeChip = (indexToRemove) => {
        const updated = chips.filter((_, idx) => idx !== indexToRemove)
        onChange(updated.join(', '))
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addChip(inputValue)
        } else if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
            removeChip(chips.length - 1)
        }
    }

    const handleBlur = () => {
        if (inputValue.trim()) {
            addChip(inputValue)
        }
    }

    const availableSuggestions = COMMON_SUGGESTIONS.filter(
        (s) => !chips.some((c) => c.toLowerCase() === s.toLowerCase())
    ).slice(0, 5)

    return (
        <div className="space-y-2">
            <div className="min-h-[44px] rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition flex flex-wrap items-center gap-1.5">
                {chips.map((chip, idx) => (
                    <span
                        key={`${chip}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold"
                    >
                        <span>{chip}</span>
                        <button
                            type="button"
                            onClick={() => removeChip(idx)}
                            aria-label={`Remove ${chip}`}
                            className="min-h-[24px] min-w-[24px] inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                        >
                            <X size={13} aria-hidden="true" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={chips.length === 0 ? placeholder : 'Add more...'}
                    className="flex-1 min-w-[120px] min-h-[32px] bg-transparent text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none px-1"
                />
            </div>

            {availableSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Suggestions:</span>
                    {availableSuggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addChip(suggestion)}
                            className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 text-xs font-medium transition cursor-pointer active:scale-95"
                        >
                            <Plus size={12} aria-hidden="true" />
                            <span>{suggestion}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

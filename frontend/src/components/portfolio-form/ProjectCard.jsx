import { safeSrc } from '../../utils/safeUrl'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CheckCircle2, AlertCircle, ExternalLink, Check, ArrowRight, Image as ImageIcon } from 'lucide-react'
import ProjectPhotoField from './ProjectPhotoField'
import TechChipInput from './TechChipInput'
import ProjectActionsMenu from './ProjectActionsMenu'

export default function ProjectCard({
    project,
    index,
    totalCount,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onPhotoUpload,
    onPhotoRemove,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    onDone,
    onNext,
    hasGlobalError = false,
}) {
    const cardRef = useRef(null)
    const titleInputRef = useRef(null)
    const descInputRef = useRef(null)

    const [fieldErrors, setFieldErrors] = useState({})

    const hasTitle = Boolean(project.name?.trim())
    const hasDescription = Boolean(project.description?.trim())
    const isComplete = hasTitle && hasDescription
    const hasPhoto = Boolean(project.image?.trim())

    const prevExpandedRef = useRef(isExpanded)

    useEffect(() => {
        const wasExpanded = prevExpandedRef.current
        prevExpandedRef.current = isExpanded

        if (isExpanded && !wasExpanded) {
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            const timer = setTimeout(() => {
                if (!project.name?.trim()) {
                    titleInputRef.current?.focus()
                } else if (!project.description?.trim()) {
                    descInputRef.current?.focus()
                }
            }, 180)
            return () => clearTimeout(timer)
        }
    }, [isExpanded, project.name, project.description])

    const validateField = (field, val) => {
        const nextErrors = { ...fieldErrors }
        if (field === 'name') {
            if (!val?.trim()) {
                nextErrors.name = 'Project title is required'
            } else {
                delete nextErrors.name
            }
        }
        if (field === 'description') {
            if (!val?.trim()) {
                nextErrors.description = 'Description is required'
            } else {
                delete nextErrors.description
            }
        }
        setFieldErrors(nextErrors)
        return nextErrors
    }

    const handleBlur = (field) => {
        validateField(field, project[field])
    }

    const handleDoneClick = () => {
        const titleErr = !project.name?.trim() ? 'Project title is required' : null
        const descErr = !project.description?.trim() ? 'Description is required' : null
        if (titleErr || descErr) {
            setFieldErrors({
                ...(titleErr && { name: titleErr }),
                ...(descErr && { description: descErr }),
            })
            if (titleErr) titleInputRef.current?.focus()
            else if (descErr) descInputRef.current?.focus()
            return
        }
        setFieldErrors({})
        onDone(index)
    }

    const handleNextClick = () => {
        const titleErr = !project.name?.trim() ? 'Project title is required' : null
        const descErr = !project.description?.trim() ? 'Description is required' : null
        if (titleErr || descErr) {
            setFieldErrors({
                ...(titleErr && { name: titleErr }),
                ...(descErr && { description: descErr }),
            })
            return
        }
        setFieldErrors({})
        onNext(index)
    }

    const isLinkValid = !project.link || project.link.startsWith('http://') || project.link.startsWith('https://')

    return (
        <div
            ref={cardRef}
            className={`rounded-2xl border transition-all duration-200 bg-white overflow-hidden shadow-2xs ${
                hasGlobalError && !isComplete
                    ? 'border-red-300 ring-2 ring-red-100'
                    : isExpanded
                    ? 'border-blue-500 ring-2 ring-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
            }`}
        >
            <div
                className={`flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 min-h-[64px] transition cursor-pointer select-none ${
                    isExpanded ? 'bg-slate-50/70 border-b border-slate-100' : 'hover:bg-slate-50/50'
                }`}
                onClick={onToggleExpand}
            >
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`project-panel-${index}`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpand()
                    }}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl"
                >
                    <div className="h-12 w-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center shadow-2xs">
                        {hasPhoto ? (
                            <img
                                src={safeSrc(project.image)}
                                alt={project.name || 'Thumbnail'}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <ImageIcon size={20} className="text-slate-400" aria-hidden="true" />
                        )}
                    </div>

                    {/* Title, Subtitle & Status Badge */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 truncate">
                                {project.name?.trim() ? project.name : (
                                    <span className="text-slate-400 italic font-normal">Untitled Project</span>
                                )}
                            </h4>

                            {/* Small Status Indicator */}
                            {isComplete ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                    <CheckCircle2 size={12} aria-hidden="true" />
                                    <span>Complete</span>
                                </span>
                            ) : !hasTitle ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                    <AlertCircle size={12} aria-hidden="true" />
                                    <span>Needs title</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                    <AlertCircle size={12} aria-hidden="true" />
                                    <span>Needs description</span>
                                </span>
                            )}
                        </div>

                        {/* Muted gray one-line description underneath (not blue) */}
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                            {project.description?.trim()
                                ? project.description
                                : project.tech?.trim()
                                ? project.tech
                                : 'Tap to add details'}
                        </p>
                    </div>
                </button>

                {/* Right controls: "⋯" Actions Menu + Animated Rotating Chevron */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <ProjectActionsMenu
                        index={index}
                        totalCount={totalCount}
                        onMoveUp={onMoveUp}
                        onMoveDown={onMoveDown}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                    />
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        aria-label={isExpanded ? 'Collapse project details' : 'Expand project details'}
                        className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <ChevronDown
                            size={19}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            {/* Expanded Card Body: 1 column on mobile, 2 columns on desktop (>=768px) */}
            {isExpanded && (
                <div
                    id={`project-panel-${index}`}
                    role="region"
                    aria-label={`Project #${index + 1} details`}
                    className="p-4 sm:p-5 md:p-6 bg-white space-y-5 animate-in fade-in duration-150"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        {/* Desktop Left Column / Mobile Order 1 & 5 */}
                        <div className="space-y-4 flex flex-col">
                            {/* 1. Photo First */}
                            <div className="order-1">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Project Screenshot / Photo <span className="text-slate-400 font-normal">(recommended)</span>
                                </label>
                                <ProjectPhotoField
                                    imageUrl={project.image || ''}
                                    projectName={project.name || ''}
                                    onUpload={(file) => onPhotoUpload(index, file)}
                                    onRemove={() => onPhotoRemove(index)}
                                />
                            </div>

                            {/* 5. Project Link */}
                            <div className="order-5 md:order-2 md:mt-2">
                                <label htmlFor={`proj-link-${index}`} className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Project Link / Live Demo <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <ExternalLink
                                        size={16}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                        aria-hidden="true"
                                    />
                                    <input
                                        id={`proj-link-${index}`}
                                        type="url"
                                        inputMode="url"
                                        enterKeyHint="next"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        placeholder="https://example.com"
                                        value={project.link || ''}
                                        onChange={(e) => onUpdate(index, 'link', e.target.value)}
                                        className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                                    />
                                </div>
                                {project.link && !isLinkValid && (
                                    <p className="text-[11px] text-amber-700 font-medium mt-1">
                                        Hint: Links usually begin with https://
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Desktop Right Column / Mobile Order 2, 3, 4 */}
                        <div className="space-y-4 flex flex-col">
                            {/* 2. Project Title */}
                            <div className="order-2">
                                <label htmlFor={`proj-title-${index}`} className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Project Title <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                    <span className="sr-only">Required</span>
                                </label>
                                <input
                                    id={`proj-title-${index}`}
                                    ref={titleInputRef}
                                    type="text"
                                    enterKeyHint="next"
                                    placeholder="e.g. E-Commerce Platform"
                                    value={project.name || ''}
                                    onBlur={() => handleBlur('name')}
                                    onChange={(e) => {
                                        onUpdate(index, 'name', e.target.value)
                                        if (fieldErrors.name && e.target.value.trim()) {
                                            setFieldErrors((prev) => {
                                                const next = { ...prev }
                                                delete next.name
                                                return next
                                            })
                                        }
                                    }}
                                    className={`w-full min-h-[44px] rounded-xl border px-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition ${
                                        fieldErrors.name
                                            ? 'border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20'
                                            : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600 bg-white'
                                    }`}
                                />
                                {fieldErrors.name && (
                                    <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1" role="alert">
                                        <AlertCircle size={13} aria-hidden="true" />
                                        <span>{fieldErrors.name}</span>
                                    </p>
                                )}
                            </div>

                            {/* 3. Description with live character counter */}
                            <div className="order-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor={`proj-desc-${index}`} className="block text-xs font-semibold text-slate-700">
                                        Description <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                        <span className="sr-only">Required</span>
                                    </label>
                                    <span
                                        className={`text-[11px] font-mono ${
                                            (project.description?.length || 0) > 280
                                                ? 'text-amber-600 font-bold'
                                                : 'text-slate-400'
                                        }`}
                                    >
                                        {project.description?.length || 0}/280
                                    </span>
                                </div>
                                <textarea
                                    id={`proj-desc-${index}`}
                                    ref={descInputRef}
                                    rows={3}
                                    placeholder="Briefly describe what you built, key features, and problems solved..."
                                    value={project.description || ''}
                                    onBlur={() => handleBlur('description')}
                                    onChange={(e) => {
                                        onUpdate(index, 'description', e.target.value)
                                        if (fieldErrors.description && e.target.value.trim()) {
                                            setFieldErrors((prev) => {
                                                const next = { ...prev }
                                                delete next.description
                                                return next
                                            })
                                        }
                                    }}
                                    className={`w-full min-h-[88px] rounded-xl border p-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition ${
                                        fieldErrors.description
                                            ? 'border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20'
                                            : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600 bg-white'
                                    }`}
                                />
                                {fieldErrors.description && (
                                    <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1" role="alert">
                                        <AlertCircle size={13} aria-hidden="true" />
                                        <span>{fieldErrors.description}</span>
                                    </p>
                                )}
                            </div>

                            {/* 4. Technologies Chip Input */}
                            <div className="order-4">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Technologies Used <span className="text-slate-400 font-normal">(press Enter or comma to add)</span>
                                </label>
                                <TechChipInput
                                    value={project.tech || ''}
                                    onChange={(newTech) => onUpdate(index, 'tech', newTech)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card Footer: Solid Primary "Done" + Secondary "Next project" */}
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleDoneClick}
                            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-xs inline-flex items-center justify-center gap-2 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                            <Check size={16} aria-hidden="true" />
                            <span>Done editing</span>
                        </button>

                        {index < totalCount - 1 && (
                            <button
                                type="button"
                                onClick={handleNextClick}
                                className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-sm font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                                <span>Next project</span>
                                <ArrowRight size={15} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

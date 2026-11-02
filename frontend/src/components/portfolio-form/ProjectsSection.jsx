import { useState } from 'react'
import { FolderGit2, Plus, AlertCircle, Check, ArrowRight } from 'lucide-react'
import ProjectCard from './ProjectCard'

const MAX_PROJECTS = 7

export default function ProjectsSection({
    projectList = [],
    onUpdateProject,
    onRemoveProject,
    onAddProject,
    onPhotoUpload,
    onPhotoRemove,
    onMoveProject,
    onDuplicateProject,
    errors = {},
}) {
    // Single-open accordion: stores index of currently open card, or null if all closed
    const [activeIndex, setActiveIndex] = useState(null)

    const toggleExpand = (index) => {
        setActiveIndex((prev) => (prev === index ? null : index))
    }

    const handleDone = () => {
        setActiveIndex(null)
    }

    const handleNext = (index) => {
        if (index < projectList.length - 1) {
            setActiveIndex(index + 1)
        } else {
            setActiveIndex(null)
        }
    }

    const handleAddNew = () => {
        if (projectList.length >= MAX_PROJECTS) return
        onAddProject()
        // The newly added project will be at the end of the list
        setActiveIndex(projectList.length)
    }

    const isMaxReached = projectList.length >= MAX_PROJECTS
    const activeProject = activeIndex !== null ? projectList[activeIndex] : null

    return (
        <div id="field-projects" className="space-y-4">
            {/* Header: Title, "2 / 7" counter, single-line helper text */}
            <div className="border-b border-slate-200/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderGit2 className="text-blue-600 h-5 w-5" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-slate-800">Projects</h3>
                        <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                        <span className="sr-only">Required</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                            {projectList.length} / {MAX_PROJECTS}
                        </span>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Showcase your best work with titles, descriptions, and preview photos.
                </p>
            </div>

            {/* Global validation error if any */}
            {errors.projects && (
                <div
                    id="error-projects"
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs font-medium text-red-600 flex items-center gap-2"
                >
                    <AlertCircle size={16} className="shrink-0 text-red-600" aria-hidden="true" />
                    <span>{errors.projects}</span>
                </div>
            )}

            {/* Accordion Cards (Single-open) */}
            <div className="space-y-3">
                {projectList.map((project, index) => (
                    <ProjectCard
                        key={project.id || `proj-${index}`}
                        project={project}
                        index={index}
                        totalCount={projectList.length}
                        isExpanded={activeIndex === index}
                        onToggleExpand={() => toggleExpand(index)}
                        onUpdate={onUpdateProject}
                        onPhotoUpload={onPhotoUpload}
                        onPhotoRemove={onPhotoRemove}
                        onMoveUp={() => onMoveProject(index, index - 1)}
                        onMoveDown={() => onMoveProject(index, index + 1)}
                        onDuplicate={() => onDuplicateProject(index)}
                        onDelete={() => onRemoveProject(index)}
                        onDone={() => handleDone(index)}
                        onNext={() => handleNext(index)}
                        hasGlobalError={Boolean(errors.projects)}
                    />
                ))}
            </div>

            {/* Bottom Add Project Button (Full width) */}
            {isMaxReached ? (
                <div className="w-full text-center py-3 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    Maximum 7 projects reached
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 text-blue-700 px-4 py-3 text-xs sm:text-sm font-semibold transition active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                    <Plus size={17} aria-hidden="true" />
                    <span>Add project</span>
                </button>
            )}

            {/* Mobile Sticky Action Bar while a project card is open */}
            {activeProject && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center gap-2 max-w-md mx-auto">
                        <button
                            type="button"
                            onClick={() => handleDone(activeIndex)}
                            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                            <Check size={16} aria-hidden="true" />
                            <span>Done editing #{activeIndex + 1}</span>
                        </button>
                        {activeIndex < projectList.length - 1 && (
                            <button
                                type="button"
                                onClick={() => handleNext(activeIndex)}
                                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                                aria-label="Next project"
                            >
                                <span>Next</span>
                                <ArrowRight size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

import { useRef, useState } from 'react'
import { Upload, Image as ImageIcon, RefreshCw, Trash2, AlertCircle } from 'lucide-react'

export default function ProjectPhotoField({
    imageUrl = '',
    projectName = '',
    onUpload,
    onRemove,
    disabled = false,
}) {
    const fileInputRef = useRef(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState(null)
    const [isDragOver, setIsDragOver] = useState(false)

    const handleFileChange = async (file) => {
        if (!file) return
        setUploadError(null)
        setIsUploading(true)
        try {
            await onUpload(file)
        } catch (err) {
            setUploadError(err.message || 'Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (disabled || isUploading) return
        const files = e.dataTransfer.files
        if (files && files[0]) {
            handleFileChange(files[0])
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        if (!disabled && !isUploading) {
            setIsDragOver(true)
        }
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    return (
        <div className="space-y-2">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || isUploading}
                onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            {/* 16:9 Container */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative aspect-video w-full rounded-2xl overflow-hidden transition-all duration-200 select-none ${
                    imageUrl
                        ? 'border border-slate-200 bg-slate-900/5'
                        : isDragOver
                        ? 'border-2 border-dashed border-blue-500 bg-blue-50/60 ring-4 ring-blue-50'
                        : 'border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'
                }`}
            >
                {/* 1. Loading State */}
                {isUploading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs p-4 text-center">
                        <RefreshCw className="h-7 w-7 text-blue-600 animate-spin mb-2" />
                        <p className="text-xs font-semibold text-slate-800">Uploading screenshot...</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Optimizing & saving image</p>
                    </div>
                )}

                {/* 2. Image Preview if uploaded */}
                {imageUrl ? (
                    <div className="group relative h-full w-full">
                        <img
                            src={imageUrl}
                            alt={projectName || 'Project preview'}
                            className="h-full w-full object-cover"
                        />
                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="min-h-[44px] px-3.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-xs"
                            >
                                <Upload size={15} />
                                <span>Change</span>
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                className="min-h-[44px] px-3.5 rounded-xl bg-red-600/95 hover:bg-red-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-xs"
                            >
                                <Trash2 size={15} />
                                <span>Remove</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 3. Empty Dropzone */
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        className="h-full w-full flex flex-col items-center justify-center p-4 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-2xl"
                    >
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 mb-2 border border-blue-100 shadow-2xs">
                            <ImageIcon size={22} aria-hidden="true" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Add a screenshot</p>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-[240px]">
                            Tap to upload from device or drag & drop (JPG, PNG, WebP up to 7MB)
                        </p>
                    </button>
                )}
            </div>

            {/* Error & Retry State */}
            {uploadError && (
                <div
                    role="alert"
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle size={15} className="shrink-0 text-red-600" />
                        <span className="truncate">{uploadError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[32px] px-2.5 rounded-lg bg-red-100 hover:bg-red-200 font-semibold text-red-800 shrink-0 transition cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    )
}

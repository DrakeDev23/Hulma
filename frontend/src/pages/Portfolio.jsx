import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { createPortal } from 'react-dom'
import {
    Plus,
    Search,
    PenLine,
    Eye,
    X,
    MoreHorizontal,
    Copy,
    Check,
    ExternalLink,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import usePortfolio from '../hooks/usePortfolio'
import PortfolioSite from '../components/PortfolioSite'
import {
    resolvePortfolioList,
    titleCase,
    resolveDisplayName,
    relativeTime,
    timeGreeting,
    apiUrl,
} from '../utils/portfolioUtils'

const PAGE_SIZE = 8

const TEMPLATE_CONFIG = {
    simple: {
        label: 'Simple',
        dot: 'bg-stone-500',
        badge: 'bg-stone-50 text-stone-700 border-stone-200',
    },
    modern: {
        label: 'Modern',
        dot: 'bg-blue-600',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    creative: {
        label: 'Creative',
        dot: 'bg-purple-600',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    'creative-studio': {
        label: 'Creative Studio',
        dot: 'bg-[#1F3558]',
        badge: 'bg-[#F2F3F5] text-[#1F3558] border-[#B9C3DB]',
    },
}

const TEMPLATE_TABS = [
    { id: 'all', label: 'All', dot: null },
    { id: 'simple', label: 'Simple', dot: 'bg-stone-500' },
    { id: 'modern', label: 'Modern', dot: 'bg-blue-600' },
    { id: 'creative', label: 'Creative', dot: 'bg-purple-600' },
    { id: 'creative-studio', label: 'Creative Studio', dot: 'bg-[#1F3558]' },
]

function PortfolioThumbnail({ portfolio }) {
    const template = String(portfolio?.templateId || portfolio?.template || 'modern').toLowerCase()
    const picture = portfolio?.picture

    if (template === 'creative-studio' || template === 'studio') {
        return (
            <div className="relative w-full h-full bg-[#F2F3F5] p-3 flex flex-col justify-between overflow-hidden select-none">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#B9C3DB]/40 blur-md" />
                <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-[#1F3558]/10 blur-md" />
                <div className="relative z-10 flex items-center justify-between border-b border-[#B9C3DB]/40 pb-1">
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#1F3558]" />
                        <div className="h-1.5 w-10 rounded bg-[#1F3558]" />
                    </div>
                    <div className="h-1 w-4 rounded-full bg-[#7A7F8A]" />
                </div>
                <div className="relative z-10 flex items-center gap-2.5 my-auto">
                    {picture ? (
                        <div className="relative">
                            <img
                                src={picture}
                                alt=""
                                className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm shrink-0"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#1F3558] text-white flex items-center justify-center text-[7px]">
                                ↗
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-[#1F3558] border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                                {portfolio?.title?.charAt(0) || 'C'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#1F3558] text-white flex items-center justify-center text-[7px]">
                                ↗
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="h-2 w-20 rounded-xs bg-[#1A1A2E]" />
                        <div className="h-1.5 w-full rounded-xs bg-[#B9C3DB]" />
                    </div>
                </div>
                <div className="relative z-10 flex justify-between items-center">
                    <div className="h-1.5 w-12 rounded-full bg-[#1F3558]" />
                    <div className="h-1 w-8 rounded-full bg-[#7A7F8A]" />
                </div>
            </div>
        )
    }

    if (template === 'creative') {
        return (
            <div className="relative w-full h-full bg-[#08070e] flex items-center justify-center overflow-hidden select-none">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-600/30 blur-lg" />
                <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-pink-600/25 blur-lg" />
                {picture ? (
                    <img
                        src={picture}
                        alt=""
                        className="relative z-10 h-12 w-12 rounded-full border-2 border-white/20 object-cover shadow-lg"
                    />
                ) : (
                    <div className="relative z-10 flex flex-col items-center gap-1.5 p-3 text-center">
                        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                        <div className="h-1.5 w-24 rounded-full bg-white/30" />
                        <div className="flex gap-1 mt-1">
                            <span className="h-1 w-5 rounded-xs bg-white/20" />
                            <span className="h-1 w-5 rounded-xs bg-white/20" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (template === 'simple') {
        return (
            <div className="relative w-full h-full bg-[#fdfcf9] border-b border-stone-200 p-3.5 flex flex-col justify-between select-none">
                <div className="flex justify-between items-center border-b border-stone-200/80 pb-1.5">
                    <div className="h-2 w-14 rounded-xs bg-stone-800" />
                    <div className="flex gap-1">
                        <div className="h-1 w-3 rounded-xs bg-stone-400" />
                        <div className="h-1 w-3 rounded-xs bg-stone-400" />
                    </div>
                </div>
                <div className="flex items-center gap-2.5 py-1">
                    {picture ? (
                        <img
                            src={picture}
                            alt=""
                            className="h-12 w-12 rounded-full border border-stone-300 object-cover shrink-0"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-700 font-serif text-sm font-bold shrink-0">
                            {portfolio?.title?.charAt(0) || 'P'}
                        </div>
                    )}
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="h-2 w-20 rounded-xs bg-stone-900" />
                        <div className="h-1.5 w-full rounded-xs bg-stone-300" />
                    </div>
                </div>
                <div className="h-1 w-14 rounded-xs bg-stone-300" />
            </div>
        )
    }

    // Default: Modern
    return (
        <div className="relative w-full h-full bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white p-3.5 flex flex-col justify-between select-none">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-2 py-1 rounded-lg shadow-2xs">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-md bg-blue-600" />
                    <div className="h-1.5 w-12 rounded bg-slate-700" />
                </div>
                <div className="flex gap-1">
                    <div className="h-1 w-3 rounded bg-slate-300" />
                    <div className="h-1 w-3 rounded bg-slate-300" />
                </div>
            </div>
            <div className="flex items-center gap-2.5 my-auto">
                {picture ? (
                    <img
                        src={picture}
                        alt=""
                        className="h-12 w-12 rounded-xl border border-blue-200 object-cover shadow-sm shrink-0"
                    />
                ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                        {portfolio?.title?.charAt(0) || 'H'}
                    </div>
                )}
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-2 w-20 rounded-md bg-slate-900" />
                    <div className="h-1.5 w-28 rounded bg-slate-400" />
                </div>
            </div>
            <div className="flex gap-1.5">
                <div className="h-1.5 w-8 rounded bg-blue-100" />
                <div className="h-1.5 w-8 rounded bg-slate-100" />
            </div>
        </div>
    )
}

export default function Portfolio() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user, isLoaded } = useUser()
    const { getToken } = useAuth()
    const { portfolio: raw, loading, refetch } = usePortfolio()

    const [searchTerm, setSearchTerm] = useState('')
    const [previewPortfolio, setPreviewPortfolio] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    const [portfolioToDelete, setPortfolioToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [toast, setToast] = useState(null)

    const gridRef = useRef(null)
    const toastTimeoutRef = useRef(null)

    const showToast = (message, type = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        setToast({ id: Date.now(), message, type })
        toastTimeoutRef.current = setTimeout(() => {
            setToast(null)
        }, 3500)
    }

    useEffect(() => {
        if (!portfolioToDelete) return
        const onKey = (e) => {
            if (e.key === 'Escape' && !isDeleting) {
                setPortfolioToDelete(null)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [portfolioToDelete, isDeleting])

    const userName = resolveDisplayName(user, 'User')
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'No email'
    const firstName = user?.firstName || userName.split(' ')[0]
    const greetingText = `${timeGreeting()}, ${firstName}`

    const activeTemplate = (searchParams.get('template') || 'all').toLowerCase()

    const heroList = useMemo(() => resolvePortfolioList(raw, user?.id), [raw, user])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('[data-menu-container]')) {
                setOpenMenuId(null)
            }
        }
        window.addEventListener('click', handleClickOutside)
        return () => window.removeEventListener('click', handleClickOutside)
    }, [])

    useEffect(() => {
        if (previewPortfolio) {
            const prevBodyOverflow = document.body.style.overflow
            const prevHtmlOverflow = document.documentElement.style.overflow
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'

            const onKey = (e) => {
                if (e.key === 'Escape') {
                    setPreviewPortfolio(null)
                }
            }
            window.addEventListener('keydown', onKey)

            return () => {
                window.removeEventListener('keydown', onKey)
                document.body.style.overflow = prevBodyOverflow
                document.documentElement.style.overflow = prevHtmlOverflow
            }
        }
    }, [previewPortfolio])

    const filteredList = useMemo(() => {
        let list = [...heroList]
        const q = searchTerm.trim().toLowerCase()

        if (q) {
            list = list.filter((p) => {
                const title = (p.title || p.profile?.fullName || 'Untitled Portfolio')
                    .trim()
                    .replace(/^[\s"'‘“#@!&*~`]+/, '')
                    .toLowerCase()
                return title.startsWith(q)
            })
        }

        if (activeTemplate !== 'all') {
            list = list.filter((p) => {
                const tpl = String(p.templateId || p.template || 'modern').toLowerCase()
                return tpl === activeTemplate
            })
        }

        return list
    }, [heroList, searchTerm, activeTemplate])

    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const totalItems = filteredList.length
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const currentPage = Math.min(Math.max(1, pageParam), totalPages)

    const setPage = (p) => {
        const next = new URLSearchParams(searchParams)
        if (p <= 1) {
            next.delete('page')
        } else {
            next.set('page', String(p))
        }
        setSearchParams(next)
        gridRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSearchChange = (val) => {
        setSearchTerm(val)
        if (currentPage > 1) {
            const next = new URLSearchParams(searchParams)
            next.delete('page')
            setSearchParams(next)
        }
    }

    const handleTemplateChange = (tplId) => {
        const next = new URLSearchParams(searchParams)
        if (tplId === 'all') {
            next.delete('template')
        } else {
            next.set('template', tplId)
        }
        next.delete('page')
        setSearchParams(next)
    }

    const pagedList = useMemo(() => {
        return filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    }, [filteredList, currentPage])

    const confirmDelete = async () => {
        if (!portfolioToDelete?.id) return
        setIsDeleting(true)
        try {
            const token = await getToken()
            const res = await fetch(apiUrl(`/api/portfolio/${portfolioToDelete.id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (res.ok) {
                showToast('Portfolio deleted successfully.', 'success')
                const deletedId = portfolioToDelete.id
                setPortfolioToDelete(null)
                if (previewPortfolio?.id === deletedId) {
                    setPreviewPortfolio(null)
                }
                refetch?.()
            } else {
                showToast('Failed to delete portfolio. Please try again.', 'error')
            }
        } catch {
            showToast('Delete failed. Please check your network connection.', 'error')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCopyCardLink = async (p) => {
        const slug = p.slug || p.public_id || p.id || ''
        if (!slug) return
        const url = `${window.location.origin}/p/${slug}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(p.id || 'copied')
            setTimeout(() => setCopiedId(null), 2000)
            showToast('Portfolio link copied to clipboard!', 'success')
        } catch {
            try {
                const ta = document.createElement('textarea')
                ta.value = url
                ta.style.position = 'fixed'
                ta.style.opacity = '0'
                document.body.appendChild(ta)
                ta.focus()
                ta.select()
                document.execCommand('copy')
                document.body.removeChild(ta)
                setCopiedId(p.id || 'copied')
                setTimeout(() => setCopiedId(null), 2000)
                showToast('Portfolio link copied to clipboard!', 'success')
            } catch {
                showToast('Could not copy link to clipboard.', 'error')
            }
        }
    }

    const getPageNumbers = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }
        if (currentPage <= 3) {
            return [1, 2, 3, 4, '...', totalPages]
        }
        if (currentPage >= totalPages - 2) {
            return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
    }

    if (!isLoaded || loading) {
        return (
            <DashboardLayout userName={userName} email={email} title={greetingText}>
                <div className="py-6 space-y-6">
                    <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            userName={userName}
            email={email}
            title={greetingText}
        >
            <div ref={gridRef} className="space-y-6 pb-16">
                <div className="pt-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        My Portfolios
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                        Manage, edit, and preview everything you've built.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                    <div className="relative flex-1 min-w-0">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search by portfolio title..."
                            className="min-h-[44px] w-full rounded-xl bg-slate-50 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => handleSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 overflow-x-auto max-w-full">
                        {TEMPLATE_TABS.map((tab) => {
                            const isActive = activeTemplate === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTemplateChange(tab.id)}
                                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {tab.dot && <span className={`h-2 w-2 rounded-full ${tab.dot} shrink-0`} aria-hidden="true" />}
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {heroList.length === 0 ? (
                    <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 mx-auto mb-4">
                            <Sparkles size={28} aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">You haven't created a portfolio yet</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Pick from our modern templates, add your best work, and build a standout portfolio in minutes.
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/portfolio/create')}
                            className="min-h-[44px] mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 text-xs sm:text-sm shadow-sm active:scale-95 transition cursor-pointer"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span>Create your first portfolio</span>
                        </button>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 mx-auto mb-3">
                            <Search className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">No portfolios match your search</h4>
                        <p className="mt-1 text-xs text-slate-500">
                            Try adjusting your search query or template filter.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('')
                                handleTemplateChange('all')
                            }}
                            className="min-h-[40px] mt-4 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pagedList.map((p) => {
                            const templateKey = String(p.templateId || p.template || 'modern').toLowerCase()
                            const templateCfg = TEMPLATE_CONFIG[templateKey] || TEMPLATE_CONFIG.modern
                            const editUrl = p.id
                                ? `/portfolio/create?id=${p.id}&template=${p.templateId || p.template || 'simple'}`
                                : p.templateId || p.template
                                    ? `/portfolio/create?template=${p.templateId || p.template}`
                                    : '/portfolio/create'
                            const slug = p.slug || p.public_id || p.id || ''
                            const shareUrl = typeof window !== 'undefined' && slug ? `${window.location.origin}/p/${slug}` : ''
                            const viewsCount = Number(p.views || 0)

                            return (
                                <article
                                    key={p.id || p.title}
                                    className="rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden"
                                >
                                    <div className="relative aspect-[16/9] max-h-40 w-full overflow-hidden border-b border-slate-100 bg-slate-50">
                                        <PortfolioThumbnail portfolio={p} />

                                        <div className="absolute top-2.5 left-2.5 z-10">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border shadow-2xs ${templateCfg.badge}`}
                                            >
                                                {templateCfg.label}
                                            </span>
                                        </div>

                                        <div className="absolute top-2.5 right-2.5 z-10" data-menu-container>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setOpenMenuId(openMenuId === p.id ? null : p.id)
                                                }}
                                                className="grid h-7 w-7 place-items-center rounded-full bg-white/95 backdrop-blur-xs text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200 shadow-xs transition cursor-pointer active:scale-95"
                                                title="More actions"
                                                aria-label="More actions"
                                            >
                                                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                                            </button>

                                            {openMenuId === p.id && (
                                                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 text-xs font-semibold z-30 space-y-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleCopyCardLink(p)
                                                            setOpenMenuId(null)
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
                                                    >
                                                        {copiedId === p.id ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                                        )}
                                                        <span>{copiedId === p.id ? 'Copied!' : 'Copy link'}</span>
                                                    </button>

                                                    {shareUrl && (
                                                        <a
                                                            href={shareUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setOpenMenuId(null)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition text-left"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                                            <span>Open live page</span>
                                                        </a>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPortfolioToDelete(p)
                                                            setOpenMenuId(null)
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer text-left"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="truncate text-sm font-semibold text-slate-900 leading-snug">
                                                {p.title || 'Untitled Portfolio'}
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {p.summary || 'A customized portfolio showcasing projects and career milestones.'}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>{viewsCount} {viewsCount === 1 ? 'view' : 'views'}</span>
                                            </span>
                                            <span>·</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>{relativeTime(p.updatedAt || p.createdAt)}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-3 pt-0 border-t border-slate-100 flex items-center gap-2 mt-auto">
                                        <button
                                            type="button"
                                            onClick={() => navigate(editUrl)}
                                            className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition cursor-pointer"
                                        >
                                            <PenLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewPortfolio(p)}
                                            className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold active:scale-95 transition cursor-pointer shadow-2xs"
                                        >
                                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                                            <span>Preview</span>
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}

                {totalItems > PAGE_SIZE && (
                    <div className="mt-8 flex flex-col items-center gap-3 pt-6 border-t border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                                <span className="hidden sm:inline">Prev</span>
                            </button>

                            <span className="sm:hidden text-xs font-semibold text-slate-700 px-3">
                                Page {currentPage} of {totalPages}
                            </span>

                            <div className="hidden sm:flex items-center gap-1">
                                {getPageNumbers().map((num, i) =>
                                    num === '...' ? (
                                        <span key={`ellipsis-${i}`} className="px-2 text-slate-400 font-bold">
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={`page-${num}`}
                                            type="button"
                                            onClick={() => setPage(num)}
                                            className={`min-h-[40px] min-w-[40px] rounded-xl text-xs font-bold transition cursor-pointer ${
                                                currentPage === num
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setPage(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                aria-label="Next page"
                            >
                                <span className="hidden sm:inline">Next</span>
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400">
                            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} portfolios
                        </p>
                    </div>
                )}
            </div>

            {previewPortfolio &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Portfolio live preview"
                        className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden overscroll-contain bg-white focus:outline-none touch-pan-y"
                    >
                        <div className="w-full min-h-[100dvh] bg-white focus:outline-none">
                            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] shadow-xs">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <h4 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate">
                                        {previewPortfolio.title || 'Portfolio Preview'}
                                    </h4>
                                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                        {titleCase(previewPortfolio.templateId || previewPortfolio.template || 'modern')} Template
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setPreviewPortfolio(null)}
                                    title="Close preview (Esc)"
                                    aria-label="Close preview (Esc)"
                                    className="relative inline-flex items-center justify-center leading-none h-10 w-10 p-0 rounded-full shrink-0 bg-slate-900 text-white hover:bg-slate-700 shadow-sm transition active:scale-95 cursor-pointer before:absolute before:-inset-1 before:content-[''] sm:h-11 sm:w-auto sm:px-4 sm:gap-2 text-xs sm:text-sm font-semibold"
                                >
                                    <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    <span className="hidden sm:inline">Close</span>
                                </button>
                            </div>

                            <div className="w-full">
                                <PortfolioSite
                                    portfolio={previewPortfolio}
                                    template={previewPortfolio.templateId || previewPortfolio.template || 'modern'}
                                    idPrefix="preview-modal"
                                    stickyNav={false}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {portfolioToDelete &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-dialog-title"
                        onClick={() => !isDeleting && setPortfolioToDelete(null)}
                    >
                        <div
                            className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200/90 animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
                                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 id="delete-dialog-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                                        Delete Portfolio?
                                    </h3>
                                    <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                                        Are you sure you want to delete <span className="font-semibold text-slate-800">“{portfolioToDelete.title || 'Untitled Portfolio'}”</span>? This action is permanent and cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setPortfolioToDelete(null)}
                                    disabled={isDeleting}
                                    className="h-11 sm:h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px] sm:min-h-0"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="h-11 sm:h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-60 cursor-pointer min-h-[44px] sm:min-h-0"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            <span>Delete Portfolio</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {toast &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        aria-live="polite"
                        className="fixed bottom-5 right-5 z-[130] flex max-w-sm items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-300 sm:bottom-6 sm:right-6"
                    >
                        <div className="shrink-0">
                            {toast.type === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                            )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-100 flex-1">
                            {toast.message}
                        </p>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                            aria-label="Dismiss toast"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>,
                    document.body
                )}
        </DashboardLayout>
    )
}

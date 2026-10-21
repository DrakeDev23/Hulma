import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import PortfolioSite from './PortfolioSite'

const SAMPLE_PORTFOLIO = {
  title: 'Drake Delos Reyes — Full Stack Developer & Designer',
  summary:
    'Passionate Full Stack Developer with 4+ years of experience designing scalable web applications and engaging digital experiences. I turn complex problems into elegant, human-centered products.',
  sections: {
    profile: {
      fullName: 'Drake Delos Reyes',
      email: 'drake.delosreyes@example.com',
      contactNumber: '+1 (555) 234-5678',
      address: 'San Francisco, CA',
      aboutMe:
        'Passionate Full Stack Developer with 4+ years of experience designing scalable web applications and engaging digital experiences. I specialize in modern JavaScript/TypeScript, React, Python, and cloud architectures, turning complex requirements into clean, user-friendly solutions.',
    },
    skills: [
      'React',
      'TypeScript',
      'Node.js',
      'Python',
      'FastAPI',
      'PostgreSQL',
      'Tailwind CSS',
      'UI/UX Design',
      'Docker',
      'GraphQL',
    ],
    education: [
      'B.S. in Computer Science — University of California, Berkeley (2018 - 2022)',
      'Full Stack Web Development Certification — Meta (2023)',
    ],
    workExperience: [
      'Senior Frontend Engineer at CloudScale Tech (2023 - Present) — Spearheaded the frontend architecture for cloud analytics dashboard serving 100k+ active users.',
      'Full Stack Developer at StudioNova (2021 - 2023) — Built responsive client portals and interactive portfolio platforms with modern web standards.',
      'Junior Web Developer at Apex Labs (2020 - 2021) — Designed reusable UI components and collaborated with product teams to ship client projects.',
    ],
    socialLinks: {
      GitHub: 'https://github.com',
      LinkedIn: 'https://linkedin.com',
      Twitter: 'https://twitter.com',
      Portfolio: 'https://hulma.app',
    },
  },
  projects: [
    {
      name: 'DevFlow Workflow Tool',
      description:
        'AI-assisted developer productivity dashboard with real-time analytics, automated summaries, and intuitive kanban task tracking.',
      link: 'https://github.com',
      tech: ['React', 'FastAPI', 'Tailwind'],
    },
    {
      name: 'Nova Design System',
      description:
        'Comprehensive component library and design token system built for high-performance cross-platform applications.',
      link: 'https://github.com',
      tech: ['TypeScript', 'Storybook', 'Figma'],
    },
    {
      name: 'Pulse Health Metrics',
      description:
        'Interactive telemetry and wellness monitoring platform featuring live vitals charts, anomaly alerts, and exportable reports.',
      link: 'https://github.com',
      tech: ['Node.js', 'PostgreSQL', 'Charts'],
    },
  ],
}

function SimplePreview() {
  return (
    <div className="h-full rounded-xl bg-[#fdfcf9] border border-stone-200 p-2.5 shadow-2xs font-serif flex flex-col justify-between select-none">
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-1.5">
        <div className="h-1.5 w-12 rounded-xs bg-stone-800" />
        <div className="flex gap-1.5">
          <div className="h-1 w-3 rounded-xs bg-stone-400" />
          <div className="h-1 w-3 rounded-xs bg-stone-400" />
          <div className="h-1 w-3 rounded-xs bg-stone-400" />
        </div>
      </div>
      <div className="my-auto w-full space-y-1.5 py-1">
        <div className="h-2 w-24 rounded-xs bg-stone-900" />
        <div className="h-1.5 w-32 rounded-xs bg-stone-500 italic" />
        <div className="space-y-1 pt-0.5">
          <div className="h-1 w-full rounded-xs bg-stone-300" />
          <div className="h-1 w-4/5 rounded-xs bg-stone-300" />
        </div>
        <div className="h-px bg-stone-200 my-1.5" />
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="h-1.5 w-16 rounded-xs bg-stone-800" />
            <div className="h-1 w-5 rounded-xs bg-stone-400" />
          </div>
          <div className="h-1 w-3/4 rounded-xs bg-stone-300" />
        </div>
      </div>
      <div className="border-t border-stone-200/80 pt-1 text-center">
        <div className="h-1 w-12 rounded-xs bg-stone-300 mx-auto" />
      </div>
    </div>
  )
}

function ModernPreview() {
  return (
    <div className="h-full rounded-xl bg-[#f8fafc] border border-slate-200 p-2.5 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-1.5 py-1 rounded-md">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-md bg-blue-600" />
          <div className="h-1.5 w-8 rounded bg-slate-700" />
        </div>
        <div className="flex gap-1">
          <div className="h-1 w-3 rounded bg-slate-400" />
          <div className="h-1 w-3 rounded bg-slate-400" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 my-1.5 items-center">
        <div className="col-span-3 space-y-1">
          <div className="h-1 w-10 rounded-full bg-blue-100" />
          <div className="h-2 w-20 rounded bg-slate-900" />
          <div className="h-1 w-16 rounded bg-slate-400" />
        </div>
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
          <div className="aspect-square w-full rounded-md bg-gradient-to-tr from-blue-500 to-indigo-600" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        <div className="rounded-md border border-slate-200 bg-white p-1 shadow-2xs">
          <div className="h-3 w-full rounded bg-blue-50 border border-blue-100" />
          <div className="mt-1 h-1 w-10 rounded bg-slate-800" />
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-1 shadow-2xs">
          <div className="h-3 w-full rounded bg-blue-50 border border-blue-100" />
          <div className="mt-1 h-1 w-10 rounded bg-slate-800" />
        </div>
      </div>
    </div>
  )
}

function CreativePreview() {
  return (
    <div className="relative h-full overflow-hidden rounded-xl bg-[#08070e] border border-white/10 p-2.5 flex flex-col justify-between select-none">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-purple-600/30 blur-md" />
      <div className="absolute -left-6 bottom-2 h-14 w-14 rounded-full bg-pink-600/25 blur-md" />
      <div className="relative z-10 mx-auto w-max rounded-full border border-white/20 bg-white/10 px-2 py-0.5 flex gap-1">
        <div className="h-1 w-2.5 rounded-full bg-pink-400" />
        <div className="h-1 w-2.5 rounded-full bg-white/60" />
        <div className="h-1 w-2.5 rounded-full bg-white/60" />
      </div>
      <div className="relative z-10 my-1 space-y-1">
        <div className="h-1 w-12 rounded-full bg-orange-400/80 -rotate-2" />
        <div className="text-2xl font-black leading-none tracking-tighter text-white">
          DR
        </div>
        <div className="h-1 w-20 rounded bg-white/60" />
      </div>
      <div className="relative z-10 -mx-2.5 border-y border-white/15 bg-white/5 py-0.5 px-2 flex justify-between">
        <div className="h-1 w-6 rounded-full bg-pink-400" />
        <div className="h-1 w-6 rounded-full bg-purple-400" />
        <div className="h-1 w-6 rounded-full bg-orange-400" />
      </div>
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 py-1">
        <div>
          <div className="text-xs font-black text-stroke-outline leading-none">01</div>
          <div className="h-1 w-10 rounded bg-white/80 mt-0.5" />
        </div>
        <div className="h-3 w-3 rounded-full border border-pink-500 bg-pink-500/20" />
      </div>
    </div>
  )
}

const TEMPLATES = [
  {
    id: 'simple',
    num: 'Template 1',
    name: 'Simple',
    tagline: 'Clean and professional design.',
    description:
      'A refined layout emphasizing typography, generous whitespace, and classic editorial aesthetics.',
    Preview: SimplePreview,
  },
  {
    id: 'modern',
    num: 'Template 2',
    name: 'Modern',
    tagline: 'Modern layout with cards & sections.',
    description:
      'Dynamic card-based layout featuring tech badges, stat counters, and structured project cards.',
    Preview: ModernPreview,
  },
  {
    id: 'creative',
    num: 'Template 3',
    name: 'Creative',
    tagline: 'Bold, expressive & standout layout.',
    description:
      'Bold, high-contrast dark theme with ambient gradient glows designed for creative impact.',
    Preview: CreativePreview,
  },
]

const CAROUSEL_CARDS = [
  { ...TEMPLATES[0], key: 'simple-1' },
  { ...TEMPLATES[1], key: 'modern-1' },
  { ...TEMPLATES[2], key: 'creative-1' },
  { ...TEMPLATES[0], key: 'simple-2' },
  { ...TEMPLATES[1], key: 'modern-2' },
  { ...TEMPLATES[2], key: 'creative-2' },
]

const CAROUSEL_COUNT = CAROUSEL_CARDS.length
const CARD_WIDTH = 260
const CAROUSEL_RADIUS =
  Math.round(CARD_WIDTH / 2 / Math.tan(Math.PI / CAROUSEL_COUNT)) + 25 

function useIsMobile() {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia('(max-width: 767px)')
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false
  )
}

export default function TemplatesSection() {
  const isMobile = useIsMobile()
  const [isHovered, setIsHovered] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [modalTemplate, setModalTemplate] = useState('modern')
  const [isMounted, setIsMounted] = useState(false)
  const [showExitHint, setShowExitHint] = useState(false)

  const sectionRef = useRef(null)
  const ringRef = useRef(null)
  const overlayRef = useRef(null)
  const modalPanelRef = useRef(null)
  const triggerCardRef = useRef(null)
  const mobileContainerRef = useRef(null)
  const mobileSlideRefs = useRef([])
  const hintTimeoutRef = useRef(null)

  const rotationRef = useRef(0)
  const targetRotationRef = useRef(0)
  const isPausedRef = useRef(false)
  const activeIndexRef = useRef(0)
  const hasTriggeredIntro = useRef(false)

  useEffect(() => {
    isPausedRef.current = isHovered || previewModalOpen
  }, [isHovered, previewModalOpen])

  useEffect(() => {
    if (isMobile) return undefined

    let animationFrameId
    let lastTime = performance.now()

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let prefersReduced = mediaQuery.matches

    const handleMediaChange = (e) => {
      prefersReduced = e.matches
      if (prefersReduced) {
        targetRotationRef.current = Math.round(targetRotationRef.current / 60) * 60
        rotationRef.current = targetRotationRef.current
        if (ringRef.current) {
          ringRef.current.style.transform = `rotateY(${rotationRef.current}deg)`
        }
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    const animate = (currentTime) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime

      if (!isPausedRef.current && !prefersReduced) {
        targetRotationRef.current -= (360 / 26) * deltaTime
      }

      if (prefersReduced) {
        rotationRef.current = targetRotationRef.current
      } else {
        const diff = targetRotationRef.current - rotationRef.current
        rotationRef.current += diff * Math.min(1, deltaTime * 8)
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `rotateY(${rotationRef.current}deg)`
      }

      const norm = (((-rotationRef.current % 360) + 360) % 360)
      const active = Math.round(norm / (360 / CAROUSEL_COUNT)) % CAROUSEL_COUNT
      if (active !== activeIndexRef.current) {
        activeIndexRef.current = active
        setActiveIndex(active)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return undefined
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!hasTriggeredIntro.current) {
              hasTriggeredIntro.current = true
              const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
              if (!prefersReduced) {
                targetRotationRef.current -= 360
              }
            }
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isMobile])

  const handleMobileScroll = (e) => {
    const container = e.currentTarget
    const containerCenter = container.scrollLeft + container.offsetWidth / 2
    let closestIdx = 0
    let minDistance = Infinity

    mobileSlideRefs.current.forEach((el, idx) => {
      if (!el) return
      const elCenter = el.offsetLeft + el.offsetWidth / 2
      const dist = Math.abs(containerCenter - elCenter)
      if (dist < minDistance) {
        minDistance = dist
        closestIdx = idx
      }
    })

    if (closestIdx !== mobileActiveIndex) {
      setMobileActiveIndex(closestIdx)
    }
  }

  const scrollToMobileSlide = (idx) => {
    const target = mobileSlideRefs.current[idx]
    if (!target) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    })
    setMobileActiveIndex(idx)
  }

  const closeFullPreview = () => {
    setPreviewModalOpen(false)
    setIsMounted(false)
    setShowExitHint(false)
    setIsHovered(false)
    isPausedRef.current = false
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
  }

  const openFullPreview = (tplId, triggerEl) => {
    triggerCardRef.current = triggerEl || document.activeElement
    setModalTemplate(tplId || 'modern')
    setPreviewModalOpen(true)
    setShowExitHint(true)
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    hintTimeoutRef.current = setTimeout(() => {
      setShowExitHint(false)
    }, 3000)
  }

  const rotateCarousel = (direction) => {
    const delta = direction === 'prev' || direction === 'left' ? 60 : -60
    targetRotationRef.current += delta
  }

  const handleScrollModal = useCallback((direction) => {
    if (!overlayRef.current) return
    const scrollAmount = direction === 'down' ? 400 : -400
    overlayRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (previewModalOpen) {
      const prevBodyOverflow = document.body.style.overflow
      const prevHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      const animId = requestAnimationFrame(() => {
        setIsMounted(true)
      })

      overlayRef.current?.focus()

      return () => {
        cancelAnimationFrame(animId)
        document.body.style.overflow = prevBodyOverflow
        document.documentElement.style.overflow = prevHtmlOverflow
        setIsHovered(false)
        isPausedRef.current = false
        triggerCardRef.current?.blur?.()
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [previewModalOpen])

  useEffect(() => {
    if (previewModalOpen && overlayRef.current) {
      overlayRef.current.scrollTop = 0
    }
  }, [previewModalOpen])

  useEffect(() => {
    if (!previewModalOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeFullPreview()
      } else if (e.key === 'Tab') {
        if (!modalPanelRef.current) return
        const focusable = modalPanelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      } else if (e.key === 'ArrowDown') {
        handleScrollModal('down')
      } else if (e.key === 'ArrowUp') {
        handleScrollModal('up')
      } else if (e.key === 'PageDown') {
        handleScrollModal('down')
      } else if (e.key === 'PageUp') {
        handleScrollModal('up')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [previewModalOpen, handleScrollModal])

  const previewTemplateConfig = TEMPLATES.find((t) => t.id === modalTemplate) || TEMPLATES[1]

  return (
    <section
      id="templates"
      ref={sectionRef}
      className="bg-gradient-to-b from-[#f3f8ff] via-white to-[#f3f8ff] py-8 sm:py-16 lg:py-20 scroll-mt-20 border-t border-slate-200/60 overflow-x-clip"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span>3D Template Showcase</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Designed to impress.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Ready in seconds.
            </span>
          </h2>

          <p className="mt-2.5 sm:mt-3.5 text-slate-600 text-xs sm:text-base lg:text-lg leading-relaxed">
            <span className="sm:hidden">Swipe to browse templates and tap to preview.</span>
            <span className="hidden sm:inline">
              Explore our templates revolving in 3D. Hover on any template to stop rotation, and click
              to launch the live preview.
            </span>
          </p>
        </div>

        {isMobile ? (
          <div className="relative w-full my-6 select-none">
            {mobileActiveIndex > 0 && (
              <button
                type="button"
                onClick={() => scrollToMobileSlide(mobileActiveIndex - 1)}
                aria-label="Previous template"
                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 grid min-h-[44px] min-w-[44px] h-11 w-11 place-items-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md active:scale-95 transition cursor-pointer backdrop-blur-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div
              ref={mobileContainerRef}
              onScroll={handleMobileScroll}
              className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-[10vw] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x touch-pan-y overscroll-x-contain"
              style={{
                touchAction: 'pan-x pan-y',
                overscrollBehaviorX: 'contain',
              }}
            >
              {TEMPLATES.map((tpl, idx) => {
                const PreviewComponent = tpl.Preview
                const isSlideActive = mobileActiveIndex === idx

                return (
                  <div
                    key={tpl.id}
                    ref={(el) => {
                      mobileSlideRefs.current[idx] = el
                    }}
                    className="snap-center shrink-0 w-[80vw] max-w-[300px] h-[360px] flex items-center justify-center"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Preview ${tpl.name} template`}
                      onClick={(e) => openFullPreview(tpl.id, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openFullPreview(tpl.id, e.currentTarget)
                        }
                      }}
                      className={`w-full h-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${
                        isSlideActive
                          ? 'scale-100 shadow-2xl border-blue-400'
                          : 'scale-95 shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 pointer-events-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                          <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                        </div>
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                          {tpl.name} • {tpl.num}
                        </span>
                      </div>

                      <div className="my-1.5 flex-1 overflow-hidden rounded-lg pointer-events-none">
                        <PreviewComponent />
                      </div>

                      <div className="pt-2 border-t border-slate-100 pointer-events-none">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {tpl.name} Template
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                          {tpl.tagline}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {mobileActiveIndex < TEMPLATES.length - 1 && (
              <button
                type="button"
                onClick={() => scrollToMobileSlide(mobileActiveIndex + 1)}
                aria-label="Next template"
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 grid min-h-[44px] min-w-[44px] h-11 w-11 place-items-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md active:scale-95 transition cursor-pointer backdrop-blur-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center justify-center gap-2 mt-2">
              {TEMPLATES.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => scrollToMobileSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${tpl.name}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    mobileActiveIndex === idx
                      ? 'w-6 bg-blue-600'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative mx-auto my-6 sm:my-10 flex flex-col items-center justify-center py-6 sm:py-8 select-none">
            <div className="relative w-full max-w-4xl mx-auto flex items-center justify-center">
              <button
                type="button"
                onClick={() => rotateCarousel('prev')}
                title="Rotate Left"
                aria-label="Rotate Left"
                className="absolute left-2 sm:left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 z-30 grid min-h-[44px] min-w-[44px] h-11 w-11 place-items-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-lg hover:bg-white hover:text-blue-600 hover:scale-110 active:scale-95 transition cursor-pointer backdrop-blur-md"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div
                className="relative h-[380px] sm:h-[420px] w-full flex items-center justify-center"
                style={{ perspective: '1000px' }}
              >
                <div
                  ref={ringRef}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onPointerDown={() => setIsHovered(true)}
                  onPointerUp={() => setIsHovered(false)}
                  onPointerCancel={() => setIsHovered(false)}
                  className="relative shrink-0 [transform-style:preserve-3d]"
                  style={{
                    width: `${CARD_WIDTH}px`,
                    height: '360px',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {CAROUSEL_CARDS.map((card, idx) => {
                    const PreviewComponent = card.Preview
                    const angle = idx * (360 / CAROUSEL_COUNT)
                    const isActive = activeIndex === idx

                    const diffFromFront = Math.min(
                      Math.abs(idx - activeIndex),
                      CAROUSEL_COUNT - Math.abs(idx - activeIndex)
                    )
                    const isFrontFacing = diffFromFront <= 1

                    return (
                      <div
                        key={card.key}
                        className={`absolute top-0 left-0 shrink-0 [backface-visibility:hidden] will-change-transform ${
                          isFrontFacing ? 'pointer-events-auto' : 'pointer-events-none'
                        }`}
                        style={{
                          width: `${CARD_WIDTH}px`,
                          height: '360px',
                          transform: `rotateY(${angle}deg) translateZ(${CAROUSEL_RADIUS}px)`,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={isFrontFacing ? 0 : -1}
                          aria-label={`Preview ${card.name} template`}
                          onClick={(e) => openFullPreview(card.id, e.currentTarget)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openFullPreview(card.id, e.currentTarget)
                            }
                          }}
                          onMouseEnter={() => setIsHovered(true)}
                          onMouseLeave={() => setIsHovered(false)}
                          onPointerDown={() => setIsHovered(true)}
                          onPointerUp={() => setIsHovered(false)}
                          onPointerCancel={() => setIsHovered(false)}
                          className="relative w-full h-full rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl transition-shadow duration-300 hover:shadow-2xl hover:border-blue-500/80 cursor-pointer flex flex-col justify-between select-none [backface-visibility:hidden]"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 pointer-events-none">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                            </div>
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                              {card.name} • {card.num}
                            </span>
                          </div>

                          <div className="my-1.5 flex-1 overflow-hidden rounded-lg pointer-events-none">
                            <PreviewComponent />
                          </div>

                          <div className="pt-2 border-t border-slate-100 pointer-events-none">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {card.name} Template
                            </h4>
                            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                              {card.tagline}
                            </p>
                          </div>

                          <div
                            className={`pointer-events-none absolute inset-0 rounded-2xl bg-slate-900 transition-opacity duration-300 ${
                              isActive ? 'opacity-0' : 'opacity-10'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => rotateCarousel('next')}
                title="Rotate Right"
                aria-label="Rotate Right"
                className="absolute right-2 sm:right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-30 grid min-h-[44px] min-w-[44px] h-11 w-11 place-items-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-lg hover:bg-white hover:text-blue-600 hover:scale-110 active:scale-95 transition cursor-pointer backdrop-blur-md"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-5 sm:p-10 text-white shadow-xl shadow-blue-700/20 mt-8 sm:mt-12">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 -top-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            <div className="max-w-xl text-center md:text-left">
              <span className="inline-block bg-white/15 text-white backdrop-blur-xs text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider mb-2 sm:mb-3">
                Quick Setup • AI-Powered
              </span>
              <h3 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-snug">
                Ready to build a portfolio that stands out?
              </h3>
              <p className="mt-1.5 sm:mt-2 text-blue-100 text-xs sm:text-sm md:text-base leading-relaxed">
                Choose from these sample templates, add your work, and get instant AI feedback to
                polish your storytelling.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 sm:px-7 sm:py-4 text-xs sm:text-base font-bold text-blue-700 shadow-lg shadow-black/10 transition-all duration-200 hover:bg-blue-50 hover:scale-105 active:scale-95"
              >
                <span>Try the templates now</span>
                <ArrowRight className="w-4 h-4 text-blue-700" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {previewModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={overlayRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Template live preview"
            className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden overscroll-contain bg-white focus:outline-none touch-pan-y"
          >
          <div
            ref={modalPanelRef}
            tabIndex={-1}
            className={`w-full min-h-[100dvh] bg-white focus:outline-none transition-opacity duration-200 ease-out ${
              isMounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate">
                  {previewTemplateConfig?.name}
                </h4>
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {previewTemplateConfig?.num}
                </span>
              </div>

              <button
                type="button"
                onClick={closeFullPreview}
                title="Close preview (Esc)"
                aria-label="Close preview (Esc)"
                className="relative inline-flex items-center justify-center leading-none h-10 w-10 p-0 rounded-full shrink-0 bg-slate-900 text-white hover:bg-slate-700 shadow-sm transition active:scale-95 cursor-pointer before:absolute before:-inset-1 before:content-[''] sm:h-11 sm:w-auto sm:px-4 sm:gap-2 text-xs sm:text-sm font-semibold"
              >
                <X className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Close</span>
              </button>

              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 rounded-full bg-slate-900 text-white text-xs px-4 py-2 shadow-lg whitespace-nowrap transition-opacity duration-300 z-30 ${
                  showExitHint ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Press Esc or tap Close to exit preview.
              </div>
            </div>

            <div className="w-full">
              <PortfolioSite
                portfolio={SAMPLE_PORTFOLIO}
                template={modalTemplate}
                idPrefix="tpl-preview"
                stickyNav={false}
              />
            </div>
          </div>
          </div>,
          document.body
        )}
    </section>
  )
}

import { useEffect, useRef } from 'react'

const steps = [
  {
    number: '01',
    text: 'Enter your details, skills, projects, education, and experience. Hulma uses your information to build the foundation of your portfolio.',
  },
  {
    number: '02',
    text: 'Let Hulma’s AI organize your content and create a polished portfolio structure based on the information you provide.',
  },
  {
    number: '03',
    text: 'Pick a template that fits your style. Your content will be arranged automatically so you can preview your portfolio instantly.',
  },
  {
    number: '04',
    text: 'Edit your text, colors, fonts, images, and sections to make the portfolio your own.',
  },
  {
    number: '05',
    text: 'Use AI Review to get suggestions for improving your portfolio’s content, structure, and presentation.',
  },
  {
    number: '06',
    text: 'Once you’re satisfied, finalize your portfolio and share it with others.',
  },
]

export default function Help() {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="help" className="bg-[#edf6ff] scroll-mt-24">
      <div ref={ref} className="reveal-on-scroll max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="mb-8 sm:mb-12 md:mb-16">
          <p
            data-delay="80"
            className="stagger-reveal text-blue-600 font-bold text-xs sm:text-sm tracking-wider uppercase mb-3"
          >
            HOW IT WORKS
          </p>

          <h2
            data-delay="150"
            className="stagger-reveal text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3 sm:mb-4"
          >
            How to create your portfolio with Hulma
          </h2>

          <p
            data-delay="220"
            className="stagger-reveal text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-4xl"
          >
            Create a professional portfolio without starting from scratch. Add your
            information, projects, skills, and experience, then let Hulma’s AI help
            turn your content into a polished portfolio. Choose a template that fits
            your style, customize it as much as you want, and get your portfolio ready
            to share.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute left-0 right-0 top-[1.45rem] h-0.5 bg-blue-300/90" />
          <div className="grid gap-4 sm:gap-5 lg:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                data-delay={200 + index * 110}
                className="stagger-reveal group relative flex flex-col bg-white/70 sm:bg-white/80 lg:bg-transparent rounded-2xl p-4 sm:p-5 lg:p-0 border border-blue-100/60 lg:border-none shadow-xs sm:shadow-sm lg:shadow-none transition-transform duration-300 ease-out hover:-translate-y-1"
              >
                <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 rounded-full border-4 border-blue-600 bg-white shadow-sm z-10 text-sm font-bold text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:bg-blue-50">
                  {step.number}
                </div>

                <div className="flex items-start lg:block lg:text-center">
                  <div className="lg:hidden mr-3 sm:mr-3.5 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border-4 border-blue-600 bg-white shadow-sm z-10 text-xs sm:text-sm font-bold text-blue-600 transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-50">
                    {step.number}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed lg:leading-snug lg:mt-14 transition-colors duration-300 group-hover:text-slate-900">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
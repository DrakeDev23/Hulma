import { useEffect, useRef } from 'react'

const workflowSteps = [
  {
    id: '01',
    title: 'Choose a template',
    subtitle: 'Choose a decision that fits to you',
    body:
      'Browse clean layouts designed for clarity, then pick the one that best matches your role, tone, and visual style.',
  },
  {
    id: '02',
    title: 'Build your portfolio',
    subtitle: 'Add your work and skills',
    body:
      'Add projects, experience, and skills in a structured flow that keeps your story organized and easy to scan.',
  },
  {
    id: '03',
    title: 'Get AI feedback',
    subtitle: 'Receive suggestions to improve it',
    body:
      'Run a review and receive actionable ideas for stronger headlines, clearer storytelling, and a more polished final result.',
  },
]

const features = [
  'AI Review',
  'Portfolio Suggestions',
  'Professional Templates',
  'Easy Customization',
]

export default function About() {
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
    <section id="about" className="bg-[#f3f8ff] py-16 scroll-mt-24">
      <div ref={ref} className="reveal-on-scroll max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div
              data-delay="80"
              className="stagger-reveal animate-fade-up bg-white rounded-3xl shadow-sm p-8 md:p-10"
            >
              <span className="inline-block bg-blue-100/60 text-blue-600 px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
                About hulma
              </span>

              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
                Shape your portfolio with confidence.
              </h2>

              <p className="text-blue-600 font-medium text-sm md:text-base mb-6">
                A guided workflow that helps you build a polished portfolio faster.
              </p>

              <p className="text-slate-600 text-base leading-relaxed mb-8">
                Hulma helps you create a professional portfolio through customizable
                templates and AI-powered reviews. Build your portfolio with a design
                that fits you, then get useful suggestions to improve your content.
              </p>

              <div>
                <h3 className="text-slate-900 font-bold text-sm mb-3">What you get</h3>
                <ul className="space-y-2 text-sm font-medium text-slate-600">
                  {features.map((feature, index) => (
                    <li
                      key={feature}
                      data-delay={140 + index * 80}
                      className="stagger-reveal before:content-['•'] before:text-blue-600 before:mr-2"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-col gap-5">
              {workflowSteps.map((step, index) => (
                // Wrapper handles the reveal animation + delay, so the card's hover stays instant
                <div
                  key={step.id}
                  data-delay={150 + index * 120}
                  className="stagger-reveal"
                >
                  <div className="group bg-white rounded-2xl shadow-sm p-6 md:p-7 cursor-default transition-all duration-200 ease-out hover:-translate-y-2 hover:shadow-[0_18px_45px_-18px_rgba(37,99,235,0.35)]">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 font-bold text-base flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-blue-100">
                        {step.id}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed ml-13">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
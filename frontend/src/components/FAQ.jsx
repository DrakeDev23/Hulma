import { useEffect, useRef, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'

const faqs = [
  {
    question: 'Is my personal information safe?',
    answer:
      'Your data is encrypted in transit and at rest, and access is restricted to only the people who need it. We never sell your personal information to third parties.',
  },
  {
    question: 'Will my data be used to train AI models?',
    answer:
      'No. Your content is used only to generate your portfolio and AI Review suggestions. It is not used to train AI models.',
  },
  {
    question: 'Who can see my portfolio?',
    answer:
      'Your portfolio is private until you choose to publish or share it. You can unpublish it at any time if you want to make it private again.',
  },
  {
    question: 'Can I delete my data?',
    answer:
      'Yes. Your portfolio has a Delete button and a Save button, so you stay in control of your content. Use Save to keep your changes, or Delete to remove it.',
  },
  {
    question: 'Does the AI Review store my content?',
    answer:
      'Content sent for review is processed to generate suggestions and feedback. It is not shared with other users.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="faq" className="bg-[#f3f8ff] py-12 sm:py-16 scroll-mt-24">
      <div ref={ref} className="reveal-on-scroll max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <p className="mb-3 text-blue-600 font-bold text-xs sm:text-sm tracking-wider uppercase">
            FAQ
          </p>
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Your privacy and data, answered
          </h2>
          <p className="mx-auto max-w-2xl text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed">
            We believe you should know exactly how your information is handled. Here are
            answers to the questions we hear most.
          </p>
        </div>

        <div className="mt-8 sm:mt-10">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-button-${index}`

            return (
              <div
                key={item.question}
                className="mb-3.5 sm:mb-4 bg-white rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 text-left cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold text-slate-900">{item.question}</span>
                  <FiChevronDown
                    className={`h-5 w-5 text-blue-600 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-4 sm:px-6 pb-4 sm:pb-5 text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed"
                    >
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Still have questions? Contact us at{' '}
          <a href="mailto:Hulma@gmail.com" className="text-blue-600 font-medium hover:underline">
            Hulma@gmail.com
          </a>
        </p>
      </div>
    </section>
  )
}

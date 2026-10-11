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

export default function ProcessTimeline() {
  return (
    <section id="processtimeline" className="bg-[#edf6ff] scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="mb-10 md:mb-16">
          <p className="text-blue-600 font-bold text-xs sm:text-sm tracking-wider uppercase mb-3">
            HOW IT WORKS
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            How to create your portfolio with Hulma
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-4xl">
            Create a professional portfolio without starting from scratch. Add your
            information, projects, skills, and experience, then let Hulma’s AI help
            turn your content into a polished portfolio. Choose a template that fits
            your style, customize it as much as you want, and get your portfolio ready
            to share.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-0 right-0 top-[1.45rem] h-[2px] bg-blue-300/90" />

          <div className="grid gap-8 md:grid-cols-6 md:gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative md:flex md:flex-col md:items-center transition-transform duration-300 ease-out hover:-translate-y-1"
              >
                <div className="hidden md:flex items-center justify-center absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 rounded-full border-4 border-blue-600 bg-white shadow-sm z-10 text-sm font-bold text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:bg-blue-50">
                  {step.number}
                </div>

                <div className="flex items-start md:block md:text-center">
                  <div className="md:hidden mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-blue-600 bg-white shadow-sm z-10 relative text-xs font-bold text-blue-600 transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-50">
                    {step.number}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-snug md:mt-14 md:max-w-[150px] transition-colors duration-300 group-hover:text-slate-900">
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

const footerLinks = {
  create: ['AI Portfolio Generator', 'Portfolio Templates', 'AI Review', 'Customize Portfolio'],
  resources: [
    { label: 'About', href: '#about' },
    { label: 'Help', href: '#help' },
    { label: 'FAQ', href: '#faq' },
  ],
}

const iconClass = 'h-4 w-4'

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClass}>
      <path d="M13.8 22v-8h2.7l.4-3h-3.1V7.2c0-.9.3-1.6 1.7-1.6H17V2.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.4-4.1 4.2V11H8v3h2.5v8h3.3Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={iconClass}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClass}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  )
}

const socialLinks = [
  { label: 'Facebook', href: 'https://facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: LinkedinIcon },
]

export default function Footer() {
  return (
    <footer className="scroll-reveal bg-[#f0f7ff] pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5 text-2xl font-bold text-slate-900">
            <img src="/src/assets/logo.png" alt="Hulma" className="h-9 w-auto object-contain" />
            <span>Hulma</span>
          </div>

          <p className="text-sm text-slate-600 max-w-xs mt-4 leading-relaxed">
            Shape your story. Build your portfolio. Stand out.
          </p>

          <div className="flex items-center gap-3 mt-6">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
                aria-label={label}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Create</h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            {footerLinks.create.map((link) => (
              <li key={link}>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Resources</h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
            {footerLinks.resources.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="hover:text-blue-600 cursor-pointer transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Contact Information</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
            <li>Hulma@gmail.com</li>
            <li>0912312312</li>
            <li>Cebu City, Philippines</li>
          </ul>
        </div>
      </div>

      <div className="mt-16 pt-6 max-w-7xl mx-auto border-t border-slate-200/80">
        <p className="text-xs text-slate-500">Copyright 2026 Hulma. All rights reserved.</p>
      </div>
    </footer>
  )
}
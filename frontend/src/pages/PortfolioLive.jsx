import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { Mail, Phone, MapPin, Globe, ArrowLeft } from 'lucide-react'

function getTemplate() {
    try {
        return localStorage.getItem('hulma-template') || 'simple'
    } catch {
        return 'simple'
    }
}

export default function PortfolioLive() {
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const [portfolio, setPortfolio] = useState(null)
    const [loading, setLoading] = useState(true)
    const [template, setTemplate] = useState('simple')

    useEffect(() => { setTemplate(getTemplate()) }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await getToken()
                const res = await fetch('/api/portfolio/me', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data) setPortfolio(data)
                }
            } catch (e) { console.error('Failed to load portfolio:', e) }
            finally { setLoading(false) }
        }
        fetchData()
    }, [getToken])

    if (loading) return <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center">Loading portfolio...</div>
    if (!portfolio) return <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center">No portfolio found. <button onClick={() => navigate('/portfolio/create')} className="ml-2 underline">Create one</button></div>

    const profile = portfolio.sections?.profile || {}
    const skills = Array.isArray(portfolio.sections?.skills) ? portfolio.sections.skills : []
    const education = Array.isArray(portfolio.sections?.education) ? portfolio.sections.education : []
    const experience = Array.isArray(portfolio.sections?.workExperience) ? portfolio.sections.workExperience : []
    const links = portfolio.sections?.socialLinks ? Object.entries(portfolio.sections.socialLinks) : []
    const projects = Array.isArray(portfolio.projects) ? portfolio.projects : []

    const isSimple = template === 'simple'
    const isModern = template === 'modern'
    const isCreative = template === 'creative'

    const bg = isCreative ? 'bg-[#0a0a12] text-white font-sans' : isModern ? 'bg-[#f6f8fa] text-slate-900 font-sans' : 'bg-[#fdfcfb] text-slate-900 font-serif'
    const headerGrad = isSimple ? 'bg-gradient-to-br from-[#1e293b] to-[#334155]' : isModern ? 'bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]' : 'bg-gradient-to-br from-[#7c3aed] via-[#9333ea] to-[#6b21a8]'
    const cardBg = isCreative ? 'bg-[#16122a]/70 backdrop-blur-xl border border-white/[0.08]' : isModern ? 'bg-white shadow-[0_4px_24px_rgba(30,70,140,0.06)] border border-slate-100/80 rounded-[28px]' : 'bg-[#faf9f7] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-stone-200/60 rounded-[24px]'
    const titleColor = isCreative ? 'text-[#f0a030]' : isModern ? 'text-[#1d4ed8]' : 'text-[#2d2d2d] font-serif'

    return (
        <div className={`min-h-screen ${bg}`}>
            <div className={`mx-auto max-w-5xl px-6 py-12 sm:py-16`}>
                <button onClick={() => navigate('/portfolio')} className={`mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition hover:scale-105 ${isCreative ? 'bg-white/10 hover:bg-white/20 text-white' : isModern ? 'bg-[#eaf1fc] hover:bg-[#dce9fb] text-[#1f6fdc]' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                    <ArrowLeft size={14} /> Back to dashboard
                </button>

                <header className={`relative rounded-[32px] ${headerGrad} p-8 sm:p-10 shadow-2xl overflow-hidden`}>
                    {isCreative && (
                        <>
                            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#ff6b6b]/30 blur-2xl" />
                            <div className="absolute -left-12 bottom-0 h-36 w-36 rotate-12 rounded-[40%] bg-[#ffa502]/30 blur-xl" />
                        </>
                    )}
                    <div className="relative z-10">
                        <div className="flex items-start gap-5 sm:gap-8">
                            {profile.profilePicture ? (
                                <img src={profile.profilePicture} alt={profile.fullName || 'Profile'} className={`h-20 w-20 sm:h-28 sm:w-28 rounded-full object-cover ring-4 ${isCreative ? 'ring-[#ffa502]/40' : isModern ? 'ring-white/40' : 'ring-white/60'}`} />
                            ) : (
                                <div className={`grid h-20 w-20 sm:h-28 sm:w-28 shrink-0 place-items-center rounded-full text-2xl font-black sm:text-4xl ${isCreative ? 'bg-[#ffa502]/20 text-[#ffa502]' : isModern ? 'bg-white/20 text-white' : 'bg-slate-700 text-white'}`}>
                                    {(profile.fullName || 'P').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-black tracking-[-0.03em] leading-[0.92] text-white">{portfolio.title || profile.fullName || 'My Portfolio'}</h1>
                                <p className={`mt-2 text-base sm:text-xl leading-[1.45] font-light ${isCreative ? 'text-[#ffd5a5]' : 'text-[#cfe0fa]'}`}>{portfolio.summary || profile.aboutMe || 'Focused on building impactful digital experiences.'}</p>
                            </div>
                        </div>
                        <div className={`mt-5 flex flex-wrap gap-3 text-sm ${isCreative ? 'text-[#ffd5a5]' : 'text-[#ebf3ff]'}`}>
                            {profile.email && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><Mail size={14} /> {profile.email}</span>}
                            {profile.contactNumber && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><Phone size={14} /> {profile.contactNumber}</span>}
                            {profile.address && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><MapPin size={14} /> {profile.address}</span>}
                        </div>
                        {links.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {links.map(([label, url]) => (
                                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition hover:scale-105 ${isCreative ? 'bg-[#ffa502]/20 text-[#ffa502] hover:bg-[#ffa502]/40' : 'bg-white/15 text-white hover:bg-white/30'}`}>
                                        <Globe size={12} /> {label}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                <main className="mt-10 space-y-10">
                    <section className={`rounded-[28px] p-7 sm:p-10 ${cardBg}`}>
                        <h2 className={`${isCreative ? 'text-2xl font-extrabold tracking-tight text-[#f0a030]' : isModern ? 'text-xl font-bold tracking-tight ' + titleColor : 'text-xl font-semibold tracking-tight font-serif ' + titleColor}`}>About</h2>
                        <p className={`text-sm sm:text-base leading-relaxed ${isCreative ? 'text-slate-200' : 'text-slate-600'}`}>{profile.aboutMe || 'No about section yet.'}</p>
                    </section>

                    {skills.length > 0 && (
                        <section className={`rounded-[28px] p-7 sm:p-10 ${cardBg}`}>
                            <h2 className={`${isCreative ? 'text-2xl font-extrabold tracking-tight text-[#f0a030]' : isModern ? 'text-xl font-bold tracking-tight ' + titleColor : 'text-xl font-semibold tracking-tight font-serif ' + titleColor}`}>Skills</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {skills.map((s) => (
                                    <span key={s} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 ${isCreative ? 'bg-[#ffa502]/20 text-[#ffa502]' : isModern ? 'bg-[#1f6fdc]/10 text-[#1f6fdc]' : 'bg-[#1f6fdc]/10 text-[#1558c4]'}`}>{s}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {education.length > 0 && (
                        <section className={`rounded-[28px] p-7 sm:p-10 ${cardBg}`}>
                            <h2 className={`${isCreative ? 'text-2xl font-extrabold tracking-tight text-[#f0a030]' : isModern ? 'text-xl font-bold tracking-tight ' + titleColor : 'text-xl font-semibold tracking-tight font-serif ' + titleColor}`}>Education</h2>
                            <ul className="mt-3 space-y-2">
                                {education.map((e) => (
                                    <li key={e} className={`rounded-xl px-4 py-3 text-sm sm:text-base ${isCreative ? 'bg-[#24103a]/60 text-slate-100' : 'bg-[#f8fafc] text-slate-600'}`}>{e}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {experience.length > 0 && (
                        <section className={`rounded-[28px] p-7 sm:p-10 ${cardBg}`}>
                            <h2 className={`${isCreative ? 'text-2xl font-extrabold tracking-tight text-[#f0a030]' : isModern ? 'text-xl font-bold tracking-tight ' + titleColor : 'text-xl font-semibold tracking-tight font-serif ' + titleColor}`}>Experience</h2>
                            <ul className="mt-3 space-y-2">
                                {experience.map((e) => (
                                    <li key={e} className={`rounded-xl px-4 py-3 text-sm sm:text-base ${isCreative ? 'bg-[#24103a]/60 text-slate-100' : 'bg-[#f8fafc] text-slate-600'}`}>{e}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {projects.length > 0 && (
                        <section className={`rounded-[28px] p-7 sm:p-10 ${cardBg}`}>
                            <h2 className={`${isCreative ? 'text-2xl font-extrabold tracking-tight text-[#f0a030]' : isModern ? 'text-xl font-bold tracking-tight ' + titleColor : 'text-xl font-semibold tracking-tight font-serif ' + titleColor}`}>Projects</h2>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                {projects.map((p, i) => (
                                    <article key={i} className={`rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-xl ${isCreative ? 'bg-gradient-to-br from-[#24103a] to-[#1a1025] border border-white/10' : isModern ? 'bg-gradient-to-br from-[#f8fafc] to-white border border-slate-100' : 'bg-gradient-to-br from-[#f8fafc] to-white border border-slate-100'}`}>
                                        <h3 className={`text-lg font-bold ${isCreative ? 'text-white' : 'text-slate-800'}`}>{p.name || 'Project'}</h3>
                                        <p className={`mt-1 text-sm ${isCreative ? 'text-slate-300' : 'text-slate-500'}`}>{p.description || 'No description.'}</p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <footer className={`mt-16 border-t pt-6 text-xs ${isCreative ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-400'}`}>
                    Built with Hulma · Template: <span className="font-semibold capitalize">{template}</span>
                </footer>
            </div>
        </div>
    )
}

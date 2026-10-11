import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AboutWorkflow from './components/AboutWorkflow'
import ProcessTimeline from './components/ProcessTimeline'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <Hero />
      <AboutWorkflow />
      <ProcessTimeline />
    </div>
  )
}
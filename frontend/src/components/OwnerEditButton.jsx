import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'

export default function OwnerEditButton({ templateId = 'simple' }) {
    return (
        <Link
            to={`/portfolio/create?template=${encodeURIComponent(templateId)}`}
            title="Only you can see this"
            className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-xl bg-[#1f6fdc] px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-blue-900/25 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1558c4] active:scale-95 sm:px-4 sm:py-2.5 sm:text-sm print:hidden"
        >
            <Pencil size={15} />
            <span>Edit portfolio</span>
        </Link>
    )
}

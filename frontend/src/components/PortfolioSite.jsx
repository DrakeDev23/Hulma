import SimpleTemplate from './templates/SimpleTemplate'
import ModernTemplate from './templates/ModernTemplate'
import CreativeTemplate from './templates/CreativeTemplate'

export { SimpleTemplate, ModernTemplate, CreativeTemplate }

export default function PortfolioSite({
    portfolio,
    template = 'simple',
    idPrefix = 'site',
    stickyNav = true,
    onBack,
    backLabel = 'Back to editor',
}) {
    const selectedTemplate = String(template || 'simple').toLowerCase()

    if (selectedTemplate === 'modern') {
        return (
            <ModernTemplate
                portfolio={portfolio}
                idPrefix={idPrefix}
                stickyNav={stickyNav}
                onBack={onBack}
                backLabel={backLabel}
            />
        )
    }

    if (selectedTemplate === 'creative') {
        return (
            <CreativeTemplate
                portfolio={portfolio}
                idPrefix={idPrefix}
                stickyNav={stickyNav}
                onBack={onBack}
                backLabel={backLabel}
            />
        )
    }

    return (
        <SimpleTemplate
            portfolio={portfolio}
            idPrefix={idPrefix}
            stickyNav={stickyNav}
            onBack={onBack}
            backLabel={backLabel}
        />
    )
}
import SimpleTemplate from './templates/SimpleTemplate'
import ModernTemplate from './templates/ModernTemplate'
import CreativeTemplate from './templates/CreativeTemplate'
import CreativeStudioTemplate from './templates/CreativeStudioTemplate'
import MinimalModernTemplate from './templates/MinimalModernTemplate'

export { SimpleTemplate, ModernTemplate, CreativeTemplate, CreativeStudioTemplate, MinimalModernTemplate }

export default function PortfolioSite({
    portfolio,
    template = 'simple',
    idPrefix = 'site',
    stickyNav = true,
    onBack,
    backLabel = 'Back to editor',
}) {
    const selectedTemplate = String(template || 'simple').toLowerCase()

    if (
        selectedTemplate === 'minimal-orange' ||
        selectedTemplate === 'minimal' ||
        selectedTemplate === 'warm-orange' ||
        selectedTemplate === 'modern-orange' ||
        selectedTemplate === 'orange'
    ) {
        return (
            <MinimalModernTemplate
                portfolio={portfolio}
                idPrefix={idPrefix}
                stickyNav={stickyNav}
                onBack={onBack}
                backLabel={backLabel}
            />
        )
    }

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

    if (selectedTemplate === 'creative-studio' || selectedTemplate === 'studio') {
        return (
            <CreativeStudioTemplate
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
'use client'

import ModernUserSettings from '@/components/settings/modern-user-settings'

export default function SettingsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section can be handled by the layout or within the modern component */}
            <ModernUserSettings />
        </div>
    )
}

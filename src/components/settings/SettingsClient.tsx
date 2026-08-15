'use client'

import { AutomationsPanel } from './AutomationsPanel'

export default function SettingsClient({ userId }: { userId: string }) {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">More integrations coming soon.</p>
      <AutomationsPanel userId={userId} />
    </div>
  )
}

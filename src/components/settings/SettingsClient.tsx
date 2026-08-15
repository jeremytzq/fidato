'use client'

import { AutomationsPanel } from './AutomationsPanel'
import { AgentProfilePanel } from './AgentProfilePanel'

export default function SettingsClient({ userId }: { userId: string }) {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">More integrations coming soon.</p>
      </div>
      <AgentProfilePanel userId={userId} />
      <div className="border-t border-border pt-6">
        <AutomationsPanel userId={userId} />
      </div>
    </div>
  )
}

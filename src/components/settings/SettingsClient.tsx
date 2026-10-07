'use client'

import { AutomationsPanel } from './AutomationsPanel'
import { AgentProfilePanel } from './AgentProfilePanel'
import { MetaConnectPanel, type MetaConnection } from './MetaConnectPanel'

export default function SettingsClient({
  userId,
  metaConnections,
  metaConfigured,
  connected,
  error,
}: {
  userId: string
  metaConnections: MetaConnection[]
  metaConfigured: boolean
  connected?: boolean
  error?: string | null
}) {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Agent profile, lead automations, and Meta Lead Ads.
        </p>
      </div>
      <AgentProfilePanel userId={userId} />
      <div className="border-t border-border pt-6">
        <AutomationsPanel userId={userId} />
      </div>
      <div className="border-t border-border pt-6">
        <MetaConnectPanel
          connections={metaConnections}
          metaConfigured={metaConfigured}
          connected={connected}
          error={error}
        />
      </div>
    </div>
  )
}

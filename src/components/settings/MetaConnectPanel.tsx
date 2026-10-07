'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Link2, Unlink, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface MetaConnection {
  page_id: string
  page_name: string | null
  created_at: string
}

const ERROR_MESSAGES: Record<string, string> = {
  meta_denied: 'Meta authorization was cancelled or denied.',
  meta_token: 'Could not exchange the Meta authorization code. Try again.',
  meta_extend: 'Could not extend the Meta access token. Try again.',
  meta_pages: 'Could not load your Facebook Pages. Check Page permissions.',
  meta_no_pages: 'No Facebook Pages found on this account.',
  meta_save_failed: 'Connected to Meta but failed to save Page credentials.',
}

interface MetaConnectPanelProps {
  connections: MetaConnection[]
  connected?: boolean
  error?: string | null
  metaConfigured: boolean
}

export function MetaConnectPanel({
  connections: initial,
  connected,
  error,
  metaConfigured,
}: MetaConnectPanelProps) {
  const router = useRouter()
  const [connections, setConnections] = useState(initial)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const bannerError = localError || (error ? ERROR_MESSAGES[error] || error : null)

  const handleDisconnect = async (pageId: string) => {
    setDisconnecting(pageId)
    setLocalError(null)
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: pageId }),
      })
      if (!res.ok) throw new Error('Failed to disconnect page')
      setConnections(prev => prev.filter(c => c.page_id !== pageId))
      router.replace('/settings')
      router.refresh()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone size={16} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">Meta Lead Ads</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Connect Facebook Pages so new Lead Ads form submissions create leads in Fidato automatically.
      </p>

      {connected && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
          <span>Meta connected. New Lead Ads will sync into your Leads board.</span>
        </div>
      )}

      {bannerError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{bannerError}</span>
        </div>
      )}

      {!metaConfigured ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
          Meta App credentials are not configured for this environment. Set{' '}
          <code className="text-[11px]">META_APP_ID</code>,{' '}
          <code className="text-[11px]">META_APP_SECRET</code>, and{' '}
          <code className="text-[11px]">META_WEBHOOK_VERIFY_TOKEN</code> to enable connect.
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No Facebook Pages connected yet.</p>
          <Button type="button" onClick={() => { window.location.href = '/api/meta/connect' }}>
            <Link2 size={14} />
            Connect with Meta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map(conn => (
            <div
              key={conn.page_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {conn.page_name || 'Facebook Page'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Page ID {conn.page_id}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={disconnecting === conn.page_id}
                onClick={() => handleDisconnect(conn.page_id)}
              >
                <Unlink size={13} />
                Disconnect
              </Button>
            </div>
          ))}
          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { window.location.href = '/api/meta/connect' }}
            >
              <Link2 size={13} />
              Connect another Page
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Link, Unlink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface MetaConnection {
  page_id: string
  page_name: string
  updated_at: string
}

interface Props {
  connections: MetaConnection[]
  connected: boolean
  error: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  meta_denied: 'Facebook authorisation was cancelled.',
  meta_token: 'Could not get a Facebook token. Please try again.',
  meta_extend: 'Could not extend the token. Please try again.',
  meta_pages: 'Could not fetch your Facebook pages.',
  meta_no_pages: 'No Facebook pages found. Make sure you manage at least one page.',
  meta_save_failed: 'Pages were found but could not be saved. Check Vercel logs for details.',
}

export default function SettingsClient({ connections: initial, connected, error }: Props) {
  const [connections, setConnections] = useState(initial)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const handleDisconnect = async (pageId: string) => {
    setDisconnecting(pageId)
    const res = await fetch('/api/meta/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId }),
    })
    if (res.ok) {
      setConnections(prev => prev.filter(c => c.page_id !== pageId))
    }
    setDisconnecting(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage your integrations and preferences.</p>

      {/* Banner */}
      <AnimatePresence>
        {connected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
            style={{ background: 'hsl(142 76% 36% / 0.12)', color: 'hsl(142 76% 46%)' }}
          >
            <CheckCircle size={15} />
            Facebook page connected. Leads from your ads will now appear in the CRM.
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
            style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(0 72% 61%)' }}
          >
            <AlertCircle size={15} />
            {ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meta Ads section */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1877F2' }}>
            <Share2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Meta Lead Ads</p>
            <p className="text-xs text-muted-foreground">Auto-import leads from your Facebook &amp; Instagram ads</p>
          </div>
          <a
            href="/api/meta/connect"
            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1877F2' }}
          >
            <Link size={12} />
            Connect Page
          </a>
        </div>

        {connections.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No pages connected yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your Facebook page to start receiving leads automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {connections.map(conn => (
              <li key={conn.page_id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#1877F2' }}>
                  {conn.page_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conn.page_name}</p>
                  <p className="text-xs text-muted-foreground">ID: {conn.page_id}</p>
                </div>
                <button
                  onClick={() => handleDisconnect(conn.page_id)}
                  disabled={disconnecting === conn.page_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                >
                  {disconnecting === conn.page_id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Unlink size={12} />
                  )}
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

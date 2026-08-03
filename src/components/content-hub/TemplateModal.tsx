'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MessageTemplate } from '@/types'

const VARIABLES = [
  { name: 'client_name', desc: "Client's display name" },
  { name: 'client_email', desc: "Client's email address" },
  { name: 'client_phone', desc: "Client's phone number" },
  { name: 'sender_name', desc: 'Your display name' },
  { name: 'sender_company', desc: 'PropNex Realty' },
  { name: 'sender_phone', desc: 'Your phone number' },
  { name: 'sender_email', desc: 'Your email address' },
  { name: 'day_period', desc: 'Morning, Afternoon, or Evening' },
]

const CATEGORY_SUGGESTIONS = [
  'Ads Instant Replies', 'Follow-Up', 'Cold Outreach',
  'New Project Updates', 'Birthday & Festive', 'Referral', 'General',
]

interface Props {
  open: boolean
  onClose: () => void
  template: MessageTemplate | null
  userId: string
  onSaved: (t: MessageTemplate) => void
}

export function TemplateModal({ open, onClose, template, userId, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('General')
  const [varOpen, setVarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      setTitle(template?.title || '')
      setBody(template?.body || '')
      setCategory(template?.category || 'General')
      setVarOpen(false)
      setError(null)
    }
  }, [open, template])

  const insertVariable = (varName: string) => {
    const ta = textareaRef.current
    const inserted = `{{${varName}}}`
    if (!ta) { setBody(prev => prev + inserted); setVarOpen(false); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    setBody(body.slice(0, start) + inserted + body.slice(end))
    setVarOpen(false)
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = start + inserted.length
      ta.selectionEnd = start + inserted.length
    }, 10)
  }

  const save = async () => {
    if (!title.trim() || !body.trim()) { setError('Title and message are required.'); return }
    setSaving(true); setError(null)
    const now = new Date().toISOString()
    if (template) {
      const { data, error: err } = await supabase
        .from('message_templates')
        .update({ title: title.trim(), body: body.trim(), category: category.trim(), updated_at: now })
        .eq('id', template.id).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data)
    } else {
      const { data, error: err } = await supabase
        .from('message_templates')
        .insert({ user_id: userId, title: title.trim(), body: body.trim(), category: category.trim(), created_at: now, updated_at: now })
        .select().single()
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data)
    }
    setSaving(false)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-16 sm:pb-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-visible"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{template ? 'Edit Template' : 'Create Template'}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Enter template title"
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <input
                value={category} onChange={e => setCategory(e.target.value)}
                list="cat-suggestions" placeholder="e.g. Follow-Up"
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <datalist id="cat-suggestions">
                {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Template Message</label>
              <textarea
                ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                placeholder="Template text..."
                rows={7}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none leading-relaxed"
              />
            </div>

            {/* Variable picker */}
            <div className="relative">
              <button
                onClick={() => setVarOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <span className="font-mono font-bold">{'{}'}</span>
                Insert Variable
                <ChevronDown size={13} style={{ transform: varOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
              </button>
              {varOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {VARIABLES.map(v => (
                    <button
                      key={v.name}
                      onClick={() => insertVariable(v.name)}
                      className="w-full flex flex-col px-4 py-2.5 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                    >
                      <span className="text-sm font-mono font-semibold text-primary">{`{{${v.name}}}`}</span>
                      <span className="text-xs text-muted-foreground">{v.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1 pb-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

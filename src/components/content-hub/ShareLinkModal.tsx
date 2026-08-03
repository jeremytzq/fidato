'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, Copy, Check, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ShareLink } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  onCreated: (link: ShareLink) => void
}

export function ShareLinkModal({ open, onClose, userId, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const reset = () => {
    setTitle(''); setMessage(''); setImageFile(null); setImagePreview(null)
    setCreating(false); setError(null); setCreated(null); setCopied(false)
  }

  const handleFile = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const create = async () => {
    setCreating(true); setError(null)
    try {
      const token = crypto.randomUUID().replace(/-/g, '')
      let media_url: string | null = null

      if (imageFile) {
        const path = `${userId}/${token}`
        const { error: upErr } = await supabase.storage
          .from('share-media')
          .upload(path, imageFile, { contentType: imageFile.type })
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
        const { data: urlData } = supabase.storage.from('share-media').getPublicUrl(path)
        media_url = urlData.publicUrl
      }

      const { data, error: insertErr } = await supabase
        .from('share_links')
        .insert({ user_id: userId, token, title: title.trim() || null, message: message.trim() || null, media_url })
        .select().single()
      if (insertErr) throw insertErr

      setCreated(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const shareUrl = created
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${created.token}`
    : ''

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    if (created) onCreated(created)
    reset()
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Create Share Link</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {!created ? (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title <span className="font-normal normal-case">(optional)</span></label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Westgate Tower — Industrial Listing"
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message <span className="font-normal normal-case">(optional)</span></label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Add a message for the recipient…"
                rows={3}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Image <span className="font-normal normal-case">(optional)</span></label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {imagePreview ? (
                <div className="mt-1.5 relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-border" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-1.5 w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Upload size={18} />
                  <span className="text-xs">Click to upload image</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              You'll be able to see how many times the link was opened, and when.
            </p>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1 pb-2">
              <button onClick={handleClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={create} disabled={creating}
                className="flex-1 py-2.5 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? 'Generating…' : 'Generate Link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-6 space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ExternalLink size={22} className="text-green-600" />
              </div>
              <p className="font-semibold text-foreground">Share link ready!</p>
              <p className="text-xs text-muted-foreground text-center">
                Share this link with clients. You'll see view counts in the Share Links tab.
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border">
              <p className="flex-1 text-xs font-mono text-foreground truncate">{shareUrl}</p>
              <button onClick={copy} className="flex items-center gap-1 text-xs font-semibold text-primary flex-shrink-0">
                {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2 pb-2">
              <a
                href={shareUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink size={14} /> Preview
              </a>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Search, MessageCircle, Copy, Check, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/types'

interface Template {
  id: string
  title: string
  body: string
  category?: string
}

function fillVariables(body: string, lead: Lead | null, senderName: string, senderEmail: string): string {
  const hour = new Date().getHours()
  const dayPeriod = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  return body
    .replace(/{{client_name}}/g, lead?.display_name || lead?.name || '[Client Name]')
    .replace(/{{client_email}}/g, lead?.email || '[Client Email]')
    .replace(/{{client_phone}}/g, lead?.phone || lead?.whatsapp_number || '[Client Phone]')
    .replace(/{{sender_name}}/g, senderName)
    .replace(/{{sender_company}}/g, 'PropNex Realty')
    .replace(/{{sender_phone}}/g, '[Your Phone]')
    .replace(/{{sender_email}}/g, senderEmail)
    .replace(/{{day_period}}/g, dayPeriod)
}

interface Props {
  open: boolean
  onClose: () => void
  template: Template
  userId: string
  senderName: string
  senderEmail: string
}

export function UseTemplateModal({ open, onClose, template, userId, senderName, senderEmail }: Props) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setSelectedLead(null); setSearch(''); setCopied(false); setPickerOpen(false)
    supabase.from('leads')
      .select('id, name, display_name, phone, whatsapp_number, email')
      .eq('user_id', userId)
      .order('name')
      .then(({ data }) => setLeads((data as Lead[]) || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId])

  const filtered = leads.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
  const filled = fillVariables(template.body, selectedLead, senderName, senderEmail)
  const phone = selectedLead?.whatsapp_number || selectedLead?.phone

  const copy = async () => {
    await navigator.clipboard.writeText(filled)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openWhatsApp = () => {
    if (!phone) return
    const num = phone.replace(/\D/g, '')
    const prefix = num.startsWith('65') ? '' : '65'
    window.open(`https://wa.me/${prefix}${num}?text=${encodeURIComponent(filled)}`, '_blank')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 pb-16 sm:pb-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-foreground truncate">{template.title}</p>
            {template.category && (
              <span className="inline-block mt-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {template.category}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Lead selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Select Contact <span className="font-normal normal-case">(to fill variables)</span>
            </label>
            <div className="relative mt-1.5">
              <button
                onClick={() => setPickerOpen(v => !v)}
                className="w-full flex items-center justify-between h-9 px-3 rounded-lg border border-border bg-background text-sm text-left"
              >
                <span className={selectedLead ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {selectedLead ? selectedLead.name : 'Choose a lead to fill variables…'}
                </span>
                <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
              {pickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search leads…" autoFocus
                        className="w-full h-8 pl-7 pr-2 rounded-lg bg-muted text-sm focus:outline-none text-foreground"
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedLead(null); setPickerOpen(false) }}
                      className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      — No contact (show placeholders)
                    </button>
                    {filtered.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => { setSelectedLead(lead); setPickerOpen(false); setSearch('') }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {lead.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{lead.name}</span>
                        {lead.phone && <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{lead.phone}</span>}
                      </button>
                    ))}
                    {filtered.length === 0 && search && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No leads found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message preview */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message Preview</label>
            <div className="mt-1.5 rounded-xl bg-muted/50 border border-border p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed min-h-[100px]">
              {filled}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-border flex gap-2 flex-shrink-0">
          <button
            onClick={copy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={openWhatsApp}
            disabled={!phone}
            title={!phone ? (selectedLead ? 'No phone number for this lead' : 'Select a contact first') : undefined}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </motion.div>
    </div>
  )
}

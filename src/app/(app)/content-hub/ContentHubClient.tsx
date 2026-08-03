'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Copy, ExternalLink, Trash2, Edit, MessageSquare, Link2, Check, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TemplateModal } from '@/components/content-hub/TemplateModal'
import { UseTemplateModal } from '@/components/content-hub/UseTemplateModal'
import { ShareLinkModal } from '@/components/content-hub/ShareLinkModal'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import type { MessageTemplate, ShareLink } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface PresetTemplate {
  id: string
  category: string
  title: string
  body: string
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'p1', category: 'Ads Instant Replies', title: 'Listing Enquiry Reply',
    body: `Hi {{client_name}}, thanks for reaching out about my listing!\n\nI'm {{sender_name}} from PropNex — happy to assist. When would you like to view the property? I can usually arrange something within 1–2 days.\n\nLooking forward to connecting! 😊`,
  },
  {
    id: 'p2', category: 'Ads Instant Replies', title: 'Rental Enquiry Reply',
    body: `Hi {{client_name}}, good {{day_period}}! Thanks for enquiring about the rental.\n\nI'm {{sender_name}} from PropNex. When are you available for a viewing? I can arrange something quite quickly.\n\nFeel free to reach me directly too — always happy to help!`,
  },
  {
    id: 'p3', category: 'Follow-Up', title: 'Warm Network Check-In',
    body: `Hi {{client_name}}, been a while! Hope things are going well on your end.\n\nWas just thinking about you — if you're ever thinking of making a property move, or know someone who is, do feel free to loop me in. Always happy to help! 😊\n\nTake care!`,
  },
  {
    id: 'p4', category: 'Follow-Up', title: 'Referral Ask',
    body: `Hi {{client_name}}, hope all's well!\n\nI'm ramping up my real estate work and wanted to reach out to people I trust. If you know anyone looking to buy, sell, or rent — I'd really appreciate the intro. No pressure at all, just wanted to put it out there.\n\nThanks in advance! 🙏`,
  },
  {
    id: 'p5', category: 'Cold Outreach', title: 'Industrial Owner',
    body: `Hi {{client_name}}, I'm {{sender_name}} from PropNex — I specialise in industrial properties in Singapore.\n\nI came across your unit and wanted to reach out. If you're ever thinking of selling or leasing, I'd love to share how the market looks right now. Would you be open to a quick chat?`,
  },
  {
    id: 'p6', category: 'Cold Outreach', title: 'HDB Upgrader',
    body: `Hi {{client_name}}, I'm {{sender_name}} from PropNex — hope you don't mind me reaching out.\n\nYour flat should be hitting MOP soon and market conditions are quite favourable for upgraders right now. I'd love to share what your flat could potentially sell for.\n\nWould a quick call work?`,
  },
  {
    id: 'p7', category: 'New Project Updates', title: 'New Launch Alert',
    body: `Hi {{client_name}}, good {{day_period}}!\n\nJust wanted to flag an exciting new development that just launched. Based on what you've told me before, I think this might be of interest to you.\n\nWould you like me to send over more details? Happy to walk you through it anytime. 😊`,
  },
  {
    id: 'p8', category: 'Birthday & Festive', title: 'Happy Birthday',
    body: `Hi {{client_name}}, wishing you a very happy birthday! 🎂\n\nHope you have a wonderful day filled with joy. Do keep in touch — always here if you need any property advice!\n\nTake care and enjoy your special day! 😊`,
  },
  {
    id: 'p9', category: 'Birthday & Festive', title: 'Chinese New Year',
    body: `Hi {{client_name}}, wishing you and your family a Happy Chinese New Year! 🧧\n\nMay this year bring good health, prosperity, and joy to you and your loved ones.\n\n新年快乐！\n{{sender_name}}`,
  },
  {
    id: 'p10', category: 'Birthday & Festive', title: 'Hari Raya',
    body: `Hi {{client_name}}, Selamat Hari Raya Aidilfitri! 🌙\n\nWishing you and your family a joyous celebration. May this festive season bring you peace and happiness.\n\nTake care! {{sender_name}}`,
  },
]

type Tab = 'preset' | 'my' | 'links'

interface UseTarget {
  id: string
  title: string
  body: string
  category?: string
}

export default function ContentHubClient({
  initialTemplates,
  initialShareLinks,
  userId,
  senderName,
  senderEmail,
}: {
  initialTemplates: MessageTemplate[]
  initialShareLinks: ShareLink[]
  userId: string
  senderName: string
  senderEmail: string
}) {
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('preset')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(initialShareLinks)

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [useTarget, setUseTarget] = useState<UseTarget | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredPreset = PRESET_TEMPLATES.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLinks = shareLinks.filter(l =>
    (l.title || '').toLowerCase().includes(search.toLowerCase())
  )

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    await supabase.from('message_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const deleteShareLink = async (id: string) => {
    if (!confirm('Delete this share link? All view data will be lost.')) return
    await supabase.from('share_links').delete().eq('id', id)
    setShareLinks(prev => prev.filter(l => l.id !== id))
  }

  const copyLink = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const presetCategories = Array.from(new Set(filteredPreset.map(t => t.category)))

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Templates and share links</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'links' && (
            <Button onClick={() => setShareModalOpen(true)}>
              <Plus size={15} /> New Link
            </Button>
          )}
          {tab === 'my' && (
            <Button onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true) }}>
              <Plus size={15} /> New Template
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-muted w-fit flex-shrink-0">
        {([
          { id: 'preset', label: 'Preset' },
          { id: 'my', label: 'My Templates', count: templates.length },
          { id: 'links', label: 'Share Links', count: shareLinks.length },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch('') }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {'count' in t && (
              <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 flex-shrink-0">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'links' ? 'Search share links…' : 'Search templates…'}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Preset tab ── */}
        {tab === 'preset' && (
          <div className="space-y-6 pb-4">
            {presetCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No templates match your search.</p>
            )}
            {presetCategories.map(cat => (
              <div key={cat}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPreset.filter(t => t.category === cat).map(t => (
                    <TemplateCard
                      key={t.id}
                      title={t.title}
                      body={t.body}
                      onClick={() => setUseTarget({ id: t.id, title: t.title, body: t.body, category: t.category })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── My Templates tab ── */}
        {tab === 'my' && (
          <div className="pb-4">
            {filteredTemplates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <MessageSquare size={32} className="text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No templates match your search.' : 'No templates yet. Create your first one!'}
                </p>
                {!search && (
                  <Button variant="secondary" size="sm" onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true) }}>
                    <Plus size={14} /> New Template
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTemplates.map(t => (
                <TemplateCard
                  key={t.id}
                  title={t.title}
                  body={t.body}
                  category={t.category}
                  date={t.created_at}
                  onClick={() => setUseTarget({ id: t.id, title: t.title, body: t.body, category: t.category })}
                  onEdit={() => { setEditingTemplate(t); setTemplateModalOpen(true) }}
                  onDelete={() => deleteTemplate(t.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Share Links tab ── */}
        {tab === 'links' && (
          <div className="space-y-3 pb-4">
            {filteredLinks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Link2 size={32} className="text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No share links match your search.' : 'No share links yet.'}
                </p>
                {!search && (
                  <Button variant="secondary" size="sm" onClick={() => setShareModalOpen(true)}>
                    <Plus size={14} /> New Share Link
                  </Button>
                )}
              </div>
            )}
            {filteredLinks.map(link => (
              <ShareLinkCard
                key={link.id}
                link={link}
                copied={copiedId === link.id}
                onCopy={() => copyLink(link.token, link.id)}
                onDelete={() => deleteShareLink(link.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        template={editingTemplate}
        userId={userId}
        onSaved={(t) => {
          if (editingTemplate) {
            setTemplates(prev => prev.map(x => x.id === t.id ? t : x))
          } else {
            setTemplates(prev => [t, ...prev])
          }
          setTemplateModalOpen(false)
        }}
      />

      {useTarget && (
        <UseTemplateModal
          open={!!useTarget}
          onClose={() => setUseTarget(null)}
          template={useTarget}
          userId={userId}
          senderName={senderName}
          senderEmail={senderEmail}
        />
      )}

      <ShareLinkModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        userId={userId}
        onCreated={(link) => {
          setShareLinks(prev => [link, ...prev])
          setShareModalOpen(false)
          setTab('links')
        }}
      />
    </div>
  )
}

function TemplateCard({
  title, body, category, date, onClick, onEdit, onDelete,
}: {
  title: string
  body: string
  category?: string
  date?: string
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group flex flex-col min-h-[120px]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        {category && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
            {category}
          </span>
        )}
        {(onEdit || onDelete) && (
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Edit size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors text-muted-foreground">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
        {body.replace(/\n+/g, ' ')}
      </p>
      {date && (
        <p className="text-[10px] text-muted-foreground mt-2">{formatDate(date)}</p>
      )}
    </motion.div>
  )
}

function ShareLinkCard({
  link, copied, onCopy, onDelete,
}: {
  link: ShareLink
  copied: boolean
  onCopy: () => void
  onDelete: () => void
}) {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${link.token}`
    : `/share/${link.token}`

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {link.title || 'Untitled Share Link'}
        </p>
        {link.message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{link.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(link.created_at)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-center min-w-[36px]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye size={12} />
            <span className="text-sm font-bold text-foreground">{link.view_count}</span>
          </div>
          <p className="text-[9px] text-muted-foreground">{link.view_count === 1 ? 'view' : 'views'}</p>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          title="Preview link"
        >
          <ExternalLink size={13} />
        </a>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors text-muted-foreground"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

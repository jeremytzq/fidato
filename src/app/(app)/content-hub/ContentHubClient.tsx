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
    id: 'p11', category: 'Follow-Up', title: 'Viewing No-Show',
    body: `Hi {{client_name}}, I was at the property earlier for our viewing — hope everything's okay on your end!\n\nNo worries at all — things happen. If you'd like to reschedule, I'm happy to arrange another time.\n\nJust let me know! 😊\n{{sender_name}}`,
  },
  {
    id: 'p12', category: 'Follow-Up', title: 'Re-Engage Gone-Cold Lead',
    body: `Hi {{client_name}}, it's been a while — hope you're doing well!\n\nI know property decisions take time, and circumstances change. If you're still in the market — or thinking about it again — I'd love to catch up.\n\nNo pressure at all. Just wanted to check in. 😊\n{{sender_name}}`,
  },
  {
    id: 'p5', category: 'Cold Outreach', title: 'Industrial Owner',
    body: `Hi {{client_name}}, I'm {{sender_name}} from PropNex — I specialise in industrial properties in Singapore.\n\nI came across your unit and wanted to reach out. If you're ever thinking of selling or leasing, I'd love to share how the market looks right now. Would you be open to a quick chat?`,
  },
  {
    id: 'p6', category: 'Cold Outreach', title: 'HDB Upgrader (MOP Soon)',
    body: `Hi {{client_name}}, I'm {{sender_name}} from PropNex — hope you don't mind me reaching out.\n\nYour flat should be hitting MOP soon and market conditions are quite favourable for upgraders right now. I'd love to share what your flat could potentially sell for.\n\nWould a quick call work?`,
  },
  {
    id: 'p13', category: 'Cold Outreach', title: 'Condo Owner',
    body: `Hi {{client_name}}, I'm {{sender_name}} from PropNex. Hope you don't mind me reaching out!\n\nI've been tracking transactions in your condo and the market for your unit type has been moving well. If you've ever thought about monetising or upgrading, I'd love to share what similar units have been selling for.\n\nWould you be open to a quick chat?`,
  },
  {
    id: 'p14', category: 'Viewing Confirmations', title: 'Viewing Confirmed',
    body: `Hi {{client_name}}, just confirming our viewing this {{day_of_week}}!\n\nI'll meet you at the property — please let me know if you need the address again. Should take about 20–30 mins.\n\nSee you then! 😊\n{{sender_name}}`,
  },
  {
    id: 'p15', category: 'Viewing Confirmations', title: 'Day-Before Reminder',
    body: `Hi {{client_name}}, just a quick reminder — we have a viewing tomorrow!\n\nLet me know if you need the details again or if anything comes up. I'll be there a little early.\n\nSee you tomorrow! 😊\n{{sender_name}}`,
  },
  {
    id: 'p16', category: 'After Viewing', title: 'Thank You for Viewing',
    body: `Hi {{client_name}}, thanks for taking the time to view today!\n\nHope it gave you a clearer picture. How are you feeling about it? Happy to answer any questions or arrange a second look if needed.\n\nNo rush — just let me know where your head's at. 😊\n{{sender_name}}`,
  },
  {
    id: 'p17', category: 'After Viewing', title: 'Post-Viewing Check-In',
    body: `Hi {{client_name}}, just wanted to check in after the viewing last week!\n\nHave you had a chance to think it over? Happy to revisit any concerns, compare similar options, or run through the numbers with you.\n\nLet me know what you'd like to do next. 😊\n{{sender_name}}`,
  },
  {
    id: 'p18', category: 'HDB-Specific', title: 'HDB Eligibility Check-In',
    body: `Hi {{client_name}}, before we shortlist flats, I wanted to run through your HDB eligibility with you.\n\nThings like citizenship status, income ceiling, and prior property ownership determine what grants and loan amounts you can access — good to get this mapped out early.\n\nWhen's a good time for a quick call? Happy to walk you through it. 😊\n{{sender_name}}`,
  },
  {
    id: 'p19', category: 'HDB-Specific', title: 'First-Timer Grants Overview',
    body: `Hi {{client_name}}, since you're a first-time buyer, I wanted to share a quick overview of the grants you might qualify for.\n\nCPF Housing Grants can go up to $80k for eligible buyers, with additional schemes for singles and couples. Worth understanding this before we commit to anything.\n\nWould you like me to run through the numbers with you? Happy to help map it out. 😊\n{{sender_name}}`,
  },
  {
    id: 'p20', category: 'Offer & Negotiation', title: 'Offer Submitted',
    body: `Hi {{client_name}}, just to let you know — I've submitted your offer to the seller's agent.\n\nWe should hear back within 1–2 days. I'll keep you posted as soon as I get news.\n\nFingers crossed! 🤞\n{{sender_name}}`,
  },
  {
    id: 'p21', category: 'Offer & Negotiation', title: 'Offer Accepted — Congrats!',
    body: `Hi {{client_name}}, great news — your offer has been accepted! 🎉\n\nNext steps: we'll move on to the option to purchase and work through the legal timeline. I'll guide you through each step — nothing to stress about.\n\nWell done — one big step closer to your new home! 😊\n{{sender_name}}`,
  },
  {
    id: 'p22', category: 'Rental', title: 'Tenancy Renewal Reminder',
    body: `Hi {{client_name}}, hope you're well! Just a heads-up — your tenancy is coming up for renewal in the next 2–3 months.\n\nIt's worth starting the conversation early to avoid any gaps. I can help you assess whether to renew, renegotiate, or explore other options.\n\nWould you like to catch up soon?\n{{sender_name}}`,
  },
  {
    id: 'p23', category: 'Rental', title: 'Handover Congratulations',
    body: `Hi {{client_name}}, congratulations on completing the handover today! 🎊\n\nHope everything went smoothly. If there's anything outstanding or you need help settling in, feel free to reach out.\n\nThanks for trusting me with this — really appreciate it. Do keep me in mind for any future property needs!\n{{sender_name}}`,
  },
  {
    id: 'p24', category: 'Post-Transaction', title: 'Purchase Completion Congrats',
    body: `Hi {{client_name}}, congratulations on your new home! 🏡🎉\n\nIt's been a pleasure guiding you through the journey. Wishing you many happy years ahead in your new place.\n\nDo stay in touch — if you ever need anything property-related down the road, I'm always here.\n{{sender_name}}`,
  },
  {
    id: 'p25', category: 'Post-Transaction', title: 'Post-Deal Referral Ask',
    body: `Hi {{client_name}}, hope you're settling in well!\n\nI really enjoyed working with you on this. If you know of anyone looking to buy, sell, or rent — I'd be grateful for the intro. Just a mention of my name works!\n\nThanks again for trusting me. 😊\n{{sender_name}}`,
  },
  {
    id: 'p26', category: 'Seller Updates', title: 'Listing Is Live',
    body: `Hi {{client_name}}, great news — your property is now live on the listings! 🎉\n\nI'll be monitoring enquiries closely and will keep you updated on any viewings or serious interest.\n\nFingers crossed for a quick and strong outcome! 🤞\n{{sender_name}}`,
  },
  {
    id: 'p27', category: 'Seller Updates', title: 'Viewing Feedback for Seller',
    body: `Hi {{client_name}}, just a quick update after today's viewing.\n\nThe buyer seemed interested but had a few questions. I'll keep the conversation going and update you once I have clearer feedback.\n\nStay tuned! 😊\n{{sender_name}}`,
  },
  {
    id: 'p7', category: 'New Project Updates', title: 'New Launch Alert',
    body: `Hi {{client_name}}, good {{day_period}}!\n\nJust wanted to flag an exciting new development that just launched. Based on what you've told me before, I think this might be of interest to you.\n\nWould you like me to send over more details? Happy to walk you through it anytime. 😊`,
  },
  {
    id: 'p28', category: 'New Project Updates', title: 'Price List & Floor Plans Out',
    body: `Hi {{client_name}}, good {{day_period}}! The price list and floor plans for the new launch are now out.\n\nI've gone through them — there are some units I think match what you're looking for. Would you like me to walk you through the options?\n\nHappy to meet up or do a quick call anytime this week. 😊\n{{sender_name}}`,
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
  {
    id: 'p29', category: 'Birthday & Festive', title: 'Deepavali',
    body: `Hi {{client_name}}, wishing you and your family a very Happy Deepavali! 🪔\n\nMay the Festival of Lights bring joy, warmth, and good fortune to you and your loved ones.\n\nTake care! {{sender_name}}`,
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

'use client'

import type { CSSProperties, ReactNode } from 'react'
import {
  Phone, MessageCircle, MoreHorizontal, Calendar, Bell,
  Building2, Home, Compass, Flame, CircleDollarSign,
  type LucideIcon,
} from 'lucide-react'
import type { Lead, LeadStatus, LeadSource, ClientType, LeadGrade } from '@/types'
import { formatCurrency, formatDate, toTitleCase } from '@/utils/format'
import { whatsAppUrl } from '@/utils/whatsapp'
import { logActivity } from '@/lib/activity'
import { cn } from '@/utils/cn'

export type CardDensity = 'comfortable' | 'compact'

// Single source of truth for pipeline stages; `hue` drives every pastel pill.
export const LEAD_STATUSES: { id: LeadStatus; label: string; hue: number }[] = [
  { id: 'New',         label: 'New',         hue: 235 },
  { id: 'Contacted',   label: 'Contacted',   hue: 280 },
  { id: 'Qualified',   label: 'Qualified',   hue: 200 },
  { id: 'Negotiating', label: 'Negotiating', hue: 45 },
  { id: 'Won',         label: 'Won',         hue: 142 },
  { id: 'Lost',        label: 'Lost',        hue: 350 },
]

const SOURCE_HUE: Record<LeadSource, number> = {
  'Cold Call': 280,
  'Doorknock': 320,
  'Flyers / Mailers': 50,
  'Google PPC': 25,
  'Meta Ads': 235,
  'Referral': 142,
  'Roadshow': 10,
  'Walk-in': 175,
  'Website': 200,
  'Other': 220,
}

const CLIENT_TYPE_HUE: Record<ClientType, number> = { Hot: 355, Warm: 38, Cold: 205 }
const GRADE_HUE: Record<LeadGrade, number> = { A: 355, B: 38, C: 210 }

const PILL_TONE =
  'bg-[hsl(var(--h)_85%_91%)] text-[hsl(var(--h)_60%_28%)] dark:bg-[hsl(var(--h)_45%_22%)] dark:text-[hsl(var(--h)_85%_85%)]'

export function Pill({ hue, children, className }: { hue: number; children: ReactNode; className?: string }) {
  return (
    <span
      style={{ '--h': hue } as CSSProperties}
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11.5px] font-medium leading-4', PILL_TONE, className)}
    >
      {children}
    </span>
  )
}

function Avatar({ name, size }: { name: string; size: number }) {
  const hue = (name || 'x').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  return (
    <div
      style={{ '--h': hue, width: size, height: size, fontSize: Math.round(size * 0.46) } as CSSProperties}
      className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', PILL_TONE)}
    >
      {(name[0] ?? '?').toUpperCase()}
    </div>
  )
}

export function LeadCardContent({
  lead,
  userId,
  onEdit,
  density = 'comfortable',
  actionsAlwaysVisible = false,
}: {
  lead: Lead
  userId: string
  onEdit: (l: Lead) => void
  density?: CardDensity
  actionsAlwaysVisible?: boolean
}) {
  const handleCall = () => logActivity(userId, lead.id, 'Called')
  const handleWhatsApp = () => logActivity(userId, lead.id, 'Sent WhatsApp message')
  const waHref = whatsAppUrl(lead.whatsapp_number || lead.phone)

  const ip = actionsAlwaysVisible ? 'p-2.5' : 'p-1.5'
  const iz = actionsAlwaysVisible ? 16 : 13

  const actions = (
    <div
      className={cn(
        'items-center gap-0.5 flex-shrink-0 transition-opacity',
        actionsAlwaysVisible
          ? 'flex'
          : density === 'compact'
            ? 'hidden group-hover:flex focus-within:flex [@media(hover:none)]:flex'
            : 'absolute right-1.5 top-1/2 -translate-y-1/2 flex bg-card rounded opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100'
      )}
      onPointerDown={e => e.stopPropagation()}
    >
      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          onClick={handleCall}
          title="Call"
          className={cn(ip, 'rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground')}
        >
          <Phone size={iz} />
        </a>
      )}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsApp}
          title="WhatsApp"
          className={cn(ip, 'rounded hover:bg-green-100 dark:hover:bg-green-950 transition-colors text-green-700 dark:text-green-400')}
        >
          <MessageCircle size={iz} />
        </a>
      )}
      <button
        onClick={() => onEdit(lead)}
        title="Open lead"
        className={cn(ip, 'rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground')}
      >
        <MoreHorizontal size={iz} />
      </button>
    </div>
  )

  const gradeBadge = lead.grade && (
    <Pill hue={GRADE_HUE[lead.grade]} className="font-bold flex-shrink-0">{lead.grade}</Pill>
  )

  const shell = 'group bg-card border border-border rounded-md transition-colors hover:border-foreground/25'

  if (density === 'compact') {
    return (
      <div className={cn(shell, 'pl-2.5 pr-1 py-1.5 flex items-center gap-2')}>
        <Avatar name={lead.name} size={20} />
        <p className="text-[13px] font-semibold text-foreground truncate flex-1 min-w-0">{toTitleCase(lead.name)}</p>
        {lead.budget && (
          <span className={cn('text-[11.5px] text-muted-foreground flex-shrink-0', !actionsAlwaysVisible && 'group-hover:hidden [@media(hover:none)]:inline')}>
            {formatCurrency(lead.budget)}
          </span>
        )}
        {gradeBadge}
        {actions}
      </div>
    )
  }

  const rows: { key: string; Icon: LucideIcon; node: ReactNode }[] = []
  if (lead.project_interested) {
    rows.push({ key: 'project', Icon: Building2, node: <span className="truncate">{lead.project_interested}</span> })
  }
  if (lead.property_type) {
    rows.push({
      key: 'type',
      Icon: Home,
      node: <span className="truncate">{lead.property_type.split(',').map(t => t.trim()).join(', ')}</span>,
    })
  }
  if (lead.source) {
    rows.push({ key: 'source', Icon: Compass, node: <Pill hue={SOURCE_HUE[lead.source] ?? 220}>{lead.source}</Pill> })
  }
  if (lead.client_type) {
    rows.push({ key: 'client', Icon: Flame, node: <Pill hue={CLIENT_TYPE_HUE[lead.client_type]}>{lead.client_type}</Pill> })
  }
  if (lead.budget) {
    rows.push({ key: 'budget', Icon: CircleDollarSign, node: <span>{formatCurrency(lead.budget)}</span> })
  }
  if (lead.follow_up_date) {
    rows.push({ key: 'follow', Icon: Calendar, node: <span>{formatDate(lead.follow_up_date)}</span> })
  }
  if (lead.reminder_at) {
    rows.push({
      key: 'reminder',
      Icon: Bell,
      node: <span className="text-amber-600 dark:text-amber-400">{formatDate(lead.reminder_at)}</span>,
    })
  }
  if (rows.length === 0 && lead.phone) {
    rows.push({ key: 'phone', Icon: Phone, node: <span>{lead.phone}</span> })
  }

  return (
    <div className={shell}>
      <div className={cn('relative flex items-center gap-2 pl-3 pr-2 py-2', rows.length > 0 && 'border-b border-border')}>
        <Avatar name={lead.name} size={22} />
        <p className="text-[13px] font-semibold text-foreground truncate flex-1 min-w-0">{toTitleCase(lead.name)}</p>
        {gradeBadge}
        {actions}
      </div>
      {rows.length > 0 && (
        <div className="px-3 py-2.5 space-y-2">
          {rows.map(({ key, Icon, node }) => (
            <div key={key} className="flex items-center gap-2.5 text-[12px] text-foreground/90 min-w-0">
              <Icon size={13} className="text-muted-foreground flex-shrink-0" />
              {node}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

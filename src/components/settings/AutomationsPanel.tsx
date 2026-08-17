'use client'

import { useEffect, useState } from 'react'
import { Zap, Banknote, CalendarClock, BellRing, Bell, FileText } from 'lucide-react'
import type { AutomationSettings, LeadStatus } from '@/types'
import { getAutomationSettings, upsertAutomationSettings } from '@/lib/automations'
import { NumberInput } from '@/components/ui/NumberInput'
import { cn } from '@/utils/cn'

const STAGES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Negotiating', 'Won', 'Lost']

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function Row({
  icon, title, desc, on, onToggle, children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  on: boolean
  onToggle: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        <Toggle on={on} onChange={onToggle} />
      </div>
      {on && children && <div className="pl-11">{children}</div>}
    </div>
  )
}

export function AutomationsPanel({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAutomationSettings(userId).then(setSettings)
  }, [userId])

  const patch = async (fields: Partial<AutomationSettings>) => {
    if (!settings) return
    const next = { ...settings, ...fields }
    setSettings(next)
    setSaving(true)
    await upsertAutomationSettings(userId, fields)
    setSaving(false)
  }

  const toggleStage = (stage: LeadStatus) => {
    if (!settings) return
    const has = settings.notify_stages.includes(stage)
    const notify_stages = has ? settings.notify_stages.filter(s => s !== stage) : [...settings.notify_stages, stage]
    patch({ notify_stages })
  }

  if (!settings) {
    return <div className="text-sm text-muted-foreground py-6">Loading automations…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Automations</h2>
        </div>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Set up automatic actions for your leads pipeline. Toggle on what you need.
      </p>

      <div className="space-y-3">
        <p className="section-label">On Lead Creation</p>

        <Row
          icon={<Banknote size={15} />}
          title="Auto-set deal value"
          desc="Fill in a default budget when a new lead doesn't have one."
          on={settings.auto_set_deal_value}
          onToggle={v => patch({ auto_set_deal_value: v })}
        >
          <NumberInput
            label="Default budget (SGD)"
            value={settings.default_deal_value ? String(settings.default_deal_value) : ''}
            onChange={raw => patch({ default_deal_value: raw ? parseInt(raw) : null })}
            placeholder="500,000"
          />
        </Row>

        <Row
          icon={<CalendarClock size={15} />}
          title="Due date auto-set"
          desc="Automatically set an expected follow-up date when creating leads."
          on={settings.auto_set_due_date}
          onToggle={v => patch({ auto_set_due_date: v })}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={settings.due_date_days_offset}
              onChange={e => patch({ due_date_days_offset: parseInt(e.target.value) || 1 })}
              className="w-16 h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">days from creation</span>
          </div>
        </Row>

        <Row
          icon={<BellRing size={15} />}
          title="Auto-reminder"
          desc="Automatically add a follow-up reminder when creating leads."
          on={settings.auto_reminder}
          onToggle={v => patch({ auto_reminder: v })}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={settings.reminder_days_offset}
              onChange={e => patch({ reminder_days_offset: parseInt(e.target.value) || 1 })}
              className="w-16 h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">days from creation</span>
          </div>
        </Row>
      </div>

      <div className="space-y-3">
        <p className="section-label">On Stage Change</p>

        <Row
          icon={<Bell size={15} />}
          title="Stage notification"
          desc="Get a browser notification when a lead moves to a specific stage."
          on={settings.stage_notification}
          onToggle={v => patch({ stage_notification: v })}
        >
          <div className="flex flex-wrap gap-2">
            {STAGES.map(stage => (
              <button
                key={stage}
                type="button"
                onClick={() => toggleStage(stage)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium border-2 transition-colors',
                  settings.notify_stages.includes(stage)
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                )}
              >
                {stage}
              </button>
            ))}
          </div>
        </Row>

        <Row
          icon={<FileText size={15} />}
          title="Auto-create activity"
          desc={'Automatically log a "Stage changed" activity when leads move between stages.'}
          on={settings.auto_create_activity}
          onToggle={v => patch({ auto_create_activity: v })}
        />
      </div>
    </div>
  )
}

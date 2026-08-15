'use client'

import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import type { Profile } from '@/types'
import { getProfile, upsertProfile } from '@/lib/profile'
import { Input } from '@/components/ui/Input'

export function AgentProfilePanel({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProfile(userId).then(setProfile)
  }, [userId])

  const patch = async (fields: Partial<Profile>) => {
    if (!profile) return
    const next = { ...profile, ...fields }
    setProfile(next)
    setSaving(true)
    await upsertProfile(userId, fields)
    setSaving(false)
  }

  if (!profile) {
    return <div className="text-sm text-muted-foreground py-6">Loading profile…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Agent Profile</h2>
        </div>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Shown on your public share pages (listing links you send to clients).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Display name"
          value={profile.display_name}
          onChange={e => setProfile({ ...profile, display_name: e.target.value })}
          onBlur={() => patch({ display_name: profile.display_name })}
        />
        <Input
          label="Agency"
          value={profile.agency_name}
          onChange={e => setProfile({ ...profile, agency_name: e.target.value })}
          onBlur={() => patch({ agency_name: profile.agency_name })}
        />
        <Input
          label="CEA Registration No."
          value={profile.cea_reg_no ?? ''}
          onChange={e => setProfile({ ...profile, cea_reg_no: e.target.value })}
          onBlur={() => patch({ cea_reg_no: profile.cea_reg_no || null })}
          placeholder="R0XXXXXX"
        />
        <Input
          label="WhatsApp number"
          value={profile.whatsapp_number ?? ''}
          onChange={e => setProfile({ ...profile, whatsapp_number: e.target.value })}
          onBlur={() => patch({ whatsapp_number: profile.whatsapp_number || null })}
          placeholder="6590039987"
        />
      </div>
    </div>
  )
}

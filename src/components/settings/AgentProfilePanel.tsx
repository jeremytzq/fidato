'use client'

import { useEffect, useState } from 'react'
import { User, Check } from 'lucide-react'
import type { Profile } from '@/types'
import { getProfile, upsertProfile } from '@/lib/profile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type ProfileForm = Pick<Profile, 'display_name' | 'agency_name' | 'cea_reg_no' | 'whatsapp_number'>

function toForm(profile: Profile): ProfileForm {
  return {
    display_name: profile.display_name,
    agency_name: profile.agency_name,
    cea_reg_no: profile.cea_reg_no,
    whatsapp_number: profile.whatsapp_number,
  }
}

export function AgentProfilePanel({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    getProfile(userId).then(p => {
      setProfile(p)
      setForm(toForm(p))
    })
  }, [userId])

  if (!profile || !form) {
    return <div className="text-sm text-muted-foreground py-6">Loading profile…</div>
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(profile))

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => f && { ...f, [k]: e.target.value })

  const handleSave = async () => {
    setSaving(true)
    const patch = {
      ...form,
      cea_reg_no: form.cea_reg_no || null,
      whatsapp_number: form.whatsapp_number || null,
    }
    await upsertProfile(userId, patch)
    setProfile(p => p && { ...p, ...patch })
    setSaving(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Agent Profile</h2>
        </div>
        {justSaved && !dirty && (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <Check size={13} /> Saved
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Shown on your public share pages (listing links you send to clients).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Display name" value={form.display_name} onChange={set('display_name')} />
        <Input label="Agency" value={form.agency_name} onChange={set('agency_name')} />
        <Input
          label="CEA Registration No."
          value={form.cea_reg_no ?? ''}
          onChange={set('cea_reg_no')}
          placeholder="R0XXXXXX"
        />
        <Input
          label="WhatsApp number"
          value={form.whatsapp_number ?? ''}
          onChange={set('whatsapp_number')}
          placeholder="6590039987"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {dirty && !saving && <span className="text-xs text-muted-foreground">You have unsaved changes</span>}
      </div>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Lead } from '@/types'
import { formatDate } from '@/utils/format'

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Leads</CardTitle>
        <span className="text-xs text-muted-foreground">{leads.length} total</span>
      </CardHeader>
      <div className="space-y-3">
        {leads.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No leads yet. Add your first lead!</p>
        )}
        {leads.map((lead, i) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-default"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
              {lead.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
              <p className="text-xs text-muted-foreground">
                {lead.property_type || 'Property'} · {lead.budget ? `$${(lead.budget / 1000).toFixed(0)}k` : 'Budget TBD'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge label={lead.status} />
              <span className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

interface SourceData {
  source: string
  total: number
  converted: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const total = payload.find((p: any) => p.dataKey === 'total')?.value ?? 0
  const converted = payload.find((p: any) => p.dataKey === 'converted')?.value ?? 0
  const rate = total > 0 ? Math.round((converted / total) * 100) : 0
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[hsl(235,75%,60%)]" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[hsl(142,71%,45%)]" />
          <span className="text-muted-foreground">Converted:</span>
          <span className="font-medium">{converted} ({rate}%)</span>
        </div>
      </div>
    </div>
  )
}

export function LeadSourceChart({ data }: { data: SourceData[] }) {
  const totalLeads = data.reduce((s, d) => s + d.total, 0)
  const totalConverted = data.reduce((s, d) => s + d.converted, 0)
  const overallRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Conversions by Source</CardTitle>
        <span className="text-xs text-muted-foreground">
          {totalConverted} won out of {totalLeads} lead{totalLeads !== 1 ? 's' : ''} · {overallRate}% overall conversion
        </span>
      </CardHeader>
      <div className="h-52">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No leads yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="source"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => value === 'total' ? 'Total Leads' : 'Converted'}
              />
              <Bar dataKey="total" name="total" fill="hsl(235, 75%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="converted" name="converted" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

const COLORS = [
  'hsl(235, 75%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 75%, 55%)',
]

interface SourceCount {
  source: string
  count: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function LeadSourceChart({ data }: { data: SourceCount[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads by Source</CardTitle>
        <span className="text-xs text-muted-foreground">All time</span>
      </CardHeader>
      <div className="h-48">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No leads yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

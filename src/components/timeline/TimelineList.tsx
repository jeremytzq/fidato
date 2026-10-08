import type { TimelineEvent } from '@/lib/timeline'

function formatWhen(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function TimelineList({ events, empty }: { events: TimelineEvent[]; empty?: string }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty || 'No activity yet.'}</p>
  }

  return (
    <div>
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center w-5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
            {index < events.length - 1 && <div className="w-px flex-1 bg-border mt-1.5" />}
          </div>
          <div className="flex justify-between items-baseline gap-4 flex-1 pb-4 min-w-0">
            <span className="text-sm font-medium text-foreground leading-snug">{event.label}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{formatWhen(event.at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

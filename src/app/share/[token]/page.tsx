import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('share_links').select('title, message').eq('token', params.token).maybeSingle()
  return {
    title: data?.title || 'Jeremy Tan Real Estate',
    description: data?.message?.slice(0, 160) || 'Shared by Jeremy Tan, PropNex Realty.',
  }
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = getSupabase()
  const { data: link } = await supabase
    .from('share_links').select('*').eq('token', params.token).maybeSingle()

  if (!link) notFound()

  // Log the view
  const hdrs = headers()
  await supabase.rpc('log_share_link_view', {
    p_token: params.token,
    p_user_agent: hdrs.get('user-agent'),
    p_ip: hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4" style={{ background: '#f8f9fa' }}>
      <div className="w-full max-w-sm space-y-4">

        {/* Agent badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Jeremy Tan · PropNex Realty
          </span>
        </div>

        {/* Image */}
        {link.media_url && (
          <div className="rounded-2xl overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={link.media_url} alt={link.title || 'Property'} className="w-full object-cover" />
          </div>
        )}

        {/* Content */}
        {(link.title || link.message) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2">
            {link.title && <h1 className="text-lg font-bold text-gray-900">{link.title}</h1>}
            {link.message && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{link.message}</p>
            )}
          </div>
        )}

        {/* Agent contact card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            J
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Jeremy Tan</p>
            <p className="text-xs text-gray-500">PropNex Realty · CEA Reg No.</p>
          </div>
          <a
            href="https://wa.me/6590039987"
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ background: '#25D366' }}
          >
            WhatsApp
          </a>
        </div>

        <p className="text-center text-[10px] text-gray-400">Powered by Fidato Labs</p>
      </div>
    </div>
  )
}

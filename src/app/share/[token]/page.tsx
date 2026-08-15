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
    .from('share_links').select('title, message, user_id').eq('token', params.token).maybeSingle()

  let agentName = 'Jeremy Tan'
  let agencyName = 'PropNex Realty'
  if (data?.user_id) {
    const { data: profile } = await supabase
      .from('profiles').select('display_name, agency_name').eq('user_id', data.user_id).maybeSingle()
    agentName = profile?.display_name || agentName
    agencyName = profile?.agency_name || agencyName
  }

  return {
    title: data?.title || `${agentName} Real Estate`,
    description: data?.message?.slice(0, 160) || `Shared by ${agentName}, ${agencyName}.`,
  }
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = getSupabase()
  const { data: link } = await supabase
    .from('share_links').select('*').eq('token', params.token).maybeSingle()

  if (!link) notFound()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('user_id', link.user_id).maybeSingle()

  const agentName = profile?.display_name || 'Jeremy Tan'
  const agencyName = profile?.agency_name || 'PropNex Realty'
  const ceaRegNo = profile?.cea_reg_no
  const whatsappNumber = profile?.whatsapp_number || '6590039987'
  const agentInitial = agentName.trim().charAt(0).toUpperCase() || 'J'

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
            {agentName} · {agencyName}
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
            {agentInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{agentName}</p>
            <p className="text-xs text-gray-500">
              {agencyName}{ceaRegNo ? ` · CEA Reg No. ${ceaRegNo}` : ''}
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
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

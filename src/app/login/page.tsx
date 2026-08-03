'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(222, 47%, 11%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'hsl(235, 75%, 60%)' }}>
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-white text-2xl font-semibold tracking-tight">Fidato Labs</span>
          </div>
          <p className="text-sm" style={{ color: 'hsl(220, 14%, 60%)' }}>
            Your trusted real estate CRM
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'hsl(222, 40%, 15%)', border: '1px solid hsl(222, 40%, 22%)' }}>
          <h1 className="text-white text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm mb-8" style={{ color: 'hsl(220, 14%, 60%)' }}>
            Sign in to access your dashboard
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all"
            style={{
              background: loading ? 'hsl(220, 14%, 25%)' : 'white',
              color: loading ? 'hsl(220, 14%, 60%)' : 'hsl(222, 47%, 11%)',
            }}
          >
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </motion.button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'hsl(220, 14%, 45%)' }}>
          By signing in, you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  )
}

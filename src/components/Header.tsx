'use client'

import { Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SignOutButton } from './auth/AuthButtons'
import { User, LogIn } from 'lucide-react'

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const currentUser = useQuery(api.users.getCurrentUser)

  return (
    <header className="p-4 flex items-center justify-between bg-slate-800 text-white shadow-lg">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          TUSMO
        </span>
      </Link>

      {/* Auth section */}
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
        ) : isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-full">
              <User className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white font-medium">
                {currentUser?.username || currentUser?.name || 'Joueur'}
              </span>
            </div>
            <SignOutButton />
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors font-medium"
          >
            <LogIn className="w-4 h-4" />
            <span>Connexion</span>
          </Link>
        )}
      </div>
    </header>
  )
}


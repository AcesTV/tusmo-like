'use client'

import { Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SignOutButton } from './auth/AuthButtons'
import { User, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
            <Button variant="ghost" asChild className="flex items-center gap-2">
              <Link to="/profile">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={currentUser?.image} />
                  <AvatarFallback className="bg-green-500 text-white text-xs">
                    {(currentUser?.username ||
                      currentUser?.name ||
                      'J')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {currentUser?.username || currentUser?.name || 'Joueur'}
                </span>
              </Link>
            </Button>
            <SignOutButton />
          </div>
        ) : (
          <Button asChild>
            <Link to="/login">
              <LogIn className="w-4 h-4 mr-2" />
              Connexion
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}

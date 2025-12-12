'use client'

import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ArrowLeft,
  User,
  Trophy,
  Flame,
  Calendar,
  Target,
  Gamepad2,
  TrendingUp,
  Award,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tusmo_playerId') || ''
}

function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const currentUser = useQuery(api.users.getCurrentUser)
  const [guestId, setGuestId] = useState<string>('')

  useEffect(() => {
    setGuestId(getGuestId())
  }, [])

  // Use the new persistent stats query
  const stats = useQuery(
    api.stats.getStats,
    guestId || isAuthenticated
      ? { odI: isAuthenticated ? undefined : guestId }
      : 'skip',
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const displayName = currentUser?.username || currentUser?.name || 'Joueur'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="p-4 flex items-center border-b border-slate-700">
        <Button
          variant="ghost"
          asChild
          className="text-gray-400 hover:text-white"
        >
          <Link to="/">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Link>
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={currentUser?.image} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-2xl">
              {currentUser?.image ? null : <User className="w-12 h-12" />}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold text-white mb-1">{displayName}</h1>
          {currentUser?.email && (
            <p className="text-sm text-gray-400">{currentUser.email}</p>
          )}
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 mt-2">
              Mode invité •{' '}
              <Link to="/login" className="text-violet-400 hover:underline">
                Se connecter
              </Link>{' '}
              pour sauvegarder
            </p>
          )}
        </div>

        {/* Stats Loading */}
        {!stats ? (
          <div className="text-center text-gray-400 py-12">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Aucune statistique disponible</p>
            <p className="text-sm mt-2">
              Jouez quelques parties pour voir vos stats !
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Win Streaks */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Séries de victoires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Daily Streak */}
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <span className="text-sm text-gray-400">Mot du Jour</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {stats.dailyWinStreak}
                      </span>
                      <span className="text-sm text-gray-500">actuelle</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Meilleure: {stats.dailyBestStreak} 🔥
                    </div>
                  </div>

                  {/* Suite Streak */}
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-400">
                        Suite du Jour
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {stats.suiteWinStreak}
                      </span>
                      <span className="text-sm text-gray-500">actuelle</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Meilleure: {stats.suiteBestStreak} 🔥
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Games Played */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-cyan-400" />
                  Parties jouées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Total */}
                <div className="bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                      <div>
                        <div className="text-sm text-gray-400">
                          Total parties
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {stats.totalGamesPlayed}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Mots trouvés</div>
                      <div className="text-2xl font-bold text-green-400">
                        {stats.totalWordsFound}
                      </div>
                    </div>
                  </div>
                </div>

                {/* By Mode */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <Calendar className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">
                      {stats.dailyGamesPlayed}
                    </div>
                    <div className="text-xs text-gray-400">Mot du Jour</div>
                    <div className="text-xs text-green-400 mt-1">
                      {stats.dailyWins} victoires
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">
                      {stats.suiteGamesPlayed}
                    </div>
                    <div className="text-xs text-gray-400">Suite du Jour</div>
                    <div className="text-xs text-green-400 mt-1">
                      {stats.suiteWins} victoires
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <Target className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <div className="text-xl font-bold text-white">
                      {stats.freeGamesPlayed}
                    </div>
                    <div className="text-xs text-gray-400">Partie Libre</div>
                    <div className="text-xs text-green-400 mt-1">
                      {stats.freeWins} victoires
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement teaser */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="pt-6 text-center">
                <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-gray-500 font-medium">Succès</h3>
                <p className="text-sm text-gray-600">Bientôt disponible...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

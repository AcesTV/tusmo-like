import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Calendar, Flame, Dices, Users } from 'lucide-react'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const dailyInfo = useQuery(api.games.getDailyInfo)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <section className="relative py-12 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              TUSMO
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Devinez le mot mystère en 6 essais maximum
          </p>
        </div>
      </section>

      {/* Game modes */}
      <section className="py-8 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mot du Jour */}
          <Link
            to="/game/$mode"
            params={{ mode: 'daily' }}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-violet-500/20 rounded-xl">
                <Calendar className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Mot du Jour</h3>
                <p className="text-sm text-gray-400">
                  {dailyInfo?.daily.length ?? '?'} lettres
                </p>
              </div>
            </div>
            <p className="text-gray-400">
              Un nouveau mot chaque jour. Comparez vos scores!
            </p>
          </Link>

          {/* Suite du Jour */}
          <Link
            to="/game/$mode"
            params={{ mode: 'suite' }}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Suite du Jour</h3>
                <p className="text-sm text-gray-400">
                  {dailyInfo?.suite.totalWords ?? 5} mots à découvrir
                </p>
              </div>
            </div>
            <p className="text-gray-400">
              Enchaînez les mots de 4 à 8 lettres!
            </p>
          </Link>

          {/* Partie Libre */}
          <Link
            to="/game/$mode"
            params={{ mode: 'free' }}
            className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Dices className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Partie Libre</h3>
                <p className="text-sm text-gray-400">Entraînez-vous</p>
              </div>
            </div>
            <p className="text-gray-400">
              Jouez autant que vous voulez avec des mots aléatoires.
            </p>
          </Link>

          {/* Multijoueur */}
          <Link
            to="/room"
            className="group bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-pink-500/50 transition-all hover:shadow-lg hover:shadow-pink-500/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <Users className="w-8 h-8 text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Multijoueur</h3>
                <p className="text-sm text-gray-400">Série de 4 mots</p>
              </div>
            </div>
            <p className="text-gray-400">
              Affrontez vos amis en temps réel!
            </p>
          </Link>
        </div>
      </section>

      {/* Rules */}
      <section className="py-8 px-6 max-w-3xl mx-auto">
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Comment jouer ?</h2>
          <div className="space-y-3 text-gray-400">
            <p>• Devinez le mot en <strong className="text-white">6 essais maximum</strong></p>
            <p>• La <strong className="text-white">première lettre</strong> vous est donnée</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">T</span>
              <span>Lettre correcte et bien placée</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">U</span>
              <span>Lettre correcte mais mal placée</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center text-white font-bold">X</span>
              <span>Lettre absente du mot</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

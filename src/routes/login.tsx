import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { GoogleLoginButton } from '@/components/auth/AuthButtons'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </Link>
      </header>

      {/* Login content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black mb-2">
              <span className="bg-linear-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                TUSMO
              </span>
            </h1>
            <p className="text-gray-400">
              Connectez-vous pour sauvegarder vos scores
            </p>
          </div>

          {/* Login card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white text-center mb-6">
              Connexion
            </h2>

            {isLoading ? (
              <div className="text-center text-gray-400">Chargement...</div>
            ) : (
              <div className="space-y-4">
                {/* Google */}
                <div className="flex justify-center">
                  <GoogleLoginButton />
                </div>

                {/* Divider for future auth methods */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-800/50 text-gray-400">
                      ou
                    </span>
                  </div>
                </div>

                {/* Placeholder for future auth methods */}
                <p className="text-center text-sm text-gray-500">
                  D'autres méthodes de connexion bientôt disponibles
                </p>
              </div>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </main>
    </div>
  )
}

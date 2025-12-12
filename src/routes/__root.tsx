import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { AppWrapper } from '../components/AppWrapper'

import ConvexProvider from '../integrations/convex/provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TUSMO - Devinez le mot mystère',
      },
      {
        name: 'description',
        content:
          'Jeu de devinettes de mots en français. Trouvez le mot mystère en 6 essais maximum !',
      },
      {
        name: 'theme-color',
        content: '#0f172a',
      },
      // Open Graph (Facebook, Discord, etc.)
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'TUSMO - Devinez le mot mystère',
      },
      {
        property: 'og:description',
        content:
          'Jeu de devinettes de mots en français. Trouvez le mot mystère en 6 essais maximum ! Mode quotidien, suite du jour, partie libre et multijoueur.',
      },
      {
        property: 'og:image',
        content: '/og-image.png',
      },
      {
        property: 'og:locale',
        content: 'fr_FR',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'TUSMO - Devinez le mot mystère',
      },
      {
        name: 'twitter:description',
        content:
          'Jeu de devinettes de mots en français. Trouvez le mot mystère en 6 essais maximum !',
      },
      {
        name: 'twitter:image',
        content: '/og-image.png',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider>
          <AppWrapper>{children}</AppWrapper>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}

'use client'

import { useState } from 'react'
import { useConvexAuth } from 'convex/react'
import { UsernameModal, useNeedsUsername } from './auth/UsernameModal'

interface AppWrapperProps {
    children: React.ReactNode
}

export function AppWrapper({ children }: AppWrapperProps) {
    const { isAuthenticated } = useConvexAuth()
    const { loading, needsUsername } = useNeedsUsername()
    const [dismissed, setDismissed] = useState(false)

    // Show username modal if user is authenticated but has no username
    const showUsernameModal = isAuthenticated && !loading && needsUsername && !dismissed

    return (
        <>
            {children}
            {showUsernameModal && (
                <UsernameModal onComplete={() => setDismissed(true)} />
            )}
        </>
    )
}

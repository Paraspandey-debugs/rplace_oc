import Head from 'next/head'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Canvas from '../components/Canvas'

// Home page component for the OpenCode IIITA Pixel Canvas app
export default function Home() {
  // Get the current user session from NextAuth
  const { data: session } = useSession()
  // State for user statistics (pixels placed, cooldown)
  const [userStats, setUserStats] = useState<any>(null)

  // Fetch user stats when session is available
  useEffect(() => {
    if (session) {
      fetch('/api/me').then(r => r.json()).then(data => setUserStats(data))
    }
  }, [session])

  return (
    <div>
      {/* Set page title */}
      <Head>
        <title>r/place</title>
      </Head>

      {/* Main content container with centered layout */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, fontFamily: 'Press Start 2P', imageRendering: 'pixelated' }}>
        {/* Navigation bar with title and authentication info */}
        <nav style={{ width: '100%', maxWidth: '1200px', background: 'rgba(0,0,0,0.8)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #aa0066', boxShadow: '0 0 10px rgba(170, 0, 102, 0.5)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>OpenCode IIITA - Pixel Canvas</h1>
            <Link href="/help" style={{ fontSize: '12px', color: '#ffffff', textDecoration: 'none' }}>Help</Link>
          </div>
          <div>
            {/* Show sign out option if user is signed in */}
            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: '8px', color: '#ffffff', margin: 0 }}>Signed in as {session.user?.name}</p>
                {/* Display user stats if available */}
                {userStats && (
                  <p style={{ fontSize: '8px', color: '#ffffff', margin: 0 }}>Pixels: {userStats.pixels} • Points: {userStats.points} • Daily: {userStats.dailyPixelsUsed}/{userStats.allowedPixels} • Cooldown: {userStats.cooldownSeconds}s</p>
                )}
                <button onClick={() => signOut()} style={{
                  background: '#7c7c7c',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontSize: '8px',
                  cursor: 'pointer',
                  imageRendering: 'pixelated',
                  fontFamily: 'Press Start 2P',
                  boxShadow: '2px 2px 0 #000000'
                }}>Sign out</button>
              </div>
            ) : (
              /* Show sign in option if user is not signed in */
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: '8px', color: '#ffffff', margin: 0 }}>You are not signed in</p>
                <button onClick={() => signIn('github')} style={{
                  background: '#7c7c7c',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontSize: '8px',
                  cursor: 'pointer',
                  imageRendering: 'pixelated',
                  fontFamily: 'Press Start 2P',
                  boxShadow: '2px 2px 0 #000000'
                }}>Sign in with GitHub</button>
              </div>
            )}
          </div>
        </nav>

        {/* Main canvas component for pixel painting */}
        <Canvas session={session} />
      </main>
    </div>
  )
}

import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import ErrorBoundary from '../components/ErrorBoundary'
import Head from 'next/head'

// App component wrapper for the entire Next.js application
export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      {/* Load pixel font for retro theme */}
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Head>

      {/* Full-screen video background for cyberpunk theme */}
      <video
        autoPlay
        loop
        muted
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      >
        <source src="/40hky6grsgy61.mp4" type="video/mp4" />
      </video>

      {/* Error boundary to catch and display React errors */}
      <ErrorBoundary>
        {/* NextAuth session provider for authentication state */}
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </ErrorBoundary>
    </>
  )
}

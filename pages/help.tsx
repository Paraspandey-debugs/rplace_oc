import Head from 'next/head'
import Link from 'next/link'

export default function Help() {
  return (
    <div style={{ padding: 20, fontFamily: 'Press Start 2P', imageRendering: 'pixelated', maxWidth: '800px', margin: '0 auto' }}>
      <Head>
        <title>Help - r/place</title>
      </Head>
      <h1>Help & Tutorials</h1>
      <h2>How to Play</h2>
      <p>Place pixels on the canvas to create art. Earn points for each pixel, which give you more daily placements.</p>
      <h2>Alliances</h2>
      <p>Join or create alliances to collaborate with others. Claim areas and compete for control.</p>
      <h2>Tools</h2>
      <ul>
        <li>Pencil: Single pixel placement</li>
        <li>Eraser: Remove pixels</li>
        <li>Fill: Fill areas with color</li>
      </ul>
      <Link href="/">Back to Canvas</Link>
    </div>
  )
}
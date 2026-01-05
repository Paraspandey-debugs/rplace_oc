import React from 'react'

// Default color palette
const DEFAULT_COLORS = ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff']

// Generate extended palette using HSL for more color variety
function generatePalette(): string[] {
  const out: string[] = []
  const sats = [100, 75, 50]
  for (let s of sats) {
    for (let h = 0; h < 360; h += 15) {
      out.push(`hsl(${h} ${s}% 50%)`)
    }
  }
  return out
}

// Convert HSL string to hex color
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+) (\d+)% (\d+)%\)/);
  if (!match) return hsl; // If not HSL, return as is (for hex)
  const h = parseInt(match[1]);
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const EXTENDED_PALETTE = generatePalette()

interface ColorPaletteProps {
  color: string
  setColor: (color: string) => void
}

export default function ColorPalette({ color, setColor }: ColorPaletteProps) {
  return (
    <>
      {/* Color palette */}
      <div className="palette">
        {/* Default colors */}
        {DEFAULT_COLORS.map((c) => (
          <div key={c} className="palette-color" style={{ background: c }} onClick={() => setColor(c)} />
        ))}
        <div style={{ width:8 }} />
        {/* Custom color picker */}
        <input aria-label="color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>

      {/* Extended palette */}
      <div style={{ marginLeft: 12, display: 'flex', gap:6, alignItems:'center' }}>
        <div style={{ fontSize:12, marginRight:8 }}>Palette</div>
        <div style={{ display:'flex', flexWrap:'wrap', maxWidth:360, gap:6 }}>
          {EXTENDED_PALETTE.slice(0, 24).map((c, idx) => (
            <div key={idx} title={c} className="palette-color" style={{ background: c }} onClick={() => setColor(hslToHex(c))} />
          ))}
        </div>
      </div>
    </>
  )
}
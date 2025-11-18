#!/usr/bin/env node
// Simple bot to paint an image onto the canvas by calling /api/place sequentially.
// Usage: node scripts/run_bot.js --image ./img.png --api http://localhost:3000/api/place --cookie "next-auth.session-token=..." --delay 500 --grid 20 --canvasWidth 1600

const Jimp = require('jimp')
const axios = require('axios')

function parseArgs() {
  const args = {}
  const raw = process.argv.slice(2)
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = raw[i+1] && !raw[i+1].startsWith('--') ? raw[++i] : true
      args[key] = val
    }
  }
  return args
}

function rgbaToHex(r,g,b){
  const to = (v) => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')
  return `#${to(r)}${to(g)}${to(b)}`
}

async function main(){
  const argv = parseArgs()
  if (!argv.image) {
    console.error('Missing --image <path>')
    process.exit(1)
  }
  const apiUrl = argv.api || 'http://localhost:3000/api/place'
  const cookie = argv.cookie || argv.auth || ''
  const botKey = argv.botKey || argv.bot || ''
  const delayMs = Number(argv.delay || 50)
  const GRID = Number(argv.grid || 1)
  const concurrency = Number(argv.concurrency || argv.c || 4)
  const limit = argv.limit ? Number(argv.limit) : Infinity
  const canvasWidth = Number(argv.canvasWidth || 1600)
  const canvasHeight = Number(argv.canvasHeight || 1000)
  const tx = Number(argv.tx || 0)
  const ty = Number(argv.ty || 0)
  const randomize = argv.random === 'true' || argv.random === true

  const img = await Jimp.read(argv.image)
  console.log('Loaded image', argv.image, img.bitmap.width, 'x', img.bitmap.height)

  // Determine expected cells
  const cols = Math.floor(canvasWidth / GRID)
  const rows = Math.floor(canvasHeight / GRID)
  if (img.bitmap.width !== cols || img.bitmap.height !== rows) {
    console.warn(`Warning: image size ${img.bitmap.width}x${img.bitmap.height} does not match canvas cells ${cols}x${rows}. Proceeding but mapping may be off.`)
  }

  const placements = []
  for (let y = 0; y < img.bitmap.height; y++){
    for (let x = 0; x < img.bitmap.width; x++){
      const idx = (y * img.bitmap.width + x) * 4
      const r = img.bitmap.data[idx]
      const g = img.bitmap.data[idx+1]
      const b = img.bitmap.data[idx+2]
      const a = img.bitmap.data[idx+3]
      if (a === 0) continue // skip transparent
      const color = rgbaToHex(r,g,b)
      placements.push({x, y, color})
    }
  }

  if (randomize) {
    for (let i = placements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = placements[i]
      placements[i] = placements[j]
      placements[j] = tmp
    }
  }

  console.log('Total placements to attempt:', placements.length)

  let succeeded = 0
  let attempted = 0
  const iterator = placements[Symbol.iterator]()

  async function worker(id) {
    while (attempted < placements.length && attempted < limit) {
      const i = attempted
      attempted++
      const next = iterator.next()
      if (next.done) break
      const p = next.value
      const payload = { x: p.x, y: p.y, color: p.color }
      try {
        const headers = {}
        if (cookie) headers['Cookie'] = cookie
        if (botKey) {
          headers['x-bot-key'] = botKey
          headers['authorization'] = `Bearer ${botKey}`
        }
        const res = await axios.post(apiUrl, payload, { headers, timeout: 10000 })
        if (res && res.data && res.data.ok) {
          succeeded++
        } else {
          console.warn('Place failed for', payload, res && res.data)
        }
      } catch (err) {
        console.warn('Request error for', payload, (err && err.message) || err)
      }
      if ((i+1) % 50 === 0) console.log(`Progress ${i+1}/${placements.length} (succeeded ${succeeded})`)
      // rate control per worker
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  // start N workers
  const workers = []
  for (let w = 0; w < concurrency; w++) workers.push(worker(w))
  await Promise.all(workers)

  console.log('Done. attempted:', Math.min(placements.length, limit), 'succeeded (approx):', succeeded)
}

main().catch(err=>{
  console.error('Bot error', err)
  process.exit(1)
})

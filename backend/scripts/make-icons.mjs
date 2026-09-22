// Generates admin PWA icons with zero dependencies (Node built-ins only).
// Run: `node scripts/make-icons.mjs` → writes backend/assets/*.png
// Art: deep-teal rounded square + white medical cross.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'assets')

const TEAL = [29, 92, 82, 255]
const WHITE = [255, 255, 255, 255]

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function toPng(size, rgba) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y += 1) {
    raw[y * (1 + size * 4)] = 0 // filter: None
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// Signed distance to a rounded box centered at (cx,cy) with half-size (hx,hy), radius r.
function sdRoundBox(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - (hx - r)
  const qy = Math.abs(py - cy) - (hy - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

function drawIcon(size, { fullBleed = false, crossScale = 1 } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const c = size / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      let color = null
      if (fullBleed) {
        color = TEAL
      } else {
        const dBg = sdRoundBox(px, py, c, c, size / 2, size / 2, size * 0.225)
        if (dBg <= 0) color = TEAL
      }
      if (color) {
        // White medical cross: two rounded bars.
        const arm = size * 0.27 * crossScale
        const half = size * 0.105 * crossScale
        const r = size * 0.05 * crossScale
        const dH = sdRoundBox(px, py, c, c, arm, half, r)
        const dV = sdRoundBox(px, py, c, c, half, arm, r)
        if (Math.min(dH, dV) <= 0) color = WHITE
      }
      if (color) {
        const o = (y * size + x) * 4
        buf[o] = color[0]; buf[o + 1] = color[1]; buf[o + 2] = color[2]; buf[o + 3] = color[3]
      }
    }
  }
  return buf
}

mkdirSync(outDir, { recursive: true })
const outputs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-512.png', 512, { fullBleed: true, crossScale: 0.62 }],
]
for (const [name, size, opts] of outputs) {
  const png = toPng(size, drawIcon(size, opts))
  writeFileSync(join(outDir, name), png)
  // Verify: PNG signature + IHDR dimensions.
  const w = png.readUInt32BE(16)
  const h = png.readUInt32BE(20)
  if (w !== size || h !== size) throw new Error(`${name}: bad dimensions ${w}x${h}`)
  console.log(`✓ assets/${name} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`)
}

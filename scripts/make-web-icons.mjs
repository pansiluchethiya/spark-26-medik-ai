// Regenerates public web icons (zero deps). Run: `node scripts/make-web-icons.mjs`
// Design: lighter-green rounded square, off-white medical cross,
// hairline darker outline just inside the edge.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

// Design: darker-green rounded square, white medical cross,
// hairline lighter outline just inside the edge.
const BG = [29, 92, 82, 255] // deep teal #1d5c52
const PLUS = [255, 255, 255, 255] // white #ffffff
const EDGE = [61, 184, 159, 255] // mint hairline #3db89f

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
    raw[y * (1 + size * 4)] = 0
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

function sdRoundBox(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - (hx - r)
  const qy = Math.abs(py - cy) - (hy - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

function blend(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255]
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const c = size / 2
  const hair = Math.max(1.5, size * 0.008)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      const dBg = sdRoundBox(px, py, c, c, size / 2, size / 2, size * 0.225)
      if (dBg > 0) continue // transparent corners
      let color = BG
      // Hairline darker outline hugging the inside edge.
      if (dBg > -hair) color = blend(BG, EDGE, 0.5)
      // Off-white medical cross: two rounded bars.
      const arm = size * 0.27
      const half = size * 0.105
      const r = size * 0.05
      const dH = sdRoundBox(px, py, c, c, arm, half, r)
      const dV = sdRoundBox(px, py, c, c, half, arm, r)
      if (Math.min(dH, dV) <= 0) color = PLUS
      const o = (y * size + x) * 4
      buf[o] = Math.round(color[0]); buf[o + 1] = Math.round(color[1])
      buf[o + 2] = Math.round(color[2]); buf[o + 3] = 255
    }
  }
  return buf
}

mkdirSync(outDir, { recursive: true })
for (const size of [192, 512]) {
  const name = `icon-${size}.png`
  const png = toPng(size, drawIcon(size))
  writeFileSync(join(outDir, name), png)
  if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) throw new Error(`${name}: bad dims`)
  console.log(`✓ public/icons/${name} (${(png.length / 1024).toFixed(1)} KB)`)
}

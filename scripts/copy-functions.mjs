import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const functionsSrc = join(repoRoot, 'functions')
const distDir = join(repoRoot, 'dist')
const functionsDist = join(distDir, 'functions')

if (existsSync(functionsSrc)) {
  mkdirSync(functionsDist, { recursive: true })
  cpSync(functionsSrc, functionsDist, { recursive: true, force: true })
  console.log('✓ Copied functions/ → dist/functions/')
} else {
  console.log('⚠ No functions/ directory found, skipping copy')
}

// Copy public/ assets that aren't handled by Vite
const publicDir = join(repoRoot, 'public')
const publicAssets = ['_routes.json', 'manifest.webmanifest', 'favicon.svg', 'service-worker.js']
for (const asset of publicAssets) {
  const src = join(publicDir, asset)
  if (existsSync(src)) {
    const dest = join(distDir, asset)
    cpSync(src, dest, { force: true })
    console.log(`✓ Copied ${asset} → dist/`)
  }
}

// Copy icons
const iconsSrc = join(publicDir, 'icons')
const iconsDist = join(distDir, 'icons')
if (existsSync(iconsSrc)) {
  mkdirSync(iconsDist, { recursive: true })
  cpSync(iconsSrc, iconsDist, { recursive: true, force: true })
  console.log('✓ Copied icons/ → dist/icons/')
}

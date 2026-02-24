#!/usr/bin/env node
/**
 * Set SPREADSHEET_ID in .clasp.json, rebuild, and push to GAS.
 * Usage: node scripts/set-sheet-id.mjs <spreadsheet-id>
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CLASP_JSON = join(ROOT, '.clasp.json')

const spreadsheetId = process.argv[2]
if (!spreadsheetId) {
  console.error('Usage: pnpm run setup:sheet <spreadsheet-id>')
  console.error('')
  console.error('Spreadsheet ID is in the URL:')
  console.error('https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit')
  process.exit(1)
}

// Save to .clasp.json
const config = JSON.parse(readFileSync(CLASP_JSON, 'utf-8'))
config.spreadsheetId = spreadsheetId
writeFileSync(CLASP_JSON, JSON.stringify(config, null, 4) + '\n', 'utf-8')
console.log(`✅ .clasp.json に保存: ${spreadsheetId}`)

// Build and push
console.log('\n📦 ビルド＆プッシュ中...')
execSync('node scripts/build.mjs', { cwd: ROOT, stdio: 'inherit' })
execSync('pnpm exec clasp push --force', { cwd: ROOT, stdio: 'inherit' })

console.log('\n✅ 完了！スプレッドシートIDがコードに埋め込まれました。')

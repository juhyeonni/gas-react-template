#!/usr/bin/env node
/**
 * Setup script: create a new GAS webapp project.
 * 1. Check/perform clasp login
 * 2. clasp create (standalone)
 * 3. Build
 * 4. clasp push (pushes appsscript.json with webapp config)
 * 5. clasp deploy
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import * as readline from 'readline'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CLASP_JSON = join(ROOT, '.clasp.json')

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function run(args, opts = {}) {
  return spawnSync('pnpm', ['exec', ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    ...opts,
  })
}

async function ensureLogin() {
  const check = run(['clasp', 'login', '--status'])
  const output = (check.stdout || '') + (check.stderr || '')
  if (output.includes('not logged in') || check.status !== 0) {
    console.log('📋 claspにログインしていません。ログインを開始します...\n')
    execSync('pnpm exec clasp login', { cwd: ROOT, stdio: 'inherit' })
    console.log('')
  } else {
    console.log('✅ clasp ログイン済み')
  }
}

async function main() {
  console.log('\n🚀 GAS + React Template Setup\n')

  // Check if already configured
  if (existsSync(CLASP_JSON)) {
    const config = JSON.parse(readFileSync(CLASP_JSON, 'utf-8'))
    if (config.scriptId && config.scriptId !== 'YOUR_SCRIPT_ID_HERE') {
      console.log(`⚠️  .clasp.json が既に存在します (scriptId: ${config.scriptId})`)
      const answer = await prompt('上書きして新しいプロジェクトを作成しますか？ (y/N): ')
      if (answer.toLowerCase() !== 'y') {
        console.log('キャンセルしました。')
        process.exit(0)
      }
      unlinkSync(CLASP_JSON)
    }
  }

  // 1. Login
  await ensureLogin()

  // 2. Get project title
  const title = (await prompt('プロジェクト名 (デフォルト: "GAS React App"): ')) || 'GAS React App'

  // 3. Create standalone script (appsscript.json provides webapp config)
  console.log(`\n📦 GASプロジェクトを作成中: "${title}"...`)
  const result = run(['clasp', 'create', '--title', title])

  if (result.status !== 0) {
    console.error('❌ プロジェクト作成に失敗しました:')
    process.stderr.write(result.stderr || '')
    process.stdout.write(result.stdout || '')
    process.exit(1)
  }
  process.stdout.write(result.stdout || '')

  // clasp create writes .clasp.json to cwd
  if (!existsSync(CLASP_JSON)) {
    console.error('❌ .clasp.json が作成されませんでした。')
    process.exit(1)
  }

  // 4. Set rootDir to build
  const config = JSON.parse(readFileSync(CLASP_JSON, 'utf-8'))
  config.rootDir = 'build'
  writeFileSync(CLASP_JSON, JSON.stringify(config, null, 4) + '\n', 'utf-8')
  console.log(`✅ プロジェクト作成完了 (scriptId: ${config.scriptId})`)

  // 5. Build
  console.log('\n📦 ビルド中...')
  execSync('node scripts/build.mjs', { cwd: ROOT, stdio: 'inherit' })

  // 6. Push (sends Code.gs + index.html + app.html + appsscript.json with webapp config)
  console.log('\n📦 GASにプッシュ中...')
  execSync('pnpm exec clasp push --force', { cwd: ROOT, stdio: 'inherit' })

  // 7. Deploy
  console.log('\n📦 デプロイ中...')
  const deployResult = run(['clasp', 'deploy', '--description', 'Initial deployment'])
  if (deployResult.status === 0) {
    process.stdout.write(deployResult.stdout || '')
    // Parse deployment ID
    const match = (deployResult.stdout || '').match(/^-\s+(\S+)\s+@/m)
    if (match) {
      config.deploymentIdDev = match[1]
      writeFileSync(CLASP_JSON, JSON.stringify(config, null, 4) + '\n', 'utf-8')
    }
  }

  const deployId = config.deploymentIdDev
  console.log('\n🎉 セットアップ完了！')
  console.log(`   エディタ:  https://script.google.com/d/${config.scriptId}/edit`)
  if (deployId) {
    console.log(`   Webアプリ: https://script.google.com/macros/s/${deployId}/exec`)
  }
  console.log(`\n   次のステップ:`)
  console.log(`   pnpm run deploy   # 再デプロイ`)
  console.log(`   pnpm exec clasp open  # エディタを開く`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

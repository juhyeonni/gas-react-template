#!/usr/bin/env node
/**
 * Build script for GAS + React Template
 * - Bundles React app with esbuild
 * - Transpiles server TypeScript to GAS-compatible .gs
 * - Generates HTML template for GAS HtmlService
 */

import * as esbuild from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import * as babel from '@babel/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC_CLIENT = path.join(ROOT, 'src/client')
const SRC_SERVER = path.join(ROOT, 'src/server')
const DIST = path.join(ROOT, 'dist')
const BUILD = path.join(ROOT, 'build')

async function buildClient() {
  console.log('📦 Building client...')

  await esbuild.build({
    entryPoints: [path.join(SRC_CLIENT, 'main.tsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    outfile: path.join(DIST, 'app.js'),
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    jsx: 'automatic',
    alias: {
      '@': SRC_CLIENT,
    },
  })

  console.log('✅ Client built')
}

async function buildCss() {
  console.log('📦 Building CSS...')

  execSync(
    `pnpm exec tailwindcss -c "${path.join(ROOT, 'tailwind.config.js')}" -i "${path.join(SRC_CLIENT, 'styles/index.css')}" -o "${path.join(DIST, 'app.css')}" --minify`,
    { cwd: ROOT, stdio: 'inherit' }
  )

  console.log('✅ CSS built')
}

function loadSpreadsheetId() {
  try {
    const clasp = JSON.parse(fs.readFileSync(path.join(ROOT, '.clasp.json'), 'utf-8'))
    return clasp.spreadsheetId || ''
  } catch {
    return ''
  }
}

async function buildServer() {
  console.log('📦 Building server...')

  const spreadsheetId = loadSpreadsheetId()
  if (spreadsheetId) {
    console.log(`   SPREADSHEET_ID: ${spreadsheetId}`)
  }

  await esbuild.build({
    entryPoints: [path.join(SRC_SERVER, 'index.ts')],
    bundle: true,
    format: 'esm',
    target: ['es2019'],
    outfile: path.join(DIST, 'Code.js'),
    loader: { '.ts': 'ts' },
    define: {
      '__SPREADSHEET_ID__': JSON.stringify(spreadsheetId),
    },
  })

  let code = fs.readFileSync(path.join(DIST, 'Code.js'), 'utf-8')

  // Convert ES modules to GAS-compatible format
  code = code.replace(/export\s*\{[\s\S]*?\}\s*;?\s*/g, '')
  code = code.replace(/^export\s+/gm, '')
  code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
  code = code.replace(/^import\s+.*$/gm, '')
  code = code.replace(/\n{3,}/g, '\n\n')

  fs.writeFileSync(path.join(BUILD, 'Code.gs'), code)

  console.log('✅ Server built')
}

/**
 * Escape JS for embedding in HTML (GAS include() pattern).
 * - </script> would close the script tag; use <\/script>.
 * - :// in strings (e.g. "http://") can be parsed as comment by GAS document.write; use \u002F\u002F.
 */
function escapeJsForGas(js) {
  let out = js
  out = out.replace(/<\/script\s*>/gi, '<\\/script>')
  out = out.replace(/:\/\//g, ':\\u002F\\u002F')
  return out
}

/**
 * Babel: transform template literals only (GAS compatibility).
 * Converts backticks to string concat so GAS document.write/parsing does not break.
 */
async function transformForGAS(code) {
  const result = await babel.transformAsync(code, {
    plugins: ['@babel/plugin-transform-template-literals'],
    compact: false,
    comments: true,
  })
  return result.code
}

async function generateHtml() {
  console.log('📦 Generating HTML...')

  const css = fs.readFileSync(path.join(DIST, 'app.css'), 'utf-8')
  let js = fs.readFileSync(path.join(DIST, 'app.js'), 'utf-8')
  js = escapeJsForGas(js)

  const backticksBefore = (js.match(/`/g) || []).length
  js = await transformForGAS(js)
  const backticksAfter = (js.match(/`/g) || []).length
  console.log(
    `   Babel template-literals: ${backticksBefore} -> ${backticksAfter} backticks`
  )
  if (backticksAfter > 0) {
    js = js.replace(/`/g, '\\u0060')
  }

  const safeCss = css.replace(/<\/style\s*>/gi, '\\3C/style>')

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GAS+React App</title>
  <base target="_top">
  <style>${safeCss}</style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.gasApi = {
      get: function(action, params) {
        return new Promise(function(resolve, reject) {
          google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).apiGet(action, params || {});
        });
      },
      post: function(action, data) {
        return new Promise(function(resolve, reject) {
          google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).apiPost(action, data || {});
        });
      }
    };
  </script>
  <?!= include('app') ?>
</body>
</html>`

  fs.writeFileSync(path.join(BUILD, 'index.html'), indexHtml)
  fs.writeFileSync(path.join(BUILD, 'app.html'), `<script>${js}</script>`)

  console.log('✅ HTML generated')
}

function copyAppsScript() {
  console.log('📦 Copying appsscript.json...')
  fs.copyFileSync(
    path.join(ROOT, 'appsscript.json'),
    path.join(BUILD, 'appsscript.json')
  )
  console.log('✅ appsscript.json copied')
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true })
  fs.mkdirSync(BUILD, { recursive: true })

  try {
    await buildClient()
    await buildCss()
    await buildServer()
    await generateHtml()
    copyAppsScript()

    console.log('\n🎉 Build complete!')
    console.log(`   Output: ${BUILD}`)
  } catch (err) {
    console.error('❌ Build failed:', err)
    process.exit(1)
  }
}

main()

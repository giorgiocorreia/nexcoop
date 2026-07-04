#!/usr/bin/env node
/**
 * Bloqueia build/deploy acidental a partir do ambiente de preview local.
 * Ativado quando existe .local-preview na raiz ou branch feat/comercializacao-ui*.
 */
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const isPreviewEnv = existsSync(resolve(root, '.local-preview'))

let branch = ''
try {
  branch = execSync('git branch --show-current', { cwd: root, encoding: 'utf8' }).trim()
} catch {
  branch = ''
}

const isPreviewBranch = /^feat\/comercializacao-ui/.test(branch)

if (isPreviewEnv || isPreviewBranch) {
  console.error('')
  console.error('  DEPLOY BLOQUEADO — ambiente de preview local')
  console.error('  Pasta:  ' + root)
  console.error('  Branch: ' + (branch || '(desconhecida)'))
  console.error('')
  console.error('  Para publicar, merge em main e deploy a partir de:')
  console.error('  C:\\Users\\Lenovo\\Documents\\nexcoop')
  console.error('')
  process.exit(1)
}
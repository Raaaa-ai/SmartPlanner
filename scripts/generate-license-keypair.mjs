import { generateKeyPairSync } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const keyDir = process.env.SMARTPLANNER_LICENSE_DIR || join(homedir(), '.smartplanner-license')
const privateKeyPath = join(keyDir, 'license-private.pem')
const publicKeyPath = join(keyDir, 'license-public.pem')

mkdirSync(keyDir, { recursive: true })

if (existsSync(privateKeyPath) && !process.argv.includes('--force')) {
  console.error(`私钥已存在：${privateKeyPath}`)
  console.error('如需重新生成，请先备份旧密钥，然后加上 --force 参数。')
  process.exit(1)
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519')

writeFileSync(
  privateKeyPath,
  privateKey.export({ type: 'pkcs8', format: 'pem' }),
  'utf8'
)
writeFileSync(
  publicKeyPath,
  publicKey.export({ type: 'spki', format: 'pem' }),
  'utf8'
)

try {
  chmodSync(privateKeyPath, 0o600)
} catch {
}

console.log('密钥对已生成：')
console.log(`  私钥：${privateKeyPath}`)
console.log(`  公钥：${publicKeyPath}`)
console.log('')
console.log('请备份私钥，并把公钥内容写入 src/main/license.ts 的 PUBLIC_KEY_PEM。')

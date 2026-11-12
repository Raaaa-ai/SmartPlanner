import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const keyDir = process.env.SMARTPLANNER_LICENSE_DIR || join(homedir(), '.smartplanner-license')
const privateKeyPath =
  process.env.SMARTPLANNER_LICENSE_KEY || join(keyDir, 'license-private.pem')

const rawMachine = (process.argv[2] || '').trim().toUpperCase()
const label = ((process.argv[3] || '').trim() || '授权用户').slice(0, 80)

if (!rawMachine) {
  console.error('用法：node scripts/issue-license.mjs "SP-XXXX-XXXX-XXXX-XXXX-XXXX" "备注"')
  process.exit(1)
}

if (!/^SP-[0-9A-F]{4}(-[0-9A-F]{4}){4}$/.test(rawMachine)) {
  console.error(`机器码格式不正确：${rawMachine}`)
  console.error('正确格式示例：SP-7F3A-92KD-8M1Q-5XZP-0C7B')
  process.exit(1)
}

let privateKey
try {
  privateKey = createPrivateKey(readFileSync(privateKeyPath, 'utf8'))
} catch {
  console.error(`无法读取私钥：${privateKeyPath}`)
  console.error('请先运行 node scripts/generate-license-keypair.mjs 生成密钥，或设置 SMARTPLANNER_LICENSE_KEY。')
  process.exit(1)
}

const payload = {
  v: 1,
  app: 'smartplanner',
  mid: rawMachine,
  label,
  iat: Date.now()
}

const data = Buffer.from(JSON.stringify(payload), 'utf8')
const signature = sign(null, data, privateKey)
const code = `SP1.${data.toString('base64url')}.${signature.toString('base64url')}`

console.log(code)

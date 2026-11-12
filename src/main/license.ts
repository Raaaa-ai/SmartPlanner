import { execFileSync } from 'node:child_process'
import { createHash, createPublicKey, verify } from 'node:crypto'
import { hostname, userInfo } from 'node:os'

const APP_SALT = 'smartplanner-license-v1'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA92WYbh+1oIMg9TLGup/DLc8+5bVKD47OLVgC4Yuh2YQ=
-----END PUBLIC KEY-----`

export interface LicensePayload {
  v: 1
  app: 'smartplanner'
  mid: string
  label: string
  iat: number
}

export type VerifyLicenseResult =
  | { ok: true; payload: LicensePayload }
  | { ok: false; message: string }

let cachedMachineCode: string | null = null

function readWindowsMachineGuid(): string {
  try {
    const output = execFileSync(
      'reg',
      ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
      { windowsHide: true, encoding: 'utf8', timeout: 4000 }
    )
    const match = /MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/.exec(output)
    return match?.[1] ?? ''
  } catch {
    return ''
  }
}

export function getMachineCode(): string {
  if (cachedMachineCode) return cachedMachineCode

  let raw = process.platform === 'win32' ? readWindowsMachineGuid() : ''
  if (!raw) {
    try {
      raw = `${hostname()}|${userInfo().username}|${process.platform}`
    } catch {
      raw = `${process.platform}|fallback`
    }
  }

  const hash = createHash('sha256')
    .update(`${APP_SALT}|${raw}`)
    .digest('hex')
    .toUpperCase()
  const groups = hash.slice(0, 20).match(/.{1,4}/g) ?? []
  cachedMachineCode = `SP-${groups.join('-')}`
  return cachedMachineCode
}

function canonicalPayload(payload: LicensePayload): Buffer {
  return Buffer.from(
    JSON.stringify({
      v: payload.v,
      app: payload.app,
      mid: payload.mid,
      label: payload.label,
      iat: payload.iat
    }),
    'utf8'
  )
}

export function verifyLicenseCode(code: string): VerifyLicenseResult {
  const trimmed = code.trim()
  if (!trimmed) return { ok: false, message: '请输入激活码' }

  const body = trimmed.startsWith('SP1.') ? trimmed.slice(4) : trimmed
  const parts = body.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, message: '激活码格式不正确' }
  }

  let payload: LicensePayload
  try {
    const parsed = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as Partial<LicensePayload>
    if (
      parsed.v !== 1 ||
      parsed.app !== 'smartplanner' ||
      typeof parsed.mid !== 'string' ||
      typeof parsed.label !== 'string' ||
      typeof parsed.iat !== 'number'
    ) {
      return { ok: false, message: '激活码内容无效' }
    }
    payload = {
      v: 1,
      app: 'smartplanner',
      mid: parsed.mid,
      label: parsed.label,
      iat: parsed.iat
    }
  } catch {
    return { ok: false, message: '激活码无法解析' }
  }

  if (payload.mid !== getMachineCode()) {
    return { ok: false, message: '激活码与当前电脑不匹配' }
  }

  try {
    const publicKey = createPublicKey(PUBLIC_KEY_PEM)
    const valid = verify(
      null,
      canonicalPayload(payload),
      publicKey,
      Buffer.from(parts[1], 'base64url')
    )
    if (!valid) return { ok: false, message: '激活码签名无效' }
  } catch {
    return { ok: false, message: '激活码校验失败' }
  }

  return { ok: true, payload }
}

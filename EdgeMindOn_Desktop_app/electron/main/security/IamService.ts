import crypto from 'crypto'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { v4 as uuidv4 } from 'uuid'
import type { IamToken } from '../../../src/types'

const KEY_ALGORITHM = 'ES256'

export class IamService {
  private privateKey!: crypto.KeyObject
  private publicKey!: crypto.KeyObject
  private readonly tokenTtlSec = 1800 // 30 min

  async init(): Promise<void> {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256'
    })
    this.privateKey = privateKey
    this.publicKey = publicKey
  }

  async issueToken(subject: string, scope: string[]): Promise<string> {
    const privKey = await this.importPrivateKey()
    const jwt = await new SignJWT({ scope })
      .setProtectedHeader({ alg: KEY_ALGORITHM })
      .setIssuedAt()
      .setSubject(subject)
      .setJti(uuidv4())
      .setExpirationTime(`${this.tokenTtlSec}s`)
      .sign(privKey)
    return jwt
  }

  async validateToken(token: string, requiredScope: string): Promise<IamToken | null> {
    try {
      const pubKey = await this.importPublicKey()
      const { payload } = await jwtVerify(token, pubKey, {
        algorithms: [KEY_ALGORITHM]
      })
      const scopes = (payload as JWTPayload & { scope: string[] }).scope ?? []
      if (!scopes.includes(requiredScope) && !scopes.includes('*')) return null
      return {
        sub: payload.sub ?? '',
        scope: scopes,
        iat: payload.iat ?? 0,
        exp: payload.exp ?? 0,
        jti: payload.jti ?? ''
      }
    } catch {
      return null
    }
  }

  private async importPrivateKey(): Promise<crypto.KeyObject> {
    const { createPrivateKey } = await import('crypto')
    const pem = this.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
    return createPrivateKey(pem)
  }

  private async importPublicKey(): Promise<crypto.KeyObject> {
    const { createPublicKey } = await import('crypto')
    const pem = this.publicKey.export({ type: 'spki', format: 'pem' }) as string
    return createPublicKey(pem)
  }
}

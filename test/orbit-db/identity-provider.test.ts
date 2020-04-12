
import path from 'path'
import fs from 'fs-extra'
import type IPFS from 'ipfs'
import crypto from 'libp2p-crypto'
import bs58 from 'bs58'
import { rmrf } from '../utils'

import Identities, { Identity, IdentityAsJson } from 'orbit-db-identity-provider'
import { createIPFSInstance } from '../../src/ipfs'
import { IPFSIdentityProvider, getPrivateKey, importPublicKey, getKeyHash, ERR_IDENTITY_JSON_INVALID } from '../../src/orbit-db/identity-provider'

const dir = path.join(path.dirname(__dirname), 'identity-provider-test-0')
const identityStorePath0 = path.join(dir, '/keystore0')
const identityStorePath1 = path.join(dir, '/keystore1')

const mockIdentitySig = '4q0snOL+IdwsfGW6r8WBdIh7dFe8FGahU3LjVpZ2VvgWsm+qcTKbz2T04wUfbSq+jaB2rQvPQ8szKReRCRhCBA=='

// register the IdentityProvider type
Identities.addIdentityProvider(IPFSIdentityProvider)

const assertIdentityIdMatches = async (identityId: string, publicKey: crypto.PublicKey): Promise<void> => {
  const key0 = importPublicKey(identityId)
  const key0Hash = await getKeyHash(identityId)

  expect(key0.equals(publicKey)).toBe(true)

  expect(key0Hash).toStrictEqual(
    bs58.encode(await key0.hash())
  )
  expect(key0Hash).toStrictEqual(
    bs58.encode(await publicKey.hash())
  )
}

const testVerifyIdentity = (identityGetter: () => Identity): void => {
  describe('verify Identity', () => {
    // `identity` is a class that implements some getters,
    // so `{ ...identity }` does not work
    let i: IdentityAsJson
    beforeAll(() => {
      i = identityGetter().toJSON()
    })

    test('throw error when the identity object is invalid', async () => {
      const assertErr = (identityObj: IdentityAsJson): Promise<void> => {
        return expect(IPFSIdentityProvider.verifyIdentity(identityObj)).rejects.toThrowError(ERR_IDENTITY_JSON_INVALID)
      }
      await assertErr(undefined as any)
      await assertErr({ ...i, id: '' })
      await assertErr({ ...i, publicKey: '' })
      await assertErr({ ...i, signatures: undefined as any })
      await assertErr({ ...i, signatures: { ...i.signatures, id: '' } })
      await assertErr({ ...i, signatures: { ...i.signatures, publicKey: '' } })
    })

    test('return false when the identity signature is invalid', async () => {
      const i1 = { ...i, signatures: { ...i.signatures, publicKey: mockIdentitySig } }
      expect(await IPFSIdentityProvider.verifyIdentity(i1)).toBe(false)
    })

    test('return true when the identity signature is valid', async () => {
      expect(await IPFSIdentityProvider.verifyIdentity(i)).toBe(true)
    })
  })
}

describe('PaperOrbitDB: IdentityProvider using IPFS keys', () => {
  let ipfs: IPFS

  beforeAll(async () => {
    await rmrf(dir)
    ipfs = await createIPFSInstance({ directory: dir })
    await fs.ensureDir(identityStorePath0)
    await fs.ensureDir(identityStorePath1)
  }, 30 * 1000)

  describe('RSA key', () => {
    const rsaKeyName = 'rsa_test'
    let identity: Identity

    beforeAll(async () => {
      identity = await Identities.createIdentity({
        ipfs,
        type: IPFSIdentityProvider.type,
        key: rsaKeyName, // create the key automatically when the key under the name does not exists
        identityKeysPath: identityStorePath0,
      })
    })

    describe('get user id (the base58-btc encoded IPFS public key)', () => {
      test('identity.id matches the public key', async () => {
        const key1Public = (await getPrivateKey(ipfs, rsaKeyName)).public
        await assertIdentityIdMatches(identity.id, key1Public)
      })
    })

    testVerifyIdentity(() => identity)
  })

  describe('ED25519 key (using the unofficial `ipfs.key.protobuf` method)', () => {
    const keyStore = {}
    const edKeyName = 'ed25519_test'

    let identity: Identity

    beforeAll(async () => {
      // assign the unofficial method
      ipfs.key['protobuf'] = async (keyName: string): Promise<Buffer> => {
        if (!keyStore[keyName]) {
          // generate a new Ed25519 key pair
          const privateKey = await crypto.keys.generateKeyPair('Ed25519', 256)
          const buf = crypto.keys.marshalPrivateKey(privateKey)
          keyStore[keyName] = buf
        }
        return keyStore[keyName]
      }

      identity = await Identities.createIdentity({
        ipfs,
        type: IPFSIdentityProvider.type,
        key: edKeyName,
        identityKeysPath: identityStorePath1,
      })
    })

    describe('key lookup', () => {
      test('using `ipfs.key.protobuf` matches the key in keyStore', async () => {
        const key0 = await getPrivateKey(ipfs, edKeyName)
        const key1 = await crypto.keys.unmarshalPrivateKey(keyStore[edKeyName])
        expect(key0.equals(key1)).toBe(true)
      })
    })

    describe('get user id (the base58-btc encoded IPFS public key)', () => {
      test('identity.id matches the public key', async () => {
        const key1Public = (await crypto.keys.unmarshalPrivateKey(keyStore[edKeyName])).public
        await assertIdentityIdMatches(identity.id, key1Public)
      })
    })

    testVerifyIdentity(() => identity)
  })

  afterAll(async () => {
    await ipfs.stop()
    await rmrf(dir)
  })
})

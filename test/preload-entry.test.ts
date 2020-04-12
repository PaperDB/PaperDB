/* eslint-disable @typescript-eslint/no-empty-function */

import path from 'path'
import type IPFS from 'ipfs'

import { createIPFSInstance } from '../src/ipfs'
import { PaperOrbitDB } from '../src/orbit-db'
import {
  buildEntry,
  verify,
  PreloadEntry,
  ERR_IDENTITY_PROVIDER_REQUIRED,
  ERR_NO_ENTRY_IDENTITY,
  ERR_NO_ENTRY_SIGNATURE,
  ERR_NO_ENTRY_PAYLOAD,
} from '../src/preload-entry'

import { rmrf } from './utils'

const dir = path.join(__dirname, 'preload-entry-test-0')
const options = {
  directory: dir,
  ipfsKeyName: 'preload-entry-test',
}

const payload = { 'test': 123 }

describe('PaperDB: the preload entry of a collection', () => {
  let ipfs: IPFS
  let _db: PaperOrbitDB

  let entry: PreloadEntry<typeof payload>

  beforeAll(async () => {
    await rmrf(dir)
    ipfs = await createIPFSInstance(options)
    _db = await PaperOrbitDB.createInstance(ipfs, options)
  }, 30 * 1000)

  describe('build preload entry', () => {
    beforeAll(async () => {
      entry = await buildEntry(payload, _db.identity)
    })

    test('entry payload is frozen', () => {
      expect(entry.payload).toStrictEqual(payload)
      expect(Object.isFrozen(entry.payload)).toBe(true)
    })

    test('identity', () => {
      expect(entry.identity).toStrictEqual(_db.identity.toJSON())
    })

    test('entry signature', () => {
      expect(typeof entry.sig === 'string').toBe(true)
    })
  })

  describe('verify the preload entry', () => {
    test('throw error when identity.provider is missing', async () => {
      await expect(verify(entry, undefined as any)).rejects.toThrowError(ERR_IDENTITY_PROVIDER_REQUIRED)
      await expect(verify(entry, {} as any)).rejects.toThrowError(ERR_IDENTITY_PROVIDER_REQUIRED)
      await expect(verify(entry, _db.identity.toJSON() as any)).rejects.toThrowError(ERR_IDENTITY_PROVIDER_REQUIRED)
    })

    test('throw error when entry.identity.publicKey is missing', async () => {
      await expect(verify({ ...entry, identity: undefined as any }, _db.identity)).rejects.toThrowError(ERR_NO_ENTRY_IDENTITY)
      await expect(verify({ ...entry, identity: { ...entry.identity, publicKey: undefined as any } }, _db.identity)).rejects.toThrowError(ERR_NO_ENTRY_IDENTITY)
    })

    test('throw error when entry signature is missing', async () => {
      await expect(verify({ ...entry, sig: undefined as any }, _db.identity)).rejects.toThrowError(ERR_NO_ENTRY_SIGNATURE)
    })

    test('throw error when entry payload is missing', async () => {
      await expect(verify({ ...entry, payload: undefined as any }, _db.identity)).rejects.toThrowError(ERR_NO_ENTRY_PAYLOAD)
    })

    test('return false if entry signature does not match', async () => {
      expect(await verify({ ...entry, sig: ' ' }, _db.identity)).toBe(false)
      expect(await verify({ ...entry, sig: 'aaaaaa' }, _db.identity)).toBe(false)
      expect(await verify({ ...entry, sig: '测试' }, _db.identity)).toBe(false)
    })

    test('return true when the entry is valid', async () => {
      expect(await verify(entry, _db.identity)).toBe(true)
    })
  })

  afterAll(async () => {
    await ipfs.stop()
    await _db.stop()
    await rmrf(dir)
  })
})

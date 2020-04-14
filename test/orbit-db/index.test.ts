
import path from 'path'
import type IPFS from 'ipfs'
import { rmrf, connectIpfsNodes } from '../utils'

import { createIPFSInstance } from '../../src/ipfs'
import { PaperOrbitDB } from '../../src/orbit-db'
import type LogStore from 'src/orbit-db/logstore'

const dir0 = path.join(path.dirname(__dirname), 'orbitdb-test-0')
const dir1 = path.join(path.dirname(__dirname), 'orbitdb-test-1')

describe('PaperOrbitDB', () => {
  let ipfs0: IPFS
  let ipfs1: IPFS

  let db0: PaperOrbitDB
  let db1: PaperOrbitDB

  beforeAll(async () => {
    await rmrf(dir0)
    await rmrf(dir1)

    ipfs0 = await createIPFSInstance({ directory: dir0 })
    db0 = await PaperOrbitDB.createInstance(ipfs0, { directory: dir0 })

    ipfs1 = await createIPFSInstance({ directory: dir1 })
    db1 = await PaperOrbitDB.createInstance(ipfs1, { directory: dir1 })

    await connectIpfsNodes(ipfs0, ipfs1)
  }, 60 * 1000)

  describe('create & open', () => {
    let addr0: string
    let addr1: string

    test('create datastores', async () => {
      const store0 = await db0.createDataStore('test0', { 'test': 0 })
      const store1 = await db1.createDataStore('test1', { 'test': 1 })

      addr0 = store0.address.toString()
      addr1 = store1.address.toString()

      await store0.close()
      await store1.close()
    })

    test('reopen datastores in different peers, have the same metadata', async () => {
      const store1 = await db0.openDataStore(addr1)
      const store0 = await db1.openDataStore(addr0)

      expect(store0.metaData).toStrictEqual({ 'test': 0 })
      expect(store1.metaData).toStrictEqual({ 'test': 1 })

      await store0.close()
      await store1.close()
    })
  })

  describe('replicate', () => {
    test('', async () => {
      const store0 = await db0.createDataStore('abc123')
      const store1 = await db1.openDataStore(store0.address.toString())

      const obj0 = { name: 'obj0', i: db0.identity.toJSON() }
      const obj1 = { name: 'obj1', i: db1.identity.toJSON() }

      const hash0 = await store0.add(obj0)
      await new Promise((resolve) => { store1.events.on('replicated', resolve) })

      const hash1 = await store1.add(obj1)
      await new Promise((resolve) => { store0.events.on('replicated', resolve) })

      expect(store1.get(hash0).payload).toStrictEqual(obj0)
      expect(store0.get(hash1).payload).toStrictEqual(obj1)

      const entries0 = store0.iterator({ limit: -1 }).collect()
      const entries1 = store1.iterator({ limit: -1 }).collect()

      expect(entries0).toHaveLength(2)
      expect(entries1).toHaveLength(2)
      expect(entries0).toStrictEqual(entries1)

      expect(entries0[0].payload).toStrictEqual(obj0)
      expect(entries0[1].payload).toStrictEqual(obj1)

      await store0.close()
      await store1.close()
    }, 60 * 1000)
  })

  describe('datastore access-controller', () => {
    let store0: LogStore<any, any>
    let store1: LogStore<any, any>

    beforeAll(async () => {
      // disable error logging
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      console.error = (): void => { }

      store0 = await db0.createDataStore('access-controller-test')
      store1 = await db1.openDataStore(store0.address.toString(), (entry) => {
        if (entry.payload === 'a') throw new Error()
        return entry.identity.publicKey === db0.identity.publicKey
      })
    })

    test('client controls the access-controller', async () => {
      await expect(store0.add('1')).resolves.toBeTruthy()
      await expect(store1.add('2')).rejects.toThrowError()
    })

    test('Allow Write if the access-controller callback throws an error, ignore anything else', async () => {
      await expect(store1.add('a')).resolves.toBeTruthy()
    })
  })

  afterAll(async () => {
    await db0.stop()
    await db1.stop()

    await ipfs0.stop()
    await ipfs1.stop()

    await rmrf(dir0)
    await rmrf(dir1)
  })
})


import path from 'path'
import { rmrf, connectIpfsNodes } from './utils'

import PaperDB from '../src'
import { PaperDBDate } from '../src/types/date'
import { Collection, CollectionRefObj } from '../src/types/collection'
import { Document } from '../src/types/doc'
import { UnsubFn } from '../src/utils'

const dir0 = path.join(__dirname, 'collections-test-0')
const dir1 = path.join(__dirname, 'collections-test-1')

const date0 = new PaperDBDate('2020-01-01')
const date1 = new PaperDBDate()
const metainfoObj = { 'test': 123, 'abc': 456 }

const assertCollection = async (collection: Collection, paperdb0: PaperDB): Promise<void> => {
  const { metainfo, preloadDocRef } = await collection.instantLoad()
  expect(metainfo).toStrictEqual(metainfoObj)

  expect(await preloadDocRef?.data()).toStrictEqual(date0)
  expect(preloadDocRef?.id).toBe('__preload__')
  expect(await preloadDocRef?.userId()).toBe(await paperdb0.userId())

  expect(await collection.metainfo()).toStrictEqual(metainfoObj)
}

describe('PaperDB Collection & Document', () => {
  let paperdb0: PaperDB
  let paperdb1: PaperDB

  beforeAll(async () => {
    await rmrf(dir0)
    await rmrf(dir1)

    paperdb0 = await PaperDB.create({ directory: dir0 })
    paperdb1 = await PaperDB.create({ directory: dir1 })

    await connectIpfsNodes(paperdb0.ipfs, paperdb1.ipfs)
  }, 30 * 1000)

  let collectionId: string
  let collection0: Collection
  let collection1: Collection

  describe('Create & Open', () => {
    test('create a new collection', async () => {
      const collection = await paperdb0.collection.create({
        doctype: 'date',
        metainfo: metainfoObj,
        preloadDoc: date0,
      })

      collectionId = collection.id

      await collection.close()
    })

    test('throw error if the doctype provied is not registered', async () => {
      await expect(paperdb0.collection.create({ doctype: 'test' })).rejects.toThrowError()
      expect(() => paperdb0.collection(collectionId, 'test')).toThrowError()
    })

    test('reopen the collection by the collection id', async () => {
      collection0 = paperdb0.collection(collectionId, 'date')
      await assertCollection(collection0, paperdb0)
      await collection0.ready()
    })

    test('open the collection in a connected peer', async () => {
      collection1 = paperdb1.collection(collectionId, 'date')
      const peerId1 = (await paperdb1.ipfs.id()).id

      await assertCollection(collection1, paperdb0)

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      await new Promise(async (resolve) => {
        const unsub = await collection0.onPeer((peer) => {
          expect(peer).toBe(peerId1)
          unsub()
          resolve()
        })
        await collection1.ready()
      })
    }, 60 * 1000)

    test('open & reopen a collection by its metainfo', async () => {
      const opts = {
        doctype: 'ipfs:file',
        metainfo: metainfoObj,
      }

      const collection2 = await paperdb0.collection.create(opts)
      const id = collection2.id
      await collection2.close()

      const collection3 = await paperdb1.collection.create(opts)
      expect(collection3.id).toBe(id)
      await collection3.close()
    }, 20 * 1000)
  })

  describe('Replicate', () => {
    let unsub: UnsubFn
    let doc1: Document

    const mockFn = jest.fn()

    test('subscribe the `replicated` event (`onSnapshot`)', async () => {
      unsub = await collection0.onSnapshot(mockFn)
    })

    test('add 1 document by a connected peer', async () => {
      doc1 = await collection1.add(date1)

      await new Promise((resolve) => void collection0.onSnapshot(resolve))
      expect(mockFn).toBeCalledTimes(1)
    })

    test('validate all documents (including the preload doc)', async () => {
      const docs = await collection0.getAll()

      expect(docs[0].id).toBe('__preload__')
      expect(await docs[0].userId()).toBe(await paperdb0.userId())
      expect(await docs[0].data()).toStrictEqual(date0)

      expect(docs[1].id).toBe(doc1.id)
      expect(await docs[1].userId()).toBe(await paperdb1.userId())
      expect(await docs[1].data()).toStrictEqual(date1)
    })

    test('add document data by a document instance (only its data)', async () => {
      const doc2 = await collection0.add(doc1)

      expect(doc2.id).not.toBe(doc1.id)
      expect(await doc2.userId()).not.toBe(await doc1.userId())
      expect(await doc2.data()).toStrictEqual(date1) // doc1's data

      expect(await collection0.getAll()).toHaveLength(3)
      expect(mockFn).toBeCalledTimes(1)
    })

    test('stop receiving updates after unsubscribing', async () => {
      unsub()
      await collection1.add(new PaperDBDate())
      await new Promise((resolve) => void collection0.onSnapshot(resolve))
      expect(mockFn).toBeCalledTimes(1) // still 1, only inbound replication
    })
  })

  describe('TypedObj conversion', () => {
    let obj: CollectionRefObj

    beforeAll(() => {
      obj = {
        $type: 'collection-ref' as const,
        $v: 0 as const,
        id: collection0.id,
        doctype: 'date',
      }
    })

    test('to TypedObj', () => {
      expect(collection0.toTypedObj()).toStrictEqual(obj)
    })

    test('from its instance', () => {
      const c = Collection.fromTypedObj(obj, paperdb0)
      expect(Collection.fromTypedObj(c, paperdb0)).toBe(c) // Object.is
    })

    test('from TypedObj', () => {
      const c = Collection.fromTypedObj(obj, paperdb0)
      expect(c).toStrictEqual(new Collection(obj.id, 'date', paperdb0))

      expect(() => Collection.fromTypedObj({ ...obj, $type: undefined as any }, paperdb0)).toThrowError()
      expect(() => Collection.fromTypedObj({ ...obj, $type: 'aaaa' as any }, paperdb0)).toThrowError()

      expect(() => Collection.fromTypedObj({ ...obj, $v: undefined as any }, paperdb0)).toThrowError()
      expect(() => Collection.fromTypedObj({ ...obj, $v: 'abc' as any }, paperdb0)).toThrowError()
      expect(() => Collection.fromTypedObj({ ...obj, $v: 1 as any }, paperdb0)).toThrowError()

      expect(() => Collection.fromTypedObj({ ...obj, id: undefined as any }, paperdb0)).toThrowError()
      expect(() => Collection.fromTypedObj({ ...obj, id: 1 as any }, paperdb0)).toThrowError()

      expect(() => Collection.fromTypedObj({ ...obj, doctype: undefined as any }, paperdb0)).toThrowError()
      expect(() => Collection.fromTypedObj({ ...obj, doctype: 1 as any }, paperdb0)).toThrowError()
    })
  })

  afterAll(async () => {
    await paperdb0.close()
    await paperdb1.close()
    await rmrf(dir0)
    await rmrf(dir1)
  })
})

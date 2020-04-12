
import { LocalKVStorage, Namespace, Record, STORAGE_CLOSED_ERR, NAMESPACE_SEP } from '../src/local-kv'
import { PINLIST_KEY_PREFIX } from '../src/constants'
import { rmrf } from './utils'
import path from 'path'
import fs from 'fs-extra'

describe('LocalKVStorage', () => {
  const defaultPath = path.join('./', '.paperdb', 'kvstorage')

  const dbPath = path.join(__dirname, 'localkv-test-db')
  const dbStoragePath = path.join(dbPath, 'kvstorage')

  let storage: LocalKVStorage

  const R_NAME = '//.,/:\'"|\\-=+-^$abc123测试בؼДに😀'
  const R_KEY = `ns3${NAMESPACE_SEP}ns5${NAMESPACE_SEP}${R_NAME}`
  const R_PATH = ['ns3', 'ns5', R_NAME]
  const R_VALUE = new Uint8Array([1, 2])

  const R_KEY1 = `ns3${NAMESPACE_SEP}ns4${NAMESPACE_SEP}abc`
  const R_PATH1 = ['ns3', 'ns4', 'abc']
  const R_VALUE1 = { i: 1 }

  beforeAll(async () => {
    await rmrf(defaultPath)
    await rmrf(dbPath)
  })

  describe('create', () => {
    test('use default options', async () => {
      const kv = await LocalKVStorage.create()
      expect(await fs.pathExists(defaultPath)).toBe(true)
      expect(kv['kvstorage']['_db']._config.name).toBe('paperdb')
    })

    test('use the provided path and name', async () => {
      storage = await LocalKVStorage.create({ directory: dbPath, name: 'test' })
      expect(await fs.pathExists(dbStoragePath)).toBe(true)
      expect(storage['kvstorage']['_db']._config.name).toBe('test')
    })

    test('should throw error when name is invalid', () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      expect(LocalKVStorage.create({ name: '  测试' })).rejects.toThrowError()
    })
  })

  describe('nested namespaces', () => {
    let ns1: Namespace
    let ns2: Namespace

    beforeAll(() => {
      ns1 = storage.root.namespace('ns1')
      ns2 = ns1.namespace('ns2')
    })

    test('the root namespace', () => {
      expect(ns1.root()).toStrictEqual(storage.root)
      expect(ns2.root()).toStrictEqual(storage.root)
      expect(ns2.root()).not.toStrictEqual(ns2)
    })

    test('the parent namespace', () => {
      expect(ns1.parent()).toStrictEqual(storage.root)
      expect(ns2.parent()).toStrictEqual(ns1)
      expect(ns2.parent()).not.toStrictEqual(storage.root)
    })

    test('the namespace path', () => {
      expect(ns1['path']).toStrictEqual(['ns1'])
      expect(ns2['path']).toStrictEqual(['ns1', 'ns2'])
    })

    test('the namespace key', () => {
      expect(ns1['namespaceKey']).toStrictEqual('ns1' + NAMESPACE_SEP)
      expect(ns2['namespaceKey']).toStrictEqual('ns1' + NAMESPACE_SEP + 'ns2' + NAMESPACE_SEP)
    })
  })

  describe('access a record', () => {
    let ns4: Namespace

    let record0: Record
    let record1: Record

    beforeAll(() => {
      ns4 = storage.root.namespace('ns3').namespace('ns4')
      record0 = ns4.record('t')
      record1 = ns4.record('abc')
    })

    test('the record\'s key, path and name', () => {
      expect(record0.key).toBe(`ns3${NAMESPACE_SEP}ns4${NAMESPACE_SEP}t`)
      expect(record0.path).toStrictEqual(['ns3', 'ns4', 't'])
      expect(record0.name).toBe('t')
    })

    test('the record\'s namespace', () => {
      const ns = record0.namespaceOf()
      expect(ns).toStrictEqual(ns4)
      expect(ns.path).toStrictEqual(['ns3', 'ns4'])
    })

    test('the record does not exist before adding a value to it', async () => {
      expect(await record0.exist()).toBe(false)
    })

    test('set & get the value', async () => {
      const value = new Date()
      await record0.set(value)
      expect(await record0.get()).toStrictEqual(value)

      await record1.set(R_VALUE1)
      expect(await record1.get()).toStrictEqual(R_VALUE1)
    })

    test('the record does not exist after deleting it', async () => {
      expect(await record0.exist()).toBe(true)
      await record0.delete()
      expect(await record0.exist()).toBe(false)
    })

    test('record name with non-ascii characters', async () => {
      const record2 = storage.root.namespace('ns3').namespace('ns5').record(R_NAME)

      expect(record2.key).toBe(R_KEY)
      expect(record2.path).toStrictEqual(R_PATH)
      expect(record2.name).toBe(R_NAME)

      expect(await record2.exist()).toBe(false)
      await record2.set(R_VALUE)
      expect(await record2.exist()).toBe(true)
      expect(await record2.get()).toStrictEqual(R_VALUE)
    })
  })

  describe('the root namespace', () => {
    let rootNamespace: Namespace

    beforeAll(() => {
      rootNamespace = storage.root
    })

    test('the path should be empty', () => {
      expect(rootNamespace.path).toStrictEqual([])
      expect(rootNamespace['namespaceKey']).toBe('')
    })

    test('the root namespace\'s parent namespace should be itself', () => {
      expect(rootNamespace.parent()).toStrictEqual(rootNamespace)
    })

    test('the root namespace\'s root namespace should be itself', () => {
      expect(rootNamespace.root()).toStrictEqual(rootNamespace)
    })

    test('has all previously added keys', async () => {
      const keys = await rootNamespace.keys()
      expect(keys).toStrictEqual([R_KEY1, R_KEY])
    })

    test(`ignore keys prefixed with '${PINLIST_KEY_PREFIX}' (used in PaperDB IPFS Pinlist)`, async () => {
      const r = rootNamespace.namespace(PINLIST_KEY_PREFIX)
        .namespace('default') // the pinlist name
        .record('Qmhash')
      await r.set(null)

      expect(await r.get()).toBe(null)
      expect(await r.get()).not.toBe(undefined)
      expect(r.key).toBe(`${PINLIST_KEY_PREFIX}${NAMESPACE_SEP}default${NAMESPACE_SEP}Qmhash`)

      // does not include the pinlist key previously added
      const keys = await rootNamespace.keys()
      expect(keys).toStrictEqual([R_KEY1, R_KEY])
    })

    test('has all previously added records', async () => {
      const rs = await rootNamespace.records()
      expect(rs.map(r => r.path)).toStrictEqual([R_PATH1, R_PATH])
    })
  })

  describe('access a record by key', () => {
    test('', async () => {
      const r = storage.recordOf(R_KEY)
      expect(r.path).toStrictEqual(R_PATH)
      expect(await r.exist()).toBe(true)
      expect(await r.get()).toStrictEqual(R_VALUE)
    })
  })

  describe('close', () => {
    test('', async () => {
      expect(storage['closed']).toBe(false)
      await storage.close()
      expect(storage['closed']).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      expect(storage.root.records()).rejects.toBe(STORAGE_CLOSED_ERR)
    })
  })

  afterAll(async () => {
    await rmrf(defaultPath)
    await rmrf(dbPath)
  })
})

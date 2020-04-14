/***
 * LocalKVStorage
 */

import path from 'path'

import { KVStorage } from '@paper-db/kv-storage'
import type { VALUE } from '@paper-db/kv-storage/src/interface'
import { Options, DEFAULT_OPTIONS } from './options'
import { PINLIST_KEY_PREFIX } from './constants'

/**
 * the key of the record to indicate that the storage has been initialized
 */
const INIT_KEY = '__init__'

/** 
 * C0 control code: Group Separator
 */
export const NAMESPACE_SEP = '\u001D'

export function keyFor (keyPath: ReadonlyArray<string>): string {
  return keyPath.join(NAMESPACE_SEP)
}

export function pathOf (key: string): string[] {
  return key.split(NAMESPACE_SEP)
}

export const STORAGE_CLOSED_ERR = ((): Error => {
  const e = new Error()
  e.name = 'StorageClosedError'
  e.message = 'kvstorage is closed.'
  return e
})()

function assertStorageClosed (storage: LocalKVStorage): void {
  if (storage['closed']) {
    throw STORAGE_CLOSED_ERR
  }
}

/**
 * a record (key-value pair) of the kv-storage
 */
export class Record<T extends VALUE = any> {
  constructor (
    private readonly storage: LocalKVStorage,
    public readonly path: ReadonlyArray<string>
  ) { }

  readonly key = keyFor(this.path)

  readonly name = this.path[this.path.length - 1]

  namespaceOf (): Namespace {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new Namespace(this.storage, this.path.slice(0, -1))
  }

  async get (): Promise<T> {
    assertStorageClosed(this.storage)
    const v = await this.storage.kvstorage.get(this.key) as T
    return v
  }

  async set (value: T): Promise<void> {
    assertStorageClosed(this.storage)
    await this.storage.kvstorage.set(this.key, value)
  }

  exist (): Promise<boolean> {
    return this.storage.kvstorage.has(this.key)
  }

  delete (): Promise<void> {
    assertStorageClosed(this.storage)
    return this.storage.kvstorage.remove(this.key)
  }
}

export class Namespace {
  constructor (private readonly storage: LocalKVStorage, public readonly path: ReadonlyArray<string>) { }

  private readonly namespaceKey = [...this.path, ''].join(NAMESPACE_SEP)

  /**
   * access a sub-namespace
   */
  namespace (name: string): Namespace {
    return new Namespace(this.storage, [...this.path, name])
  }

  /**
   * get the parent namespace
   */
  parent (): Namespace {
    // is the top-level namespace
    if (this.path.length === 0) {
      return this
    }

    return new Namespace(this.storage, this.path.slice(0, -1))
  }

  /**
   * get the root namespace
   */
  root (): Namespace {
    return new Namespace(this.storage, [])
  }

  /**
   * access a record (key-value pair) of the kvstorage under the namespace
   */
  record (name: string): Record {
    return new Record(this.storage, [...this.path, name])
  }

  /**
   * get all records under the namespace
   */
  async records (): Promise<Record[]> {
    assertStorageClosed(this.storage)
    const keys = await this.keys()
    return keys.map(k => new Record(this.storage, pathOf(k)))
  }

  /**
   * get all keys under the namespace (including keys in sub-namespaces)
   */
  async keys (): Promise<string[]> {
    assertStorageClosed(this.storage)
    const l = await this.storage.kvstorage.keys()
    return l.filter((k) => {
      if (k === INIT_KEY) return false // ignore the initialization record key
      if (k.startsWith(PINLIST_KEY_PREFIX + NAMESPACE_SEP)) return false // ignore any pinlist
      return k.startsWith(this.namespaceKey)
    })
  }
}

/**
 * The **local-only** key-value storage for PaperDB,  
 * can be the **Preference Storage**
 * 
 * implements the consistent API style as the rest of PaperDB
 * 
 * works in Browser, Node.js, and Cordova/Ionic  
 * 
 * @example
 * // create
 * const storage = await LocalKVStorage.create({ directory: '/path/to/db' })
 * const storageRoot = storage.root
 * 
 * // access a record (key-value pair)
 * const record = storageRoot.record('r1')
 * await record.set(123)
 * console.log(await record.exist()) // true
 * console.log(await record.get()) // 123
 * await record.delete()
 * 
 * // access a namespace
 * const ns = storageRoot.namespace('ns1')
 * // access a record under the namespace
 * const record2 = ns.record('r2')
 * // get all records under the namespace
 * console.log(await ns.records())
 */
export class LocalKVStorage {
  /**
   * @param kvstorage an initialized `@paper-db/kv-storage` instance
   */
  constructor (public kvstorage: KVStorage) { }

  readonly root = new Namespace(this, [])

  private closed = false

  /**
   * access a record (key-value pair) of the kvstorage
   */
  recordOf (key: string): Record {
    return new Record(this, pathOf(key))
  }

  /**
   * close the kvstorage
   */
  close (): Promise<void> {
    this.closed = true
    return this.kvstorage.close()
  }

  /**
   * create a LocalKVStorage instance
   * @param options options for the entire PaperDB
   */
  static async create (options?: Options): Promise<LocalKVStorage> {
    const directory = options?.directory ?? DEFAULT_OPTIONS.directory
    const name = options?.name || DEFAULT_OPTIONS.name

    if (!(/^\w+$/.test(name))) {
      throw new TypeError('The `name` option must be alphanumeric, with underscores (`/^\\w+$/`)')
    }

    const storagePath = path.join(directory, 'kvstorage')

    const kvstorage = new KVStorage({
      name,
      storeName: 'kvstorage',
      dbKey: name,
      path: storagePath,
    })

    await kvstorage.ready()
    await kvstorage.set(INIT_KEY, true)

    return new LocalKVStorage(kvstorage)
  }
}

export default LocalKVStorage

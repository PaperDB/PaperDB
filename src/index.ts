
import { Options, DEFAULT_OPTIONS } from './options'
import { TYPE_REGISTRY } from './types'
import { createIPFSInstance } from './ipfs'
import { PaperOrbitDB } from './orbit-db'
import { LocalKVStorage } from './local-kv'
import { collectionAPIFactory } from './collections'
import { filesAPIFactory } from './files'

import type IPFS from 'ipfs'

export class PaperDB {
  /**
   * the default type converter registry for any PaperDB instance
   */
  readonly TYPE_REGISTRY = TYPE_REGISTRY

  /**
   * the options for the entire PaperDB
   */
  readonly options: Readonly<Options>

  /**
   * Main API - local key-value storage
   * 
   * the public API for the local key-value storage
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get kv () {
    return this._localkv.root
  }

  /**
   * NOT a public API,  
   * use `PaperDB.create` instead
   * @hideconstructor
   */
  constructor (
    /** the IPFS instance being used */
    public readonly ipfs: IPFS,
    /** the PaperOrbitDB (based on OrbitDB) instance being used */
    private readonly _db: PaperOrbitDB,
    /** the local key-value storage instance being used */
    private readonly _localkv: LocalKVStorage,
    options: Options
  ) {
    this.options = Object.freeze(
      Object.assign({}, DEFAULT_OPTIONS, options)
    )
  }

  /**
   * create a new PaperDB instance
   * @param options options for the entire PaperDB
   */
  static async create (options: Options): Promise<PaperDB> {
    const ipfs = await createIPFSInstance(options)
    const _db = await PaperOrbitDB.createInstance(ipfs, options)
    const _localkv = await LocalKVStorage.create(options)

    return new PaperDB(ipfs, _db, _localkv, options)
  }

  /**
   * close PaperDB
   */
  async close (): Promise<void> {
    await this._db.stop()
    await this.ipfs.stop()
    await this._localkv.close()
  }

  /**
   * Main API - PaperDB Collections  
   * 
   * ```ts
   * interface CollectionAPI {
   *  // get the collection reference
   *  (id: string): Collection
   *  // create a new PaperDB Collection
   *  create(creationOptions: CreationOptions): Promise<Collection>
   * }
   * ```
   */
  readonly collection = collectionAPIFactory(this)

  /**
   * Main API - IPFS/IPNS
   */
  readonly files = filesAPIFactory(this)
}

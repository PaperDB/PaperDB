/**
 * PaperDB Collection
 */

import type { PaperDB } from '../index'
import { createACCallback, DEFAULT_AC, PaperDBAccessController } from '../access-controller'
import { ORBIT_DATASTORE_NAME, toOrbitDBAddr } from '../address'
import { DatastoreMetadata } from '../collections'
import { LogStore } from '../orbit-db/logstore'
import { PreloadEntry, verify } from '../preload-entry'
import { createEventSubscriber, Promisable, UnsubFn } from '../utils'
import { Conversion, ConversionI, ERR_TYPED_OBJ_INVALID, TypedObj, TypedObjFrom } from './converter'
import { Document, PRELOAD_DOCUMENT_ID } from './doc'
import { getTypeConverter } from './type-registry'
import { createValidator } from './validator'

export const ERR_PRELOAD_ENTRY_INVALID = ((): Error => {
  const e = new Error('The preload document of the collection is invalid. Cannot validate the signature of the entry.')
  e.name = 'ERR_PRELOAD_ENTRY_INVALID'
  return e
})()

interface InstantLoadingResult<DocType extends ConversionI> {
  /**
   * the metadata of the OrbitDB datastore, in the db manifest file
   */
  metainfo?: any;

  /**
   * the Document Reference instance of the preload document
   */
  preloadDocRef?: Document<DocType>;
}

/**
 * the db manifest object (`JSON.parse(manifestFileContent)`)
 */
interface DatastoreManifest<DocType extends ConversionI> {
  name: typeof ORBIT_DATASTORE_NAME;
  type: typeof LogStore.type;
  accessController: string;
  meta: DatastoreMetadata<any, TypedObjFrom<DocType>>;
}

export interface CollectionRefObj extends TypedObj<'collection-ref', 0> {
  /**
   * the PaperDB collection id  
   * (base58btc encoded cid of the OrbitDB manifest file)
   */
  id: string;
}

@Conversion<CollectionRefObj>()
export class Collection<DocType extends ConversionI = any> {
  static readonly $type = 'collection-ref'
  static readonly $v = 0

  /**
   * create a new PaperDB Collection Reference (not loaded)
   * @param id the PaperDB collection id (base58btc encoded cid of the OrbitDB manifest file)
   * @param paperdb the root PaperDB instance
   */
  constructor (
    public readonly id: string,
    private readonly paperdb: PaperDB,
  ) { }

  toTypedObj (): CollectionRefObj {
    return {
      $type: Collection.$type,
      $v: 0,
      id: this.id,
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static fromTypedObj (obj: CollectionRefObj | Collection<any>, paperdb: PaperDB) {
    if (obj instanceof Collection) {
      return obj
    }

    // validate
    if (
      obj.$type !== this.$type ||
      obj.$v !== 0 ||
      typeof obj.id !== 'string'
    ) {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new Collection(obj.id, paperdb)
  }

  /**
   * IPFS Pin the db manifest file of the collection
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async pinManifest () {
    return this.paperdb.files.pin(this.id, 'collection_manifest')
  }

  /**
   * available after calling `await this.instantLoad()` if exists
   */
  private preloadEntry?: Readonly<PreloadEntry<TypedObjFrom<DocType>>>

  /**
   * the matainfo describing the collection  
   * available after calling `await this.instantLoad()` if exists
   */
  private metaInfo?: Readonly<object> | undefined

  /**
   * load the preload OrbitDB entry from the datastore metadata if exists
   * @param metadata the metadata of the OrbitDB Datastore
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private async loadPreloadEntry (metadata: DatastoreMetadata<any, TypedObjFrom<DocType>>) {
    if (metadata.preload) {
      if (!await verify(metadata.preload, this.paperdb['_db'].identity)) {
        throw ERR_PRELOAD_ENTRY_INVALID
      }

      if (this.doctype) {
        // validate whether the preloaded document object (preloadEntry.payload) is of the doctype specified (`this.doctype`)
        const typeValidator = createValidator(getTypeConverter(this.doctype), this.paperdb)
        if (!await typeValidator(metadata.preload.payload)) {
          throw new TypeError(`The preload document of the collection is invalid. The document is not of the type '${this.doctype}'`)
        }
      }

      return Object.freeze(metadata.preload)
    }
  }

  /**
   * Retrieve the collection metainfo and the preload document instantly,  
   * useful for SEO and web crawlers (Googlebot)
   * 
   * Load the db manifest file from IPFS only   
   * (e.g. load from IPFS HTTP Gateways)  
   * 
   * Note:  
   * The collection is NOT `ready` .  
   * This method DOES NOT open/load the whole collection.
   */
  async instantLoad (): Promise<InstantLoadingResult<DocType>> {
    const manifestFile = await this.paperdb.files.get(this.id)
    const manifest: DatastoreManifest<DocType> = JSON.parse(manifestFile.toString('utf-8'))

    if (manifest.type !== LogStore.type || manifest.name !== ORBIT_DATASTORE_NAME) {
      throw new TypeError(`The OrbitDB manifest file loaded is invalid.`)
    }

    // load the preload OrbitDB entry of the collection if exists
    const dbMeta = manifest.meta
    const preloadEntry = await this.loadPreloadEntry(dbMeta)

    // IPFS Pin the db manifest file
    // do not block the control flow
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.pinManifest()

    // save states
    this.metaInfo = Object.freeze(dbMeta.metainfo)
    this.preloadEntry = preloadEntry

    return {
      metainfo: this.metaInfo,
      preloadDocRef: preloadEntry ? new Document(preloadEntry, this.paperdb) : undefined,
    }
  }

  /**
   * available after calling `await this.ready()`   
   * the value is undefined when the Collection is NOT ready
   */
  private logstore: LogStore
  private logstorePromise?: Promise<LogStore>

  /**
   * The PaperDB access controllers for this Collection  
   * 
   * use the `ACConstDocType` access controller by default (ensuring all documents in the collection are of the same type)  
   * 
   * Could be set to any custom access controllers BEFORE the Collection is ready
   */
  private accessControllers: ReadonlyArray<PaperDBAccessController<DocType>> = DEFAULT_AC

  /**
   * Set PaperDB access controllers for this Collection  
   * only available BEFORE the Collection is ready
   * 
   * Override the default PaperDB access controller `[ACConstDocType]` 
   */
  setAccessControllers (accessControllers: ReadonlyArray<PaperDBAccessController<DocType>>): this {
    if (this.logstore) {
      throw new Error('Access Controllers for a Collection cannot be changed after the Collection is ready.')
    }

    if (!Array.isArray(accessControllers)) {
      throw new TypeError('The `accessControllers` param must be an array.')
    }

    this.accessControllers = accessControllers

    return this
  }

  /**
   * The doctype that the PaperDB access controller `ACConstDocType` will use  
   */
  private doctype: string | undefined

  /**
   * Set the doctype that the PaperDB access controller `ACConstDocType` (also the default access controller) will use  
   * 
   * if omitted, the preload document's type will be used (if the preload document exists),  
   * `setDoctype` always has higher priority
   *  
   * only available BEFORE the Collection is ready
   */
  setDoctype (doctype: string | undefined): this {
    if (this.logstore) {
      throw new Error('The Collection doctype cannot be changed after the Collection is ready.')
    }

    this.doctype = doctype

    return this
  }

  /**
   * load the actual OrbitDB logstore from the reference
   */
  async ready (): Promise<void> {
    if (this.logstore) {
      return
    }

    if (!this.logstorePromise) {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      this.logstorePromise = (async () => {
        // Retrieve the collection metainfo and the preload document
        await this.instantLoad()

        const store = await this.paperdb['_db'].openDataStore(
          toOrbitDBAddr(this.id),
          createACCallback(this.accessControllers, this, this.paperdb)
        )

        this.logstore = store
        return store
      })()
    }

    await this.logstorePromise
  }

  /**
   * close the collection 
   */
  close (): Promise<void> {
    return this.logstore.close()
  }

  /**
   * get the matainfo describing the collection
   */
  async metainfo (): Promise<Readonly<object> | undefined> {
    await this.instantLoad()
    return this.metaInfo
  }

  /**
   * create a Document instance by the entry provided  
   * **NOT A PUBLIC API**
   * @param entry 
   */
  private _document (entry: PreloadEntry<TypedObjFrom<DocType>> | OrbitDBEntryLog<TypedObjFrom<DocType>>): Document {
    return new Document(entry, this.paperdb)
  }

  /**
   * Get a single document in the collection by its document id,  
   * The document id of the preload document is `PRELOAD_DOCUMENT_ID` (`__preload__`)
   */
  async doc (id: string | typeof PRELOAD_DOCUMENT_ID): Promise<Document<DocType>> {
    await this.ready()

    let entry: PreloadEntry<TypedObjFrom<DocType>> | OrbitDBEntryLog<TypedObjFrom<DocType>>
    if (id === PRELOAD_DOCUMENT_ID) {
      if (!this.preloadEntry) {
        throw new Error('The preload document does not exist.')
      }
      entry = this.preloadEntry
    } else {
      entry = this.logstore.get(id)
    }

    return this._document(entry)
  }

  /**
   * Retrieves all documents in the collection
   */
  async getAll (): Promise<Document<DocType>[]> {
    await this.ready()

    const entries = [
      this.preloadEntry,
      // the `limit` option is `-1`, to get all entries (no limit)
      ...this.logstore.iterator({ limit: -1 }).collect(),
    ]

    return entries
      .filter(Boolean) // if the preload entry does not exist, filter it (the `undefined`) out
      .map(e => this._document(e as NonNullable<typeof e>))
  }

  /**
   * add a document into the collection
   * 
   * Note:  
   * PaperDB does not provide the `delete` or `update` functionality,  
   * implement it on your own  (e.g. add a `delete` document)  
   * 
   * @param doc - a class instance of the doctype, or a Document instance
   * @param pin - IPFS pin the OrbitDB entry added
   * @returns a Document reference instance of the document added
   */
  async add (doc: Promisable<InstanceType<DocType> | Document<DocType>>, pin = true): Promise<Document<DocType>> {
    await this.ready()

    doc = await doc

    // the `doc` param is a Document reference instance
    if (doc instanceof Document) {
      // Retrieve data from the Document reference
      doc = await doc.data()
    }

    // convert the class instance to a TypedObj (a plain JSON object)
    const obj = await doc.toTypedObj()

    // add to the OrbitDB logstore
    const docId = await this.logstore.add(obj, { pin })

    // create the Document reference instance of the document added
    return this.doc(docId)
  }

  // delete (): never
  // update (): never

  /**
   * available after calling `await collection.ready()`
   * @see https://github.com/orbitdb/orbit-db/blob/master/API.md#store-events
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private get events () {
    return this.logstore.events
  }

  /**
   * Subscribe the event which is emitted when a new peer connects via ipfs pubsub  
   * @see https://github.com/orbitdb/orbit-db/blob/master/API.md#peer
   */
  async onPeer (cb: (/** @param peer id of the new peer */peer: string) => any): Promise<UnsubFn> {
    await this.ready()
    return createEventSubscriber(this.events, 'peer', cb)
  }

  /**
   * Subscribe the event which is emitted when the collection has synced with another peer.  
   * (inbound replication only, will not be emitted when adding documents by `collection.add`)
   * 
   * This is usually a good place to re-query the collection for updated results
   * 
   * @see https://github.com/orbitdb/orbit-db/blob/master/API.md#replicated
   */
  async onSnapshot (cb: () => any): Promise<UnsubFn> {
    await this.ready()
    return createEventSubscriber(this.events, 'replicated', cb)
  }
}

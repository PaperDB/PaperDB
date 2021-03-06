
import type { PaperDB } from './'
import { DEFAULT_AC, PaperDBAccessController } from './access-controller'
import { ORBIT_DATASTORE_NAME, toCollectionId } from './address'
import { buildEntry, PreloadEntry } from './preload-entry'
import { Collection } from './types/collection'
import { ConversionI, Convertible, TypedObj } from './types/converter'

export interface CollectionCreationOptions<MetaInfo extends object = any, PreloadDoc extends Convertible = Convertible> {
  /**
   * Set the doctype that the access controller `ACConstDocType` (also the default access controller) will use
   * 
   * documents in this collection are all of this type (registered in the `TYPE_REGISTRY`)
   * 
   * if omitted, the preload document's type will be used (if the preload document exists) 
   */
  doctype?: string;

  /**
   * the optional matainfo to describe the collection
   */
  metainfo?: MetaInfo;

  /**
   * the optional preload document of a collection,  
   * can boost the loading speed of the first document (using a IPFS HTTP Gateway to load the db manifest),  
   * useful for SEO and web crawlers (Googlebot)
   */
  preloadDoc?: PreloadDoc;

  /**
   * Access Controllers for this Collection  
   * 
   * use the `ACConstDocType` access controller by default  
   * (ensuring all documents in the collection are of the same type)
   */
  accessControllers?: ReadonlyArray<PaperDBAccessController>;
}

/**
 * the OrbitDB datastore metadata (in the db manifest file) of a PaperDB collection
 */
export interface DatastoreMetadata<MetaInfo extends object = any, PreloadDocObj extends TypedObj<any, any> = TypedObj<any, any>> {
  metainfo?: MetaInfo;
  preload?: PreloadEntry<PreloadDocObj>;
}

const validateDoctype = (doctype: string | undefined, paperdb: PaperDB): void => {
  if (doctype) {
    // validate the doctype provided
    const typeConverter = paperdb.TYPE_REGISTRY.get(doctype)
    if (!typeConverter) {
      throw new Error(`Cannot find the doctype ${doctype}. (ensure you registered it in the 'TYPE_REGISTRY')`)
    }
  }
}

/**
 * use of the API Factory:   
 * we can't define a property directly on a class method
 * @param paperdb the root PaperDB instance
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const collectionAPIFactory = (paperdb: PaperDB) => {
  /**
   * Get a collection by the collection id
   * @param id PaperDB collection id (base58btc encoded cid of the OrbitDB manifest file)
   * @param doctype The doctype that the access controller `ACConstDocType` (also the default access controller) will use, documents in this collection should be all of this type (registered in the `TYPE_REGISTRY`)
   * @param accessControllers access controllers for this Collection  
   */
  function collection<DocType extends ConversionI = any> (id: string, doctype?: string, accessControllers = DEFAULT_AC): Collection<DocType> {
    validateDoctype(doctype, paperdb)
    return new Collection<DocType>(
      id,
      paperdb)
      .setAccessControllers(accessControllers)
      .setDoctype(doctype)
  }

  /**
   * Create a new PaperDB Collection, or  
   * Load a Collection by its metainfo
   */
  collection.create = async function <DocType extends ConversionI = any> (options: CollectionCreationOptions): Promise<Collection<DocType>> {
    const doctype = options.doctype
    const accessControllers = options.accessControllers ?? DEFAULT_AC

    validateDoctype(doctype, paperdb)

    // build the preload entry
    const preloadEntry = await (
      options.preloadDoc
        ? buildEntry(await options.preloadDoc.toTypedObj(), paperdb['_db'].identity)
        : undefined
    )

    // determine the collection id (the orbit-db datastore address)
    // create a temporary datastore, not be used in the Collection
    /** 
     * @todo Refactor me!  
     * Is the manifest file stored in IPFS?  
     * Will the manifest file be GC-ed before getting the collection ready?  
     * Can we change the datastore's ACCallback after being created?
     */
    const _store = await paperdb['_db'].createDataStore(
      ORBIT_DATASTORE_NAME, // datastore name
      {
        metainfo: options.metainfo,
        preload: preloadEntry,
      } as DatastoreMetadata,
      // use the default placeholder orbit-db access controller callback
    )
    const collectionId = toCollectionId(_store.address.toString())
    await _store.close() // close the temporary datastore

    // create the Collection instance
    const collection = new Collection<DocType>(
      collectionId,
      paperdb
    ).setAccessControllers(accessControllers).setDoctype(doctype)

    // get the collection ready
    await collection['ready']()

    return collection
  }

  return collection
}

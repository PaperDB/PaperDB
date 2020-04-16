
import type { PaperDB } from './index'
import type { ACCallback } from './orbit-db/access-controller'
import { Collection } from './types/collection'
import { ConversionI, TypedObjFrom } from './types/converter'
import { Document } from './types/doc'
import { createValidator } from './types/validator'
import { getTypeConverter } from './types/type-registry'

/**
 * The basic interface for any PaperDB Access Controller function
 */
export interface PaperDBAccessController<DocType extends ConversionI = ConversionI> {
  (collection: Collection<DocType>, paperdb: PaperDB): ACCallback<TypedObjFrom<DocType>>;
}

/**
 * Allow Write if all documents in the collection are of the consistent type as the collection's doctype
 * 
 * Checks whether the payload of the orbitdb entry is of a specific type (TypedObj),  
 * if not, refuse writing into the orbitdb logstore
 */
export const ACConstDocType: PaperDBAccessController = (collection, paperdb) => {
  let doctype = collection['doctype'] // the doctype specified (`collection.doctype`) has higher priority
  if (!doctype) {
    const preloadEntry = collection['preloadEntry']
    if (preloadEntry?.payload?.$type) {
      // use the preload document's type
      doctype = preloadEntry.payload.$type as string
    } else {
      // throw new Error('No collection doctype specified.')
      return (): true => true // the placeholder access controller callback, NOOP
    }
  }

  // will be used if the preload document does not exist 
  const typeValidator = createValidator(getTypeConverter(doctype), paperdb)

  return async (entry): Promise<boolean> => {
    if (!entry) { return false }
    return typeValidator(entry.payload)
  }
}

/**
 * Allow Write if all documents in the collection are created by a constant user   
 * (the creator of the preload document)
 */
export const ACConstUser: PaperDBAccessController = (collection, paperdb) => {
  /** the user id for the constant user */
  let userId: string

  return async (entry): Promise<boolean> => {
    if (!entry || !entry.identity) {
      return false
    }

    const docRef = new Document(entry, paperdb)
    const currentUserId = await docRef.userId()

    // if the constant user is not stored
    if (!userId) {
      if (collection['preloadEntry']?.identity) { // if the preload document exists, use the creator of the preload document
        const preloadDocRef = new Document(collection['preloadEntry'], paperdb)
        userId = await preloadDocRef.userId()
      } else { // otherwise, use the first document provided
        userId = currentUserId
        return true // if this is the first document provided (set its user id), no need to check the user id again
      }
    }

    return userId === currentUserId
  }
}

/**
 * Combine all PaperDB access controllers, and
 * Create the final Access Controller Callback for the orbit-db logstore 
 * 
 * Allow Write if the operation (the entry) is allowed by all PaperDB access controllers
 */
export const createACCallback = <DocType extends ConversionI = ConversionI> (
  accessControllers: ReadonlyArray<PaperDBAccessController<DocType>>,
  collection: Collection<DocType>,
  paperdb: PaperDB,
): ACCallback<TypedObjFrom<DocType>> => {
  // get the ACCallbacks created by each PaperDB access controller
  const l = accessControllers.map(ac => ac(collection, paperdb))

  return async (entry, identitiesProvider): Promise<boolean> => {
    // the orbit-db datastore operation is allowed by all PaperDB access controllers
    // all ACCallbacks created by each PaperDB access controller return true
    for (const c of l) {
      const allow = await c(entry, identitiesProvider)
      if (!allow) {
        return false
      }
    }

    return true
  }
}

/**
 * The default PaperDB Access Controller is `ACConstDocType`
 * (ensuring all documents in the collection are of the same type)
 */
export const DEFAULT_AC = [ACConstDocType]

/**
 * PaperDB Document
 */

import type { PaperDB } from '../index'
import { getKeyHash } from '../orbit-db/identity-provider'
import { PreloadEntry } from '../preload-entry'
import { Promisable } from '../utils'
import { ConversionI, TypedObjFrom } from './converter'
import { getTypeConverter } from './type-registry'

export const PRELOAD_DOCUMENT_ID = '__preload__'

export class Document<DocType extends ConversionI = any> {
  private readonly docConverter: DocType

  /**
   * create a new PaperDB Document reference
   * @param entry an OrbitDB entry or the preloaded entry of a Collection
   * @param doctype the type converter of the document type
   * @param paperdb the root PaperDB instance
   */
  constructor (
    private readonly entry: PreloadEntry<TypedObjFrom<DocType>> | OrbitDBEntryLog<TypedObjFrom<DocType>>,
    doctype: string | DocType,
    private readonly paperdb: PaperDB,
  ) {
    this.docConverter = getTypeConverter(doctype)
  }

  /**
   * The ID of the document (a multihash)  
   * If the document is the the preload document, the id will be the `PRELOAD_DOCUMENT_ID` (`__preload__`)
   */
  get id (): string | typeof PRELOAD_DOCUMENT_ID {
    return (this.entry as OrbitDBEntryLog<TypedObjFrom<DocType>>).hash ??
      PRELOAD_DOCUMENT_ID // the hash property does not exist on the entry, so it is the preload document
  }

  /**
   * Retrieves all data in the document as a class instance of the DocType. 
   */
  async data (): Promise<InstanceType<DocType>> {
    return this.docConverter.fromTypedObj(this.entry.payload, this.paperdb) as Promisable<InstanceType<DocType>>
  }

  /**
   * get the user id of the document creator  
   * multihash of the entry creator/signer's IPFS/IPNS public key (Qm....)
   */
  userId (): Promise<string> {
    return getKeyHash(this.entry.identity.id)
  }
}

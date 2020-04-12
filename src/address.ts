
import { posix as path } from 'path'
import { cid as isIPFSCid } from 'is-ipfs'
import OrbitDB from '@paper-db/orbit-db'

interface OrbitDBAddress {
  /**
   * cid of the db manifest file
   */
  root: string;
  /**
   * the datastore name
   */
  path: string;
}

/**
 * the name of any OrbitDB datastore will always be this string,  
 * used in converting a PaperDB Collection id to the corresponding OrbitDB address
 */
export const ORBIT_DATASTORE_NAME = 'paperdb'

export const ERR_COLLECTION_ID_INVALID = new TypeError('The collection id must be a valid IPFS CID string.')
export const ERR_COLLECTION_ADDR_INVALID = new TypeError('not a valid OrbitDB address used internally in a PaperDB Collection')

/**
 * convert a PaperDB Collection id to the corresponding OrbitDB address
 * @param id the PaperDB Collection id
 */
export const toOrbitDBAddr = (collectionId: string): string => {
  if (!isIPFSCid(collectionId)) {
    throw ERR_COLLECTION_ID_INVALID
  }

  // import { posix as path } from 'path'
  return path.join('/orbitdb', collectionId, ORBIT_DATASTORE_NAME)
}

/**
 * convert a OrbitDB address to the PaperDB Collection id (cid of the db manifest file)
 * @param addr the OrbitDB address, used internally in a PaperDB Collection
 */
export const toCollectionId = (addr: string | OrbitDBAddress): string => {
  if (!addr) {
    throw ERR_COLLECTION_ADDR_INVALID
  }

  if (typeof addr['root'] !== 'string') {
    addr = OrbitDB['OrbitDBAddress'].parse(addr)
  }

  if ((addr as OrbitDBAddress).path !== ORBIT_DATASTORE_NAME) {
    throw ERR_COLLECTION_ADDR_INVALID
  }

  const id = (addr as OrbitDBAddress).root
  if (!isIPFSCid(id)) {
    throw ERR_COLLECTION_ADDR_INVALID
  }

  return id
}

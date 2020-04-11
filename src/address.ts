
import { posix as path } from 'path'
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

/**
 * convert a PaperDB Collection id to the corresponding OrbitDB address
 * @param id the PaperDB Collection id
 */
export const toOrbitDBAddr = (collectionId: string): string => {
  // import { posix as path } from 'path'
  return path.join('/orbitdb', collectionId, ORBIT_DATASTORE_NAME)
}

/**
 * convert a OrbitDB address to the PaperDB Collection id (cid of the db manifest file)
 * @param addr the OrbitDB address, used internally in a PaperDB Collection
 */
export const toCollectionId = (addr: string | OrbitDBAddress): string => {
  if (typeof addr['root'] !== 'string') {
    addr = OrbitDB['OrbitDBAddress'].parse(addr)
  }

  if ((addr as OrbitDBAddress).path !== ORBIT_DATASTORE_NAME) {
    throw new TypeError('not a valid OrbitDB address used internally in a PaperDB Collection')
  }

  return (addr as OrbitDBAddress).root
}

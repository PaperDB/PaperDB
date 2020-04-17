
import type { PaperDB } from './'
import { PINLIST_KEY_PREFIX } from './constants'
import { pathOf } from './local-kv'
import { stringifyIPFSPath } from './ipfs'
import { concatItBuffer, CancelablePromise } from './utils'
import { IPFSFile, FileData } from './types/ipfs-file'

import pMap from 'p-map'
import type CID from 'cids'

/**
 * use of the API Factory:   
 * we can't define a property directly on a class method
 * @param paperdb the root PaperDB instance
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const filesAPIFactory = (paperdb: PaperDB) => {
  /**
   * Retrieve data of the IPFS object
   * 
   * @param ipfsPath the path to the IPFS object,  
   *                 as [the `ipfsPath` param in `ipfs.cat`](https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#cat) ,  
   *                 can be:  
   *                     - a CID instance
   *                     - a base encoded CID string  
   *                     - a string including the ipfs/ipns handler, the CID string and the path to traverse to. For example:  
   *                       
   *                      '/ipfs/QmXEmhrMpbVvTh61FNAxP9nU7ygVtyvZA8HZDUaqQCAb66'
   *                      '/ipns/QmXBUF7nWwQeQfdiewCFUtQvb5YDPdMZ81J1EyfXpbeLVw/README.md'
   * 
   * @param size     size of the IPFS object in bytes,  
   *                 If the actual size exceeds the size here, will throw an error.
   */
  async function get (ipfsPath: string | CID, size?: number): Promise<Buffer> {
    const ref = stringifyIPFSPath(ipfsPath)
    const ipfsAltCat = paperdb.options.ipfsAltCat

    const promises: CancelablePromise<Buffer>[] = [
      (async (): Promise<Buffer> => { // work in both js-ipfs 0.40 and > 0.40
        // eslint-disable-next-line @typescript-eslint/await-thenable
        const l = await paperdb.ipfs.cat(ref, { length: size })
        if (l instanceof Buffer) {
          return l
        } else {
          return concatItBuffer(l)
        }
      })(),
    ]

    // if the alternative method to `ipfs.cat` exists,  
    // racing it with `ipfs.cat`
    if (ipfsAltCat) {
      promises.push(
        ...ipfsAltCat.map(fn => fn(ref, { length: size }))
      )
    }

    const buf = await Promise.race(promises)

    // promises may be cancelable 
    // cancel all unresolved promises
    promises.map(p => p.cancel?.())

    // add the data back to IPFS
    // in case that the data is fetched from the alternative `ipfs.cat` method, or
    // solve the possible bug that an object cannot be fetched multiple times from a single remote peer (possibly caused by the single wantlist)
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const l = await paperdb.ipfs.add(buf, { pin: true })
    if (!Array.isArray(l)) { // work in both js-ipfs 0.40 and > 0.40
      for await (const _ of l) {
        void (_) // do nothing
      }
    }

    return buf
  }

  /**
   * Add a file to IPFS
   * @param data 
   * @param name the human-readable filename of the file
   */
  function add (data: FileData, name?: string): Promise<IPFSFile> {
    return IPFSFile.upload(paperdb, data, name)
  }

  /**
   * Pin the IPFS object
   * 
   * @param cid the multihash (base encoded CID) to the IPFS object
   * @param pinList the name of the PinList (classify and save a list of pinned IPFS objects)
   */
  async function pin (cid: string, pinList = 'default'): Promise<void> {
    // pin
    await paperdb.ipfs.pin.add(cid, {
      recursive: true,
      // timeout: '5s',
    })

    // add the pinned IPFS objects cid to the PinList
    await paperdb.kv.namespace(PINLIST_KEY_PREFIX)
      .namespace(pinList)
      .record(cid)
      .set(null)
  }

  /**
   * List all cids to IPFS objects in the pinList
   */
  pin.list = async function (pinList = 'default'): Promise<string[]> {
    const records = await paperdb.kv.namespace(PINLIST_KEY_PREFIX)
      .namespace(pinList)
      .records()

    return records.map(r => r.name)
  }

  /**
   * Remove an IPFS object from the IPFS pinset
   */
  pin.delete = async function (cid: string): Promise<void> {
    // remove from the IPFS pinset
    await paperdb.ipfs.pin.rm(cid, {
      recursive: true,
    })

    // remove the cid from any local PinList
    const l = await paperdb.kv['storage'].kvstorage.keys()
    const keys = l.filter((k) => {
      const p = pathOf(k) // split into the key path
      if (p[0] === PINLIST_KEY_PREFIX && p[p.length - 1] === cid) {
        return true
      }
    })
    await pMap(keys, (k) => paperdb.kv['storage'].kvstorage.remove(k))
  }

  /**
   * Remove all IPFS objects in the pinList from the IPFS pinset
   * @returns list of cids removed
   */
  pin.deleteAll = async function (pinList = 'default'): Promise<string[]> {
    const records = await paperdb.kv.namespace(PINLIST_KEY_PREFIX)
      .namespace(pinList)
      .records()

    return pMap(records, async (r) => {
      const cid = r.name

      // remove from the IPFS pinset
      await paperdb.ipfs.pin.rm(cid, {
        recursive: true,
      })

      // remove from the local PinList
      await r.delete()

      return cid
    })
  }

  /**
   * Resolve the IPFS path provided to a base encoded CID string to the IPFS object
   */
  async function resolve (ipfsPath: string): Promise<string> {
    const res = await paperdb.ipfs.resolve(ipfsPath, {
      recursive: true,
    }) // /ipfs/<hash...>
    return res.split('/')[2] // [ '', 'ipfs', hash ]
  }

  return Object.freeze({
    get,
    add,
    pin,
    resolve,
  })
}

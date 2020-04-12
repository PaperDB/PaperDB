
import IPFS from 'ipfs'
import CID from 'cids'
import { path as isIPFSPath, cid as isIPFSCid, cidPath as isIPFSCidPath } from 'is-ipfs'
import configure from 'ipfs-http-client/src/lib/configure'
import { randomBytes } from 'libp2p-crypto'

import { Options, DEFAULT_OPTIONS } from './options'
import { KEYS_PASSWD, IPFS_CONFIG } from './constants'
import { globalthis } from './utils'

/**
 * test if `ipfs` implements interface-js-ipfs-core
 */
export const isIPFSInstance = async (ipfs: IPFS | any): Promise<boolean> => {
  // `ipfs` implements the IPFS APIs (interface-js-ipfs-core)
  try {
    const { version } = await ipfs.version()
    return typeof version === 'string'
  } catch (error) {
    return false
  }
}

/**
 * add an extra API Request method
 */
const buildKeyProtobufMethod = (): (
  /**
   * ipfs.key.protobuf:
   * export the PrivateKey/keypair as a protobuf serialization, as in libp2p-crypto marshalPrivateKey  
   * 
   * `func MarshalPrivateKey(k PrivKey) ([]byte, error)` https://github.com/libp2p/go-libp2p-core/blob/master/crypto/key.go#L354
   * 
   * @param name the local name for the key
   */
  (name: string) => Promise<ArrayBuffer>
) => {
  return configure(({ ky }) => {
    /**
     * @param name 
     */
    return async (name: string, options): Promise<ArrayBuffer> => {
      options = options || {}

      const searchParams = new URLSearchParams(options.searchParams)
      searchParams.set('arg', name)

      const res: Response = await ky.post('key/protobuf', {
        timeout: options.timeout,
        signal: options.signal,
        headers: options.headers,
        searchParams,
      })

      return res.arrayBuffer()
    }
  })
}

/**
 * create the IPFS instance, through js-ipfs or ipfs-http-client
 * @param options options for the entire PaperDB
 */
export const createIPFSInstance = async (options?: Options): Promise<IPFS> => {
  const directory = options?.directory ?? DEFAULT_OPTIONS.directory
  const ipfs = options?.ipfs ?? null

  // if `ipfs` is null or undefined 
  if (!ipfs) {
    // `ipfs` exists in the global context
    // use the global ipfs
    if (typeof globalthis.ipfs !== 'undefined') {
      return globalthis.ipfs as unknown as IPFS
    }

    // create a brand new IPFS instance
    return IPFS.create({
      repo: directory,
      config: IPFS_CONFIG,
      pass: KEYS_PASSWD,
      silent: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore, @typescript-eslint/ban-ts-comment
      // @ts-ignore
      EXPERIMENTAL: { 'pubsub': true },
    })
  }

  // if `ipfs` implements the IPFS API (interface-js-ipfs-core)
  if (await isIPFSInstance(ipfs)) {
    try { // check if `key.export` is implemented
      await ipfs.key.export('self', randomBytes(10).toString('hex'))
    } catch (_) {
      // add the extra API Request method, implemented in a custom go-ipfs
      ipfs.key['protobuf'] = buildKeyProtobufMethod()
    }

    return ipfs
  }

  throw new Error('Cannot create an IPFS instance')
}

/**
 * stringify a IPFS path
 * @see PaperDB.file.get
 */
export const stringifyIPFSPath = (ipfsPath: string | CID): string => {
  if (CID.isCID(ipfsPath)) {
    return (ipfsPath as CID).toString()
  } else if (isIPFSPath(ipfsPath) || isIPFSCid(ipfsPath) || isIPFSCidPath(ipfsPath)) {
    return ipfsPath as string
  } else {
    throw new TypeError('The `ipfsPath` provided is invalid.')
  }
}

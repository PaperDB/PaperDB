
import type IPFS from 'ipfs'
import { DEFAULT_NAME, DEFAULT_IPFS_KEY_NAME } from './constants'
import { CancelablePromise } from './utils'

type PickRequired<T, K extends keyof T> = {
  [P in K]-?: T[P];
}

type IPFSCatOptions = Parameters<IPFS['cat']>[1]

export interface Options {

  /**
   * Must be alphanumeric, with underscores. (`/^\w+$/`)
   */
  name?: string;

  /**
   * The IPFS instance being used.  
   * 
   * the value could be:   
   * - `null` (default): use the global `ipfs` object, or create a new instance of js-ipfs    
   * - an IPFS or ipfs-http-client instance, Must enable `pubsub` and key management
   */
  ipfs?: null | IPFS;

  /**
   * the directory to store all PaperDB data
   */
  directory?: string;

  /**
   * name of the IPFS/IPNS key to be used to sign the OrbitDB key/identity
   *                                    (and sign the IPNS record of the user information page)  
   * as listed by 'ipfs key list -l'.
   * If the key pair corresponding to the name can't be found, will create one.
   */
  ipfsKeyName?: string;

  /**
   * The alternative methods to `ipfs.cat` to boost the loading speed of the first document,  
   * e.g. load from IPFS HTTP Gateways
   * 
   * work with the preload document (`CollectionCreationOptions.preloadDoc`),  
   * useful for SEO and web crawlers (Googlebot),  
   * also a a user-friendly way to drop in cache, etc.
   */
  ipfsAltCat?: ((ipfsPath: string, options?: IPFSCatOptions) => CancelablePromise<Buffer>)[];

}

type RequiredOptions = 'name' | 'directory' | 'ipfs' | 'ipfsKeyName'

export const DEFAULT_OPTIONS: PickRequired<Options, RequiredOptions> = Object.freeze({
  name: DEFAULT_NAME,
  ipfs: null,
  ipfsKeyName: DEFAULT_IPFS_KEY_NAME,
  directory: typeof process !== 'undefined' ? `./.${DEFAULT_NAME}` : DEFAULT_NAME,
})

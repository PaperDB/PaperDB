
import IPFS from 'ipfs'
import OrbitDB from '@paper-db/orbit-db'
import Identities, { Identity } from 'orbit-db-identity-provider'
import AccessControllers from 'orbit-db-access-controllers'
import path from 'path'

import { Options, DEFAULT_OPTIONS } from '../options'

import LogStore from './logstore'
import PaperDBAC, { ACCallback } from './access-controller'
import IPFSIdentityProvider, { ensureIPFSKey } from './identity-provider'

OrbitDB.addDatabaseType(LogStore.type, LogStore)
AccessControllers.addAccessController({ AccessController: PaperDBAC })
Identities.addIdentityProvider(IPFSIdentityProvider)

interface StoreOptions<T = any, MetaData = any> {
  /**
   * metadata for this DataStore
   * only vaild when creating a new DataStore
   */
  meta?: MetaData;

  /**
   * path to the directory to save the DataStore data
   * @deprecated the data will be saved in the same directory of OrbitDB data
   */
  // directory?: string;

  /**
   * Whether the entry can be added to the local ipfs-log, from remote peers  
   * 
   * Note: local ipfs-log may not be loaded if the function returns a `false`,  
   *       so the entries must be backward compatible.
   */
  acCallback?: ACCallback<T>;
}

export class PaperOrbitDB {
  _orbitdb: OrbitDB;

  _ipfs: IPFS;

  /**
   * @param ipfs the ipfs instance
   * @param options options for the entire PaperDB
   */
  static async createInstance (ipfs: IPFS, options: Options): Promise<PaperOrbitDB> {
    const dir = options?.directory ?? DEFAULT_OPTIONS.directory
    const orbitDir = path.join(dir, 'orbit')

    const ipfsKeyName = typeof options.ipfsKeyName === 'string' ? options.ipfsKeyName : DEFAULT_OPTIONS.ipfsKeyName

    const orbitdbOptions = {
      AccessControllers: AccessControllers,
      directory: orbitDir,
      identity: (null as unknown as Identity),
    }

    // If the key pair corresponding to the ipfsKeyName can't be found, will create one.
    await ensureIPFSKey(ipfs, ipfsKeyName)

    const identityKeyStorePath = path.join(orbitDir, '/keystore')
    orbitdbOptions.identity = await Identities.createIdentity({
      ipfs,
      type: IPFSIdentityProvider.type,
      key: ipfsKeyName,
      identityKeysPath: identityKeyStorePath,
    })

    const instance = new this()
    instance._orbitdb = await OrbitDB.createInstance(ipfs, orbitdbOptions)
    instance._ipfs = ipfs

    return instance
  }

  /**
   * Close databases, connections, pubsub and reset orbitdb state.
   */
  stop (): Promise<void> {
    return this._orbitdb.stop()
  }

  private logstore (address: string, options?: OrbitDBIStoreOptions & StoreOptions): Promise<LogStore> {
    options = Object.assign({
      create: true,
      pin: true,
      type: LogStore.type,
      accessController: {
        type: PaperDBAC.type,
        callback: (options?.acCallback) || undefined,
      },
    }, options || {})

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore, @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this._orbitdb.open(address, options)
  }

  async createDataStore<T = any, MetaData = any> (name: string, metaData?: MetaData, acCallback?: ACCallback<T>): Promise<LogStore<T, MetaData>> {
    const store = await this.logstore(name, {
      meta: metaData,
      acCallback,
    })
    await store.load()
    return store
  }

  async openDataStore<T = any, MetaData = any> (address: string, acCallback?: ACCallback<T>): Promise<LogStore<T, MetaData>> {
    const store = await this.logstore(address, {
      acCallback,
    })
    await store.load()
    return store
  }

  get identity (): Identity {
    return this._orbitdb['identity']
  }
}

export default PaperOrbitDB

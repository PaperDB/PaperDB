
import { IdentityProvider, IdentityProviderOptions, IdentityAsJson } from 'orbit-db-identity-provider'
import IPFS from 'ipfs'
import crypto from 'libp2p-crypto'

import { getPrivateKey, importPublicKey } from '../identity-utils'

export interface Options extends IdentityProviderOptions {
  /**
   * an instance of IPFS
   */
  ipfs: IPFS;
  /**
   * name of the IPFS/IPNS key to be used to sign the OrbitDB key/identity,
   * as listed by 'ipfs key list -l'.
   */
  key: string;
}

export interface KeyPair {
  private: crypto.PrivateKey;
  public: crypto.PublicKey;
}

export const ERR_IDENTITY_JSON_INVALID = new Error('The identity json provided is invalid.')

/**
 * sign/verify OrbitDB Identity using the keys that sign IPNS records
 */
export class IPFSIdentityProvider extends IdentityProvider {
  _ipfs: IPFS;
  _keyName: string;
  _keyPair?: KeyPair;

  constructor (options: Options) {
    super(options)

    this._ipfs = options.ipfs
    this._keyName = options.key
  }

  /**
   * Returns the type of the identity provider
   */
  static get type (): 'ipfs' {
    return 'ipfs'
  }

  /**
   * load key pair from the IPFS keystore
   */
  private async _lookupKey (): Promise<KeyPair> {
    if (this._keyPair) {
      return this._keyPair
    }

    const keyName = this._keyName

    const privateKey = await getPrivateKey(this._ipfs, keyName)
    const publicKey = privateKey.public

    const keyPair = {
      private: privateKey,
      public: publicKey,
    }
    this._keyPair = keyPair

    return keyPair
  }

  /**
   * publicKey (encoded in base64) of the key pair from the IPFS keystore
   * @returns identity.id
   */
  async getId (): Promise<string> {
    const keyPair = await this._lookupKey()
    const publicKey = keyPair.public
    return crypto.keys.marshalPublicKey(publicKey).toString('base64')
  }

  /**
   * use a key to sign another key.
   * sign the OrbitDB key by the dedicated IPFS/IPNS key
   * @param data identity.publicKey + identity.signatures.id
   * @returns signature to the OrbitDB key by the IPFS/IPNS key - identity.signatures.publicKey (the name is confusing)
   */
  async signIdentity (data: string | Buffer): Promise<string> {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data, 'hex')
    }

    const keyPair = await this._lookupKey()
    const signedBuf = await keyPair.private.sign(data)
    return signedBuf.toString('base64')
  }

  /**
   * verify whether the OrbitDB key/identity (`identity.publicKey` + `identity.signatures.id`) is signed (`identity.signatures.publicKey`) by the IPFS/IPNS key corresponding to the publicKey offered (`identity.id`)
   */
  static async verifyIdentity (identity: IdentityAsJson): Promise<boolean> {
    if (!identity || !identity.id || !identity.publicKey || !identity.signatures || !identity.signatures.id || !identity.signatures.publicKey) {
      throw ERR_IDENTITY_JSON_INVALID
    }

    const key = importPublicKey(identity.id)
    const data = Buffer.from(identity.publicKey + identity.signatures.id, 'hex')
    const signature = Buffer.from(identity.signatures.publicKey, 'base64')

    // Verify that identity was signed by the Key
    return key.verify(data, signature)
  }
}

export default IPFSIdentityProvider

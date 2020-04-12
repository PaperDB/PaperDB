
import { IdentityProvider, IdentityProviderOptions, IdentityAsJson } from 'orbit-db-identity-provider'
import IPFS from 'ipfs'
import { UnofficialKeyProtobufMethod } from '../ipfs'

import crypto, { randomBytes } from 'libp2p-crypto'
import bs58 from 'bs58'

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

/**
 * If the key pair corresponding to the ipfsKeyName can't be found, will create one.
 * the `pass` property in `IPFS.create({ pass })` is required in order to have a valid IPFS keystore
 */
export const ensureIPFSKey = async (ipfs: IPFS, keyName: string): Promise<void> => {
  const keys: { name: string; id: string }[] = await ipfs.key.list()
  const found = keys.some(({ name }) => {
    return name === keyName
  })

  if (!found) {
    // create a new key corresponding to the name
    await ipfs.key.gen(keyName, {
      type: 'rsa',
      size: 2048,
    })
  }
}

/**
 * @param publicKeyBase64 identity.id
 */
export const importPublicKey = (publicKeyBase64: string): crypto.PublicKey => {
  const buf = Buffer.from(publicKeyBase64, 'base64')
  return crypto.keys.unmarshalPublicKey(buf)
}

export const getPrivateKey = async (ipfs: IPFS, keyName: string): Promise<crypto.PrivateKey> => {
  // If the key pair corresponding to the key name can't be found, will create one.
  await ensureIPFSKey(ipfs, keyName)

  if (ipfs.key['protobuf']) {
    // use the unofficial `ipfs.key.protobuf` method
    // export the PrivateKey/keypair as a protobuf serialization, as in libp2p-crypto marshalPrivateKey
    const keyData = await (ipfs.key['protobuf'] as UnofficialKeyProtobufMethod)(keyName)
    return crypto.keys.unmarshalPrivateKey(keyData)
  }

  // only for export/import pem
  const pass = randomBytes(10).toString('hex')

  // export pem string of the key from the IPFS keystore
  const pem = await ipfs.key.export(keyName, pass)

  // re-import the key from pem string to create an instance of RsaPrivateKey
  const privateKey = await crypto.keys.import(pem, pass)
  return privateKey
}

/**
 * identity.id (publicKey) -> Qm....
 */
export const getKeyHash = async (publicKeyBase64: string): Promise<string> => {
  const publicKey = importPublicKey(publicKeyBase64)
  const hash = await publicKey.hash()
  return bs58.encode(hash)
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
    if (!identity || !identity.id || !identity.publicKey || !identity.signatures?.id || !identity.signatures?.publicKey) {
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

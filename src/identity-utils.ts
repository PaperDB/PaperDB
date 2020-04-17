
import type IPFS from 'ipfs'
import crypto, { randomBytes } from 'libp2p-crypto'
import bs58 from 'bs58'

import { UnofficialKeyProtobufMethod } from './ipfs'

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

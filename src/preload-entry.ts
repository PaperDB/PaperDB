/**
 * sign/verify the preloaded document/entry in the OrbitDB datastore's metadata
 */

import { Identity } from 'orbit-db-identity-provider'
import { Json } from './utils'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PreloadEntry<PAYLOAD> extends Pick<OrbitDBEntryLog<PAYLOAD>, 'payload' |'identity' | 'sig'> {}

/**
 * sign and build the preloaded entry in the OrbitDB datastore's metadata
 */
export const buildEntry = async <PAYLOAD extends Json>(payload: PAYLOAD, identity: Identity): Promise<PreloadEntry<PAYLOAD>> => {
  const signature = await identity.provider.sign(identity, Buffer.from(JSON.stringify(payload)))

  return {
    payload: Object.freeze(payload),
    identity: identity.toJSON(),
    sig: signature,
  }
}

/**
 * Verify the entry signature of the preloaded entry
 * @see node_modules/ipfs-log/src/entry.js
 * @returns the signature is valid
 */
export const verify = async <PAYLOAD = object>(entry: PreloadEntry<PAYLOAD>, identity: Identity): Promise<boolean> => {
  if (!identity || !identity.provider) throw new Error('identity.provider is required, cannot verify entry')
  if (!entry.identity) throw new Error("Entry doesn't have a identity")
  if (!entry.sig) throw new Error("Entry doesn't have a signature")

  return identity.provider.verify(entry.sig, entry.identity.publicKey, Buffer.from(JSON.stringify(entry.payload)), 'v1')
}

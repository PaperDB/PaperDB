
export const DEFAULT_NAME = 'paperdb'

/**
 * A passphrase to encrypt/decrypt ipfs keys.  
 * We don't really need it, but it is required if we need to generate keys,  
 * so use a constant value instead.
 * 
 * at least 20 bytes
 */
export const KEYS_PASSWD = 'a'.repeat(20)

/**
 * the default name of the ipfs key  
 * (the key used to sign the OrbitDB identity, and sign the IPNS record of the user information page)
 */
export const DEFAULT_IPFS_KEY_NAME = 'userkey'

/**
 * the key-value storage key prefix of the any PinList
 * @see ./files.ts
 */
export const PINLIST_KEY_PREFIX = '__pinlist__'

/**
 * the default IPFS config
 */
export const IPFS_CONFIG = {
  'Addresses': {
    'API': '/ip4/127.0.0.1/tcp/0',
    'Swarm': ['/ip4/0.0.0.0/tcp/0'],
    'Gateway': '/ip4/0.0.0.0/tcp/0',
  },
  'Bootstrap': [],
  'Discovery': {
    'MDNS': { 'Enabled': true, 'Interval': 1 },
    'webRTCStar': { 'Enabled': false },
  },
}

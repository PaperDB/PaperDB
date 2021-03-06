
import { env } from './utils'

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

const WEBSOCKET_STAR_SERVERS = [
  '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
  '/dns4/raw.chat/tcp/4000/wss/p2p-websocket-star',
  '/dns4/1.wsstar.aira.life/tcp/443/wss/p2p-websocket-star/',
  '/dns4/2.wsstar.aira.life/tcp/443/wss/p2p-websocket-star/',
  '/dns4/3.wsstar.aira.life/tcp/443/wss/p2p-websocket-star/',
  '/dns4/ws-star1.par.dwebops.pub/tcp/443/wss/p2p-websocket-star/',
  '/dns4/libp2p-signaling.herokuapp.com/tcp/443/wss/p2p-websocket-star/',
  '/dns4/ws.syn.ci/tcp/443/wss/p2p-websocket-star',
  '/dns4/ren.chlu.io/tcp/443/wss/p2p-websocket-star',
]

/**
 * the default IPFS config  
 * using different configs in Node.js and Browser 
 */
export const IPFS_CONFIG = !env.isBrowserLike
  ? { // for Node.js
    'Addresses': {
      'Swarm': [
        '/ip4/0.0.0.0/tcp/0',
        '/ip6/::/tcp/0',
        '/ip4/127.0.0.1/tcp/0/ws',
        ...WEBSOCKET_STAR_SERVERS,
      ],
      'API': '/ip4/127.0.0.1/tcp/0',
      'Gateway': '/ip4/127.0.0.1/tcp/0',
    },
    /**
     * @todo add Bootstrap addresses, but do not overwrite the orginal addresses
     */
    // 'Bootstrap': [],
  }
  : { // for Browser
    'Addresses': {
      'Swarm': [
        ...WEBSOCKET_STAR_SERVERS,
      ],
    },
  }

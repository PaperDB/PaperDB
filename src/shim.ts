
/**
 * An in-memory shim of the IndexedDB API,
 * for Firefox Private Mode / Tor Browser
 */

import { globalthis, env } from './utils'

const needShim = async (): Promise<boolean> => {
  if (env.isBrowser || env.isWebWorker) {
    if (!globalthis.indexedDB) {
      return true
    }

    return new Promise((resolve) => {
      const db = globalthis.indexedDB.open('inPrivate')
      db.onsuccess = (): void => resolve(false)
      db.onerror = (): void => resolve(true)
    })
  }

  return false
}

export const indexeddbShim = async (): Promise<void> => {
  if (await needShim()) {
    require('fake-indexeddb/auto.js')
  }
}

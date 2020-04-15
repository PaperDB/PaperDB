
/* istanbul ignore file */

/**
 * An in-memory shim of the IndexedDB API,
 * for Firefox Private Mode / Tor Browser
 */

import { globalthis, env } from './utils'

import fakeIndexedDB from 'fake-indexeddb/build/fakeIndexedDB'
import FDBCursor from 'fake-indexeddb/build/FDBCursor'
import FDBCursorWithValue from 'fake-indexeddb/build/FDBCursorWithValue'
import FDBDatabase from 'fake-indexeddb/build/FDBDatabase'
import FDBFactory from 'fake-indexeddb/build/FDBFactory'
import FDBIndex from 'fake-indexeddb/build/FDBIndex'
import FDBKeyRange from 'fake-indexeddb/build/FDBKeyRange'
import FDBObjectStore from 'fake-indexeddb/build/FDBObjectStore'
import FDBOpenDBRequest from 'fake-indexeddb/build/FDBOpenDBRequest'
import FDBRequest from 'fake-indexeddb/build/FDBRequest'
import FDBTransaction from 'fake-indexeddb/build/FDBTransaction'
import FDBVersionChangeEvent from 'fake-indexeddb/build/FDBVersionChangeEvent'

const loadShim = (): void => {
  // replace `require('fake-indexeddb/auto.js')`
  // using Object.defineProperty, 
  // as properties on the globalThis (window, global, self) object is non-writable
  Object.defineProperty(globalthis, 'indexedDB', { value: fakeIndexedDB })
  Object.defineProperty(globalthis, 'IDBCursor', { value: FDBCursor })
  Object.defineProperty(globalthis, 'IDBCursorWithValue', { value: FDBCursorWithValue })
  Object.defineProperty(globalthis, 'IDBDatabase', { value: FDBDatabase })
  Object.defineProperty(globalthis, 'IDBFactory', { value: FDBFactory })
  Object.defineProperty(globalthis, 'IDBIndex', { value: FDBIndex })
  Object.defineProperty(globalthis, 'IDBKeyRange', { value: FDBKeyRange })
  Object.defineProperty(globalthis, 'IDBObjectStore', { value: FDBObjectStore })
  Object.defineProperty(globalthis, 'IDBOpenDBRequest', { value: FDBOpenDBRequest })
  Object.defineProperty(globalthis, 'IDBRequest', { value: FDBRequest })
  Object.defineProperty(globalthis, 'IDBTransaction', { value: FDBTransaction })
  Object.defineProperty(globalthis, 'IDBVersionChangeEvent', { value: FDBVersionChangeEvent })
}

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
    loadShim()
  }
}

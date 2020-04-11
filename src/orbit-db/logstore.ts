/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import IPFS from 'ipfs'
import EventStore from 'orbit-db-eventstore'
import { Identity } from 'orbit-db-identity-provider'

export type DBEntryHash = string

/** If hash not found when passing gt, gte, lt, or lte, the iterator will return all items (respecting limit and reverse). */
export interface IteratorOptions {
  /** Greater than, takes an item's hash. */
  gt?: string;
  /** Greater than or equal to, takes an item's hash. */
  gte?: string;
  /** Less than, takes an item's hash. */
  lt?: string;
  /** Less than or equal to, takes an item's hash value. */
  lte?: string;
  /** Limiting the entries of result, defaults to 1, and -1 means all items (no limit). */
  limit?: number;
  /** If set to true will result in reversing the result. */
  reverse?: boolean;
}

export interface LogStoreIterator<T> {
  [Symbol.iterator] ();
  next (): { value: OrbitDBEntryLog<T>; done: boolean };
  collect (): OrbitDBEntryLog<T>[];
}

export class LogStore<T = any, MetaData = any> extends EventStore<T> {
  constructor (ipfs: IPFS, identity: Identity, dbAddr: string, options: object) {
    super(ipfs, identity, dbAddr, options)

    this['_type'] = LogStore.type
  }

  add (data: T, options = {}): Promise<DBEntryHash> {
    options = Object.assign({}, { pin: true }, options)
    return this._addOperation(data, options)
  }

  // @ts-ignore
  get (hash: DBEntryHash): OrbitDBEntryLog<T> {
    // @ts-ignore
    return super.get(hash)
  }

  // @ts-ignore
  iterator (options: IteratorOptions): LogStoreIterator<T> {
    // @ts-ignore
    return super.iterator(options)
  }

  get metaData (): MetaData {
    // @ts-ignore
    return this.options.meta
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  static get type () {
    return 'paperdb:logstore' as const
  }
}

export default LogStore

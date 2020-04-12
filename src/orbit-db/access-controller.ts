/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import AccessController from 'orbit-db-access-controllers/src/access-controller-interface'
import Identities from 'orbit-db-identity-provider'
import OrbitDB from '@paper-db/orbit-db'

export type ACCallback<T = any> = (entry: OrbitDBEntryLog<T>, identitiesProvider?: Identities) => Promise<boolean> | boolean

export interface ACOptions<T = any> {
  type: 'paperdb';
  callback: ACCallback<T>;
}

const NOOP: ACCallback = function () { return true }

export class PaperDBAC<EntryPayloadType> extends AccessController {
  _callback: ACCallback<EntryPayloadType> = NOOP;

  constructor (callback?: ACCallback<EntryPayloadType>) {
    super()
    this._callback = typeof callback === 'function' ? callback : NOOP
  }

  static get type () {
    return 'paperdb' as const
  }

  static get version (): '1.0.0' {
    return '1.0.0'
  }

  // @ts-ignore
  async canAppend (entry: OrbitDBEntryLog<EntryPayloadType>, identitiesProvider: Identities): Promise<boolean> {
    try {
      return this._callback(entry, identitiesProvider)
    } catch (err) {
      console.error(err)
      return true
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async save () {
    // return parameters needed for loading
    return {
      version: PaperDBAC.version,
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  static async create<T> (orbitdb: OrbitDB, acOptions?: ACOptions<T>) {
    const callback = acOptions?.callback
    return new PaperDBAC(callback)
  }
}

export default PaperDBAC


/**
 * ponyfill for globalThis  
 * https://v8.dev/features/globalthis  
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const globalthis = require('ipfs-utils/src/globalthis')

interface Env {
  isTest: boolean;
  isElectron: boolean;
  isElectronMain: boolean;
  isElectronRenderer: boolean;
  isNode: boolean;
  isBrowser: boolean;
  isWebWorker: boolean;
  isEnvWithDom: boolean;
}

/**
 * the environment that the program is running on
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const env: Env = require('ipfs-utils/src/env')

/**
 * all valid data types in a json object 
 */
export type Json = string | number | boolean | null | { [property: string]: Json } | Json[];

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array
export type Bytes = Buffer | ArrayBuffer | TypedArray

/**
 * Create a type that represents either the value or the value wrapped in `PromiseLike`.
 * https://github.com/sindresorhus/type-fest/blob/master/source/promisable.d.ts
 */
export type Promisable<T> = T | PromiseLike<T>;

export type NonPromisable<T> = T extends PromiseLike<infer R> ? R : T;

export interface CancelablePromise<T> extends Promise<T> {
  cancel?(): void;
}

export type UnsubFn = () => void

/**
 * @param eventEmitter
 * @param eventName the event name
 * @param cb the event listener callback
 * @returns an `unsub` function which can unsubscribe the event
 */
export const createEventSubscriber = (eventEmitter: import('events').EventEmitter, eventName: string, cb: (...args: any[]) => void): UnsubFn => {
  /**
  * unsubscribe the event
  */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const unsub = () => {
    eventEmitter.removeListener(eventName, cb)
  }

  eventEmitter.addListener(eventName, cb)

  return unsub
}

/**
 * Concat all buffers yielded from an async iterable into a single Buffer.
 */
export const concatItBuffer = async (iterable: AsyncIterable<Buffer>): Promise<Buffer> => {
  const l: Buffer[] = []
  for await (const buf of iterable) {
    l.push(buf)
  }
  return Buffer.concat(l)
}

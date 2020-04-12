
/**
 * ponyfill for globalThis  
 * https://v8.dev/features/globalthis  
 * https://mathiasbynens.be/notes/globalthis
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const globalthis = (function () {
  // eslint-disable-next-line no-undef
  if (typeof globalThis === 'object') return globalThis

  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Object.prototype, '__global__', {
    get: function () {
      return this
    },
    configurable: true,
  })

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore, @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const gt = __global__ // eslint-disable-line no-undef
  delete Object.prototype['__global__']

  return gt
}())

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
const env: Env = require('ipfs-utils/src/env')
export { env }

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

/**
 * makes a class implement both normal interface & static interface
 * 
 * a class decorator
 * 
 * @example
 * `@staticImplements<StaticInterface>()
 * class A implements ClassInterface { }
 */
export const staticImplements = <T> () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @typescript-eslint/explicit-function-return-type
  return (constructor: T) => { }
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

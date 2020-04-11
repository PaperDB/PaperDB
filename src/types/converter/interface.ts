
import type { PaperDB } from '../../index'
import { Promisable, NonPromisable } from '../../utils'
import { TypedObj } from './typed-obj'

/**
 * any class implements this interface can be converted to a TypedObj using `c.toTypedObj()`
 */
export interface Convertible<OBJ extends TypedObj<any, any> = TypedObj<any, any>> {
  /**
   * Convert the class instance to the target TypedObj format
   * 
   * If a property value of the target TypedObj format is also a TypedObj, convert it from its class instance as well,
   * using `ClassInstanceA.toTypedObj()`
   * @example
   * async toTypedObj() {
   *    return {
   *      $type: 'type-x',
   *      $v: 2,
   *      name: this.name as string,
   *      date: await (new PaperDBDate(this.date as Date).toTypedObj())
   *    }
   * }
   */
  toTypedObj (): Promisable<OBJ>;
}

/**
 * any class implements this interface can convert a `TypedObject` to a single data type (complex object or class instance)
 * @static
 */
export interface Converter<OBJ extends TypedObj<any, any> = TypedObj<any, any>, DATA = Convertible<OBJ>> extends Pick<OBJ, '$type' | '$v'> {
  readonly $type: OBJ['$type'];
  readonly $v: OBJ['$v'] extends undefined ? (undefined | 1) : NonNullable<OBJ['$v']>;

  /**
   * Convert a TypedObj (the `obj` param) to the target data type (`DATA`)
   * 
   * if `obj` is invalid (or can't be converted to the target data type),  
   * throw an error,  
   * useful if `this.isValidTypedObj` is omitted
   * 
   * @param obj
   * the `obj` param might be:
   * - a plain object follows the specific TypedObj format, has all valid `$type` and `$v` (`$v` can be omitted if it is 1), and other properties  
   * --  ~~if a property value is also a TypedObj, it might have already been converted to its target data type~~ (will never happen, as the `obj` always converts as a whole) 
   * - an instance of the target data type, returns itself or wrapped with `new D(obj) -> D`
   * - other class instances that can be converted to the target data type (`DATA`)
   * 
   * @param paperdb - the root PaperDB instance
   */
  fromTypedObj (obj: OBJ, paperdb: PaperDB): Promisable<DATA>;

  /**
   * Check whether the given `obj` follows the specific TypedObj format, has all valid properties (and the valid `$type` and `$v`)
   * 
   * If omitted, the default mechanism is to check if `await this.fromTypedObj(obj)` throws an error
   */
  isValidTypedObj?: (obj: OBJ, paperdb: PaperDB) => Promisable<boolean>;
}

export const ERR_TYPED_OBJ_INVALID = new TypeError('The `obj` parameter is invalid.')

/**
 * a class decorator indicates that the class is designed for TypedObj conversion,  
 * 
 * implements both the `Converter` interface (static methods and properties), and the `Convertible` interface (normal methods)
 * 
 * @example
 * `@Conversion<TypedObj<'date'>>()
 * class PaperDBDate extends Date { }
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const Conversion = <OBJ extends TypedObj<any, any>> () => {
  type Static = Converter<OBJ>
  type Normal = Convertible<OBJ>

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  return (constructor: Static & { new(...args: any[]): Normal }): void => { }
}

/**
 * the basic interface for common PaperDB Type converters  (class designed for TypedObj conversion)
 */
export interface ConversionI<OBJ extends TypedObj<any, any> = TypedObj<any, any>> extends Converter<OBJ> {
  new(): Convertible<OBJ>;
}

/**
 * get the TypedObj return value of a Convertible class
 */
export type TypedObjResult<T extends Convertible> = NonPromisable<ReturnType<T['toTypedObj']>>

/**
 * get the TypedObj which the Converter class can convert from
 */
export type TypedObjFrom<T extends Converter> = Parameters<T['fromTypedObj']>[0]

export const isValidTypeConverter = <Type extends string = string> (converter: Converter, type?: Type): converter is Converter<TypedObj<Type>> => {
  if (!converter) {
    return false
  }

  if (type && converter.$type !== type) {
    return false
  }

  return typeof converter.$type === 'string' &&
    (typeof converter.$v === 'number' || typeof converter.$v === 'undefined') &&
    typeof converter.fromTypedObj === 'function'
}

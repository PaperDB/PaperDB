
import { ConversionI, isValidTypeConverter } from './converter'
import * as Types from './types'

/**
 * the registration map for the default type converter registry (TYPE_REGISTRY)
 */
export interface TypeRegistration {
  'date': typeof Types.PaperDBDate;
  'timestamp': typeof Types.PaperDBTimestamp;
  'ipfs:file': typeof Types.IPFSFile;
  'collection-ref': typeof Types.Collection;
  /** @todo */

}

/**
 * the default type converters
 */
export const CONVERTERS = [
  Types.PaperDBDate,
  Types.PaperDBTimestamp,
  Types.IPFSFile,
  Types.Collection,
  /** @todo */

]

/**
 * The basic class for the default type converter registry (TYPE_REGISTRY)
 * 
 * @summary
 * Using a PaperDB native-supported data type (JSON supported types) is often not very convenient,  
 * so PaperDB supports converting between `TypedObject`s and the registered data types
 * 
 * Note:  
 * The TypeConverter versioning (`$v`) is not implemented.  
 * Implemented it on your own. (using a generic TypeConverter class that can handle multiple data type versions)
 */
export class ConverterRegistry<Registration extends { [type: string]: ConversionI }> {
  /**
   * The internal registration map of `TypeConverter`s
   * @type `Map<{$type}, ConversionI>`
   */
  private readonly typeReg = new Map<string, ConversionI>();

  constructor (converters: ReadonlyArray<Registration[keyof Registration]>) {
    // add initial converters to the registry
    converters.forEach((c) => {
      if (c) {
        this.add(c as any as ConversionI)
      }
    })
  }

  /**
   * Add a TypeConverter class to the registry  
   * 
   * If a TypeConverter class with the same name (`$type`) exists, the old one will be overwritten
   */
  add (converter: ConversionI): this {
    const $type = converter.$type
    this.typeReg.set($type, converter)
    return this
  }

  get<T extends keyof Registration> (type: T): Registration[T];
  get (type: string): ConversionI | undefined {
    const converter = this.typeReg.get(type)
    // no type converter of this type exists
    if (!converter) {
      return
    }

    // validate the TypeConverter
    const valid = converter.$type === type
    if (!valid) {
      throw new TypeError('The TypeConverter from the Registry does not match the type provided.')
    }

    return converter
  }
}

/**
 * TypeRegistry:  
 * the default type converter registry (`ConverterRegistry`)
 * 
 * Register custom type converters to PaperDB:
 * @example
 * ```
 *   import { TypeConverter, TYPE_REGISTRY } from `@paper-db/paper-db/src/types`
 *   
 *   // create a custom type converter
 *   `@`TypeConverter.Conversion() // the decorator is for type checking, can be safely omitted
 *   class Type1 {
 *   
 *   }
 * 
 *   // add the converter into the TYPE_REGISTRY
 *   TYPE_REGISTRY.add(Type1)
 *   
 *   // add into the TypeRegistration interface
 *   declare module `@paper-db/paper-db/src/types` {
 *     interface TypeRegistration {
 *       'type1': TypeConverter.Converter;
 *     }
 *   }
 *   
 *   // TypeScript typings will work properly
 *   TYPE_REGISTRY.get('type1')
 * ```
 * 
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-ts-ignore
// @ts-ignore
export const TYPE_REGISTRY = new ConverterRegistry<TypeRegistration>(CONVERTERS)

/**
 * get a type converter class of the given name from the `TYPE_REGISTRY`
 * @param type the type name or the type converter class
 */
export const getTypeConverter = <T extends ConversionI = any> (type: T | string): T => {
  if (typeof type === 'string') {
    const converter = TYPE_REGISTRY.get(type)
    if (!converter) {
      throw new Error(`Cannot find the doctype ${type}. (Make sure you registered it in the 'TYPE_REGISTRY')`)
    }

    return converter as T
  } else {
    if (!isValidTypeConverter(type)) {
      throw new TypeError('The doctype param is invalid')
    }

    return type
  }
}

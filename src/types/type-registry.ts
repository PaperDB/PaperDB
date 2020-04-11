
import { ConverterRegistry, ConversionI, isValidTypeConverter } from './converter'
import * as Types from './types'

/**
 * interface for the default type converter registry (TYPE_REGISTRY)
 */
export interface TypeRegistry<Registration> {
  get<T extends keyof Registration> (type: T): Registration[T];
  get (type: string): ConversionI;

  add (converter: ConversionI);
}

export interface TypeRegistryI<Registration> {
  new (converters: ReadonlyArray<Registration[keyof Registration]>): TypeRegistry<Registration>;
}

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
 * TypeRegistry:  
 * the default type converter registry (`ConverterRegistry`)
 * 
 * Register custom type converters to PaperDB:
 * @example
 * ```
 *   import { TypeConverter, TYPE_REGISTRY } from '@paper-db/paper-db/types'
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
 *   declare module '@paper-db/paper-db/types' {
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
export const TYPE_REGISTRY = new (ConverterRegistry as TypeRegistryI<TypeRegistration>)(CONVERTERS)

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

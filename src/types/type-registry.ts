
import { ConverterRegistry, Converter } from './converter'
import * as Types from './types'

/**
 * interface for the default type converter registry (TYPE_REGISTRY)
 */
export interface TypeRegistry<Registration> {
  get<T extends keyof Registration> (type: T): Registration[T];
  get(type: string): Converter;

  add(converter: Converter);
}

export interface TypeRegistryI<Registration> {
  new (converters: ReadonlyArray<Registration[keyof Registration]>): TypeRegistry<Registration>;
}

/**
 * the registration map for the default type converter registry (TYPE_REGISTRY)
 */
export interface TypeRegistration {
  'date': typeof Types.PaperDBDate;
  /** @todo */

}

/**
 * the default type converters
 */
export const CONVERTERS = [
  Types.PaperDBDate,
  /** @todo */

]

/**
 * TypeRegistry:  
 * the default type converter registry (`ConverterRegistry`)
 */
export const TYPE_REGISTRY = new (ConverterRegistry as TypeRegistryI<TypeRegistration>)(CONVERTERS)

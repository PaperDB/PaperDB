
import { Converter, isValidTypeConverter, TypedObjFrom } from './converter'
import type { PaperDB } from '../index'

/**
 * create a validator that validates whether the given object is of a specific type (TypedObj)  
 * @param typeConverter the type converter of the specific type
 * @param paperdb the root PaperDB instance
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createValidator = <C extends Converter<any>> (typeConverter: C, paperdb: PaperDB) => {
  // assert the `typeConverter` is a valid type converter
  if (!isValidTypeConverter(typeConverter)) {
    throw new TypeError('The type converter is invalid.')
  }

  return async (obj: TypedObjFrom<C>): Promise<boolean /** obj is OBJ */> => {
    if (typeof obj === 'undefined' || obj === null) { // if obj is null or undefined
      return false
    }

    // if `isValidTypedObj` exists
    if (typeof typeConverter.isValidTypedObj === 'function') {
      return typeConverter.isValidTypedObj(obj, paperdb)
    }

    // if `isValidTypedObj` is omitted, check if convertion from the TypedObj throws an error 
    try {
      await typeConverter.fromTypedObj(obj, paperdb)
      return true
    } catch (error) {
      return false
    }
  }
}


import { TypedObj } from './typed-obj'

/**
 * any class implements this interface can be converted to a TypedObj using `c.toTypedObj()`
 */
export interface Convertible<OBJ extends TypedObj<any, any> = any> {
  toTypedObj (): OBJ;
}

/**
 * any class implements this interface can convert a `TypedObject` to a single data type (complex object)
 * @static
 */
export interface Converter<OBJ extends TypedObj<any, any> = any, DATA = Convertible<OBJ>> extends Pick<OBJ, '$type' | '$v'> {
  readonly $type: OBJ['$type'];
  readonly $v: OBJ['$v'] extends undefined ? (undefined | 1) : NonNullable<OBJ['$v']>;

  fromTypedObj (obj: OBJ): DATA;
}

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

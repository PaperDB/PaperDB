
import { TypedObj } from './typed-obj'

/**
 * any class implements this interface can be converted to a TypedObj using `c.toTypedObj()`
 */
export interface Convertible<OBJ extends TypedObj<any, any> = any> {
  toTypedObj (): OBJ;
}

/**
 * any class implements this interface can convert a `TypedObject` to a single data type (complex object)
 */
export interface Converter<OBJ extends TypedObj<any, any> = any, DATA extends Convertible<OBJ> = any> {
  readonly type: OBJ['$type'];
  readonly version?: OBJ['$v'];

  fromTypedObj (obj: OBJ): DATA;
}

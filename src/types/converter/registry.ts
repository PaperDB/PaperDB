
import { ConversionI } from './interface'

export const ERR_CONVERTER_UNMATCH = new TypeError('The TypedObj converter does not match the given type and version number')

/**
 * The registry for each version of a object type
 */
interface VersionReg {
  [$v: number]: ConversionI;
}

/**
 * @summary
 * Using a PaperDB native-supported data type (JSON supported types) is often not very convenient,  
 * so PaperDB supports converting between `TypedObject`s and the registered data types
 * 
 * ConverterRegistry:  
 * the registry for TypedObj converters
 */
export class ConverterRegistry {
  /**
   * The internal registration map of `TypeConverter`s
   * @type `Map<{$type}, VersionReg>`
   */
  private readonly typeReg = new Map<string, VersionReg>();

  constructor (converters?: ReadonlyArray<ConversionI>) {
    if (!converters) {
      return
    }

    // add initial converters to the registry
    converters.forEach((c) => {
      this.add(c)
    })
  }

  /**
   * get a TypedObj converter from the registry
   */
  get (type: string, version?: number): ConversionI | undefined {
    const verReg = this.typeReg.get(type)
    // no type converter of this type exists
    if (!verReg) {
      return
    }

    // if the `version` param is not given, return the first added version of the type converter in the Registry
    if (!version) {
      const converter: ConversionI = Object.values(verReg)[0]
      if (converter.$type !== type) {
        throw ERR_CONVERTER_UNMATCH
      }
      return converter
    }

    // if the `version` param is provided, only look for the type converter of the version
    const converter = verReg[version]
    if (!converter) {
      return
    }

    // validate the TypedObj converter
    const valid = converter.$type === type &&
      (converter.$v ? converter.$v === version : true)
    if (!valid) {
      throw ERR_CONVERTER_UNMATCH
    }

    return converter
  }

  /**
   * add a TypedObj converter to the registry
   */
  add (converter: ConversionI): this {
    const $type = converter.$type
    const $v = converter.$v ?? 1 // the default version is `1`

    const verReg: VersionReg | undefined = this.typeReg.get($type)
    if (!verReg) {
      this.typeReg.set($type, {})
    }

    (verReg as VersionReg)[$v] = converter

    return this
  }

  /**
   * delete a TypedObj converter from the registry
   * @returns success
   */
  delete (type: string, version?: number): boolean {
    // the default version is `1` when parsing
    version = version ?? 1

    const verReg = this.typeReg.get(type)
    if (!verReg || !verReg[version]) {
      return false
    }

    return Reflect.deleteProperty(verReg, version)
  }
}

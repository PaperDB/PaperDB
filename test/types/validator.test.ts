
import type { PaperDB } from '../../src'
import { createValidator } from '../../src/types/validator'
import { isValidTypeConverter } from '../../src/types/converter'
import { ConverterNested, NestedObj, ConverterTest1V2 } from './mock'
import { mockPaperdb } from '../mock'

class Converter1 extends ConverterNested {
  static async isValidTypedObj (obj: NestedObj, paperdb: PaperDB): Promise<boolean> {
    void (paperdb)
    try {
      await Converter1.fromTypedObj(obj)
      return true
    } catch (_) {
      return false
    }
  }
}

const tests = (validator: ReturnType<typeof createValidator>, objFn: () => NestedObj): void => {
  test('return false if the object provided is invalid', async () => {
    const obj = objFn()
    expect(await validator(undefined as any)).toBe(false)
    expect(await validator('test' as any)).toBe(false)
    expect(await validator(1 as any)).toBe(false)
    expect(await validator({} as any)).toBe(false)
    expect(await validator({ ...obj, $v: 1 as any })).toBe(false)
    expect(await validator({ ...obj, $v: '0' as any })).toBe(false)
    expect(await validator({ ...obj, $v: undefined as any })).toBe(false)
    expect(await validator({ ...obj, $type: undefined as any })).toBe(false)
    expect(await validator({ ...obj, $type: 'test' as any })).toBe(false)
    expect(await validator({ ...obj, test1: undefined as any })).toBe(false)
  })

  test('return true if the object provided is valid', async () => {
    const obj = objFn()
    expect(await validator(obj)).toBe(true)
  })
}

describe('PaperDB type validator', () => {
  let obj: NestedObj
  beforeAll(async () => {
    obj = await new ConverterNested(new ConverterTest1V2()).toTypedObj()
    expect(obj).toStrictEqual({ '$type': 'nested', '$v': 0, test1: { '$type': 'test1', '$v': 2, def: '456' } })
  })

  describe('create', () => {
    test('throw error if the TypeConverter is invalid', () => {
      expect(() => createValidator(undefined as any, mockPaperdb)).toThrowError()
      expect(() => createValidator({} as any, mockPaperdb)).toThrowError()
      expect(() => createValidator({ $type: 'test', $v: 'str' } as any, mockPaperdb)).toThrowError()
      expect(() => createValidator({ $type: 'test', $v: 1, fromTypedObj: 'str' } as any, mockPaperdb)).toThrowError()
    })
  })

  describe('when the TypeConverter is without a `isValidTypedObj` method', () => {
    const validator = createValidator(ConverterNested, mockPaperdb)
    tests(validator, () => obj)
  })

  describe('when the TypeConverter is with `isValidTypedObj`', () => {
    const validator = createValidator(Converter1, mockPaperdb)
    tests(validator, () => obj)
  })

  describe('TypeConverter validation', () => {
    test('return false if the TypeConverter is invalid', () => {
      expect(isValidTypeConverter(undefined as any)).toBe(false)
      expect(isValidTypeConverter(1 as any)).toBe(false)
      expect(isValidTypeConverter({} as any)).toBe(false)
      expect(isValidTypeConverter({ $type: 'test', $v: 'str' } as any)).toBe(false)
      expect(isValidTypeConverter({ $type: 'test', $v: 1, fromTypedObj: 'str' } as any)).toBe(false)
    })

    test('return true if the TypeConverter is valid, no type name provided', () => {
      expect(isValidTypeConverter(ConverterNested)).toBe(true)
    })

    test('return false if the TypeConverter is valid, but does not match the type name given', () => {
      expect(isValidTypeConverter(ConverterNested, 'test')).toBe(false)
    })

    test('return true if the TypeConverter is valid, and matches the type name provided', () => {
      expect(isValidTypeConverter(ConverterNested, ConverterNested.$type)).toBe(true)
    })
  })
})

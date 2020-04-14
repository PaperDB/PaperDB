
import { getTypeConverter, TYPE_REGISTRY } from '../../src/types/type-registry'
import { Types } from '../../src/types'
import { ConverterNested } from './mock'

describe('TypeRegistry', () => {
  test('get type converter classes from the default TYPE_REGISTRY', () => {
    expect(getTypeConverter('date')).toBe(Types.PaperDBDate)
    expect(getTypeConverter('ipfs:file')).toBe(Types.IPFSFile)
    expect(getTypeConverter('collection-ref')).toBe(Types.Collection)

    expect(() => getTypeConverter('noexist')).toThrowError()
  })

  test('provide a type converter itself', () => {
    expect(getTypeConverter(ConverterNested)).toBe(ConverterNested)
  })

  test('throw error if the param provided is invalid', () => {
    expect(() => getTypeConverter(undefined as any)).toThrowError()
    expect(() => getTypeConverter({} as any)).toThrowError()
    expect(() => getTypeConverter({ $type: 'test', $v: 'str' } as any)).toThrowError()
    expect(() => getTypeConverter({ $type: 'test', $v: 1, fromTypedObj: 'str' } as any)).toThrowError()
  })

  test('throw error if the TypeConverter from the registry does not match the type provided', () => {
    TYPE_REGISTRY['typeReg'].set('notmatch', ConverterNested)
    expect(() => TYPE_REGISTRY.get('notmatch')).toThrowError()
    expect(() => getTypeConverter('notmatch')).toThrowError()
  })
})

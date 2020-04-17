
import { PaperDBDate, PaperDBTimestamp } from '../../src/types/date'

describe('Data Type: PaperDBDate', () => {
  const dateStr = '2020-01-01'
  const obj = { $type: 'date' as const, iso8601: new Date(dateStr).toISOString() }

  test('create a new instance', () => {
    const date = new PaperDBDate()
    expect(date.getTime()).toBeCloseTo(Date.now(), -1)
    expect(new PaperDBDate(dateStr).getTime()).toBe(+new Date(dateStr))
  })

  test('convert to a TypedObj', () => {
    const date = new PaperDBDate(dateStr)
    expect(date.toTypedObj()).toStrictEqual(obj)
  })

  test('from its instance', () => {
    const date1 = new PaperDBDate(dateStr)

    expect(PaperDBDate.fromTypedObj(date1)).toBe(date1) // Object.is
    expect(PaperDBDate.fromTypedObj(date1).toTypedObj()).toStrictEqual(obj)
  })

  test('from TypedObj', () => {
    expect(PaperDBDate.fromTypedObj(obj)).toStrictEqual(new PaperDBDate(dateStr))
    expect(() => PaperDBDate.fromTypedObj({ ...obj, $type: undefined as any })).toThrowError()
    expect(() => PaperDBDate.fromTypedObj({ ...obj, $type: 'abc' as any })).toThrowError()
    expect(() => PaperDBDate.fromTypedObj({ ...obj, iso8601: undefined as any })).toThrowError()
    expect(() => PaperDBDate.fromTypedObj({ ...obj, iso8601: 1 as any })).toThrowError()
  })

  test('to Timestamp', () => {
    const date = new PaperDBDate()
    expect(date.toTimestamp()).toStrictEqual(new PaperDBTimestamp(+date))
    expect(date.toTimestamp().ms).toBe(+date)
  })
})

describe('Data Type: PaperDBTimestamp', () => {
  const ms = Math.floor(Math.random() * 1e10)
  const ts = new PaperDBTimestamp(ms)
  const tsObj = { $type: 'timestamp' as const, ms: ms }

  test('to TypedObj', () => {
    expect(ts.toTypedObj()).toStrictEqual(tsObj)
  })

  test('from its instance', () => {
    expect(PaperDBTimestamp.fromTypedObj(ts)).toBe(ts) // Object.is
  })

  test('from TypedObj', () => {
    expect(PaperDBTimestamp.fromTypedObj(tsObj)).toStrictEqual(new PaperDBTimestamp(ms))
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, $type: undefined as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, $type: 'test' as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: undefined as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: NaN as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: null as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: Infinity as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: -Infinity as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: 'abc1233' as any })).toThrowError()
    expect(() => PaperDBTimestamp.fromTypedObj({ ...tsObj, ms: '123.1abc' as any })).toThrowError()
  })

  test('to PaperDBDate', () => {
    expect(ts.toDate()).toStrictEqual(new PaperDBDate(ms))
    expect(ts.toDate().getTime()).toBe(ms)
  })
})

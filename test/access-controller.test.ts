
import type { PaperDB } from '../src'
import { ACConstDocType, ACConstUser, createACCallback, DEFAULT_AC } from '../src/access-controller'
import type { Collection } from '../src/types/collection'
import { ConverterTest1V1, ConverterTest1V2 } from './types/mock'

const mockCollection0 = {
  docConverter: ConverterTest1V2,
} as any as Collection

const mockPaperdb = {} as any as PaperDB

const IdA = 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCw/+sm2+EnnxH1oxJV5IdZG8h2UK1yUi3azZxunh0tfzHHUeVo4JTSj80sIMvnOr3eD73t293VpROPhZqsZLXTbfo2t3jqhllx77ew0YiWQw5WpW1zv9WR+uNu9aAsKCVsGijra8vyRI5b1V+oZPlrh7rN7SWhcjZxjsukX/TupsoO+M7nMhuMmDB9lP7MtXeCNbtjwh1MU00QuKzwUfw7Q2cV1qt6FoCHTjV0RFxkdbDCHnnl8D4sA24KiDTDtn+viQd0DF5vqMhYGM/ulYQDEOWJ1Qb+gB3RYiyiDS6L2N0PGEYv6yxXvW8w/U5NlKbcLhQYbNm8zUvo49WbEWtpAgMBAAE='
const IdB = 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJQNGIMJFSVV7tb23nhDHSKVgpSsHWW2OWPPf6u0F0HIPQeVpb8GEVtHAnrVZei1XgTWM1LL3GS3yKRoJ5vpuyKXGmqLwTJYobxJITOi507GFhNTv4+UJYb9DxAKVp8HsRq/VQ3lNr8TDldN3UhrxUOmCo3wWYes33qoTkKTGKBQOvWFbChPrflEr3DrOzrrg2Ai/HvBtlmPbuwOnUJSXIZjsnf5e20LzppKJK5vj+YAoClspmnUWRT1imWnDnO/u2YFcW4l8aVtx09wwYO/18Whd6FGijJkdK+VgTIQ2J1wrG5ly4EPNQt/4ZrbWBFZs1GG8KzDyHLJofyys8TAcxAgMBAAE='

describe('PaperDB Access Controllers', () => {
  let mockEntries: OrbitDBEntryLog<any>[]

  beforeAll(async () => {
    mockEntries = [
      undefined, // [0]
      {
        payload: null, // [1]
      },
      { // [2]
        payload: undefined,
        identity: {
          id: IdB,
        },
      },
      {
        payload: '123abc', // [3]
      },
      {
        payload: { 'a': 1 }, // [4]
        identity: {
          id: IdB,
        },
      },
      { // [5]
        payload: await new ConverterTest1V1().toTypedObj(),
        identity: {
          id: IdA,
        },
      },
      { // [6]
        payload: await new ConverterTest1V2().toTypedObj(),
        identity: {
          id: IdB,
        },
      },
      { // [7]
        payload: await new ConverterTest1V2().toTypedObj(),
        identity: {
          id: IdA,
        },
      },
      { // [8]
        payload: await new ConverterTest1V2().toTypedObj(),
        identity: null,
      },
    ] as any[]
  })

  describe('the default PaperDB Access Controllers', () => {
    test('is a array which contains only `ACConstDocType`', () => {
      expect(DEFAULT_AC).toStrictEqual([ACConstDocType])
    })
  })

  describe('Access Controller: ConstDocType', () => {
    const cb = ACConstDocType(mockCollection0, mockPaperdb)

    test('return false when the entry payload is null or undefined', async () => {
      expect(await cb(mockEntries[0])).toBe(false)
      expect(await cb(mockEntries[1])).toBe(false)
      expect(await cb(mockEntries[2])).toBe(false)
    })

    test('return false when the entry payload does not match the doctype', async () => {
      expect(await cb(mockEntries[3])).toBe(false)
      expect(await cb(mockEntries[4])).toBe(false)
      expect(await cb(mockEntries[5])).toBe(false)
    })

    test('return true when the entry payload matches the doctype', async () => {
      expect(await cb(mockEntries[6])).toBe(true)
    })
  })

  describe('Access Controller: ConstUser', () => {
    const cb0 = ACConstUser(mockCollection0, mockPaperdb)

    test('return false when the entry identity is null or undefined', async () => {
      expect(await cb0(mockEntries[0])).toBe(false)
      expect(await cb0(mockEntries[1])).toBe(false)
      // expect(await cb0(mockEntries[2])).toBe(false)  // does not check entry.payload, so the entry is still valid
      expect(await cb0(mockEntries[3])).toBe(false)
    })

    describe('if there is no preload entry', () => {
      test('store the user id for the constant user', async () => {
        expect(await cb0(mockEntries[5])).toBe(true)
      })

      test('return false if the user id does not match', async () => {
        expect(await cb0(mockEntries[6])).toBe(false)
      })

      test('return true if the user id is consistent', async () => {
        expect(await cb0(mockEntries[5])).toBe(true)
      })
    })

    describe('if the preload entry exists', () => {
      let cb1

      beforeAll(() => {
        cb1 = ACConstUser({
          docConverter: ConverterTest1V2,
          preloadEntry: mockEntries[5],
        } as any as Collection, mockPaperdb)
      })

      test('return true if the user id is consistent', async () => {
        expect(await cb1(mockEntries[5])).toBe(true)
      })

      test('return false if the user id does not match', async () => {
        expect(await cb1(mockEntries[5])).toBe(true)
        expect(await cb1(mockEntries[6])).toBe(false)
        expect(await cb1(mockEntries[5])).toBe(true)
      })
    })
  })

  describe('Combine PaperDB access controllers', () => {
    const ac = createACCallback([ACConstDocType, ACConstUser], mockCollection0, mockPaperdb)
    // doctype: V2
    // user: IdB

    test('return false when the entry payload or identity is null or undefined', async () => {
      expect(await ac(mockEntries[0])).toBe(false)
      expect(await ac(mockEntries[1])).toBe(false)
      expect(await ac(mockEntries[2])).toBe(false) // `ACConstDocType` returns false before `ACConstUser`, so the entry is invalid, and will not store the user id
      expect(await ac(mockEntries[3])).toBe(false)
      expect(await ac(mockEntries[8])).toBe(false)
    })

    test('store the constant user id', async () => {
      expect(await ac(mockEntries[6])).toBe(true)
    })

    test('return false when doctype matches, but user id does not match', async () => {
      expect(await ac(mockEntries[7])).toBe(false)
      expect(await ac(mockEntries[8])).toBe(false)
    })

    test('return false when user id matches, but doctype does not match', async () => {
      expect(await ac(mockEntries[2])).toBe(false)
      expect(await ac(mockEntries[4])).toBe(false)
    })

    test('return false when neither doctype nor user id matches', async () => {
      expect(await ac(mockEntries[5])).toBe(false)
    })

    test('return true when both doctype and user id match', async () => {
      expect(await ac(mockEntries[6])).toBe(true)
    })
  })
})

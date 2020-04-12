
import { toOrbitDBAddr, toCollectionId, ORBIT_DATASTORE_NAME, ERR_COLLECTION_ID_INVALID, ERR_COLLECTION_ADDR_INVALID } from '../src/address'

const hash = 'Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a'

describe('PaperDB collection id & address', () => {
  describe('convert a PaperDB Collection id to its OrbitDB address', () => {
    test('provide `undefined`', () => {
      expect(() => toOrbitDBAddr(undefined as any)).toThrowError(ERR_COLLECTION_ID_INVALID)
    })

    test('provide a random string', () => {
      expect(() => toOrbitDBAddr('ysijdwi')).toThrowError(ERR_COLLECTION_ID_INVALID)
    })

    test('provide a valid collection id (cid to the collection\'s db manifest file)', () => {
      expect(toOrbitDBAddr(hash)).toBe(`/orbitdb/${hash}/${ORBIT_DATASTORE_NAME}`)
    })
  })

  describe('convert a OrbitDB address to the PaperDB Collection id', () => {
    test('provide `undefined`', () => {
      expect(() => toCollectionId(undefined as any)).toThrowError(ERR_COLLECTION_ADDR_INVALID)
    })

    test('provide a random string', () => {
      expect(() => toCollectionId('test123ajsahd')).toThrowError()
    })

    test('provide an invalid OrbitDB address string', () => {
      expect(() => toCollectionId(`/1db/${hash}/${ORBIT_DATASTORE_NAME}`)).toThrowError()
      expect(() => toCollectionId(`/orbitdb/ttttt/${ORBIT_DATASTORE_NAME}`)).toThrowError()
    })

    test('provide an invalid OrbitDBAddress instance', () => {
      expect(() => toCollectionId({ root: 'ttttt', path: ORBIT_DATASTORE_NAME })).toThrowError()
    })

    test(`provide a valid OrbitDB address, but does not point to a PaperDB Collection (the datastore name is not ${ORBIT_DATASTORE_NAME})`, () => {
      expect(() => toCollectionId(`/orbitdb/${hash}/abc`)).toThrowError(ERR_COLLECTION_ADDR_INVALID)
      expect(() => toCollectionId(/** OrbitDBAddress instance */ { root: hash, path: 'abc' })).toThrowError(ERR_COLLECTION_ADDR_INVALID)
    })

    test('provide the valid OrbitDB address of a PaperDB Collection', () => {
      expect(toCollectionId(`/orbitdb/${hash}/${ORBIT_DATASTORE_NAME}`)).toBe(hash)
      expect(toCollectionId(/** OrbitDBAddress instance */ { root: hash, path: ORBIT_DATASTORE_NAME })).toBe(hash)
    })
  })
})

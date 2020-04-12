
import { toOrbitDBAddr, toCollectionId, ORBIT_DATASTORE_NAME, ERR_COLLECTION_ID_INVALID, ERR_COLLECTION_ADDR_INVALID } from '../src/address'
import { cid } from './mock'

describe('PaperDB collection id & address', () => {
  describe('convert a PaperDB Collection id to its OrbitDB address', () => {
    test('provide `undefined`', () => {
      expect(() => toOrbitDBAddr(undefined as any)).toThrowError(ERR_COLLECTION_ID_INVALID)
    })

    test('provide a random string', () => {
      expect(() => toOrbitDBAddr('ysijdwi')).toThrowError(ERR_COLLECTION_ID_INVALID)
    })

    test('provide a valid collection id (cid to the collection\'s db manifest file)', () => {
      expect(toOrbitDBAddr(cid)).toBe(`/orbitdb/${cid}/${ORBIT_DATASTORE_NAME}`)
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
      expect(() => toCollectionId(`/1db/${cid}/${ORBIT_DATASTORE_NAME}`)).toThrowError()
      expect(() => toCollectionId(`/orbitdb/ttttt/${ORBIT_DATASTORE_NAME}`)).toThrowError()
    })

    test('provide an invalid OrbitDBAddress instance', () => {
      expect(() => toCollectionId({ root: 'ttttt', path: ORBIT_DATASTORE_NAME })).toThrowError()
    })

    test(`provide a valid OrbitDB address, but does not point to a PaperDB Collection (the datastore name is not ${ORBIT_DATASTORE_NAME})`, () => {
      expect(() => toCollectionId(`/orbitdb/${cid}/abc`)).toThrowError(ERR_COLLECTION_ADDR_INVALID)
      expect(() => toCollectionId(/** OrbitDBAddress instance */ { root: cid, path: 'abc' })).toThrowError(ERR_COLLECTION_ADDR_INVALID)
    })

    test('provide the valid OrbitDB address of a PaperDB Collection', () => {
      expect(toCollectionId(`/orbitdb/${cid}/${ORBIT_DATASTORE_NAME}`)).toBe(cid)
      expect(toCollectionId(/** OrbitDBAddress instance */ { root: cid, path: ORBIT_DATASTORE_NAME })).toBe(cid)
    })
  })
})

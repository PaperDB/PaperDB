
import IPFS from 'ipfs'
import CID from 'cids'
import path from 'path'

import { isIPFSInstance, createIPFSInstance, stringifyIPFSPath } from '../src/ipfs'
import { rmrf } from './utils'
import { cid } from './mock'

const assertIPFSInstance = async (ipfs: IPFS): Promise<void> => {
  expect(await isIPFSInstance(ipfs)).toBe(true)
  const { version } = await ipfs.version()
  expect(typeof version).toBe('string')
}

describe('IPFS Utils', () => {
  describe('create IPFS instance', () => {
    let ipfs0: IPFS

    const dir0 = path.join(__dirname, 'ipfs-test-0')

    describe('the `ipfs` option is `null`', () => {
      test('create a brand new instance when global `ipfs` does not exist', async () => {
        ipfs0 = await createIPFSInstance({ ipfs: null, directory: dir0 })
        await assertIPFSInstance(ipfs0)
      }, 30 * 1000)

      test('return the global ipfs when `ipfs` exists in the global context', async () => {
        global['ipfs'] = ipfs0
        const ipfs1 = await createIPFSInstance({ directory: dir0 })
        expect(ipfs1).toBe(ipfs0) // Object.is
        await assertIPFSInstance(ipfs1)
        global['ipfs'] = undefined
      })
    })

    describe('the `ipfs` option is set to an IPFS instance', () => {
      test('return the instance', async () => {
        const ipfs2 = await createIPFSInstance({ ipfs: ipfs0, directory: dir0 })
        expect(ipfs2).toBe(ipfs0) // Object.is
        await assertIPFSInstance(ipfs2)
      })
    })

    describe('receive something else', () => {
      test('the `ipfs` option is a plain object', () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        expect(createIPFSInstance({ ipfs: {} as any, directory: dir0 })).rejects.toThrowError()
      })
    })

    afterAll(async () => {
      await ipfs0.stop()
      await rmrf(dir0)
    })
  })

  // describe('`ipfs.key.export` is not implemented', () => { })

  describe('stringify IPFS path', () => {
    test('receive a valid CID instance', () => {
      expect(stringifyIPFSPath(new CID(cid))).toBe(cid)
    })

    test('receive an invalid CID instance', () => {
      expect(() => stringifyIPFSPath(new CID('ffffff'))).toThrowError()
    })

    test('receive a valid CID string', () => {
      expect(stringifyIPFSPath(cid)).toBe(cid)
    })

    test('receive an invalid string', () => {
      expect(() => stringifyIPFSPath('ffffff')).toThrowError()
    })

    test('receive an IPFS path', () => {
      const l = [
        `${cid}/a.txt`,
        `/ipfs/${cid}`,
        `/ipfs/${cid}/`,
        `/ipfs/${cid}/a.txt`,
      ]
      for (const i of l) {
        expect(stringifyIPFSPath(i)).toBe(i)
      }
    })

    test('receive an IPNS path', () => {
      const l = [
        `/ipns/${cid}`,
        `/ipns/${cid}/`,
        `/ipns/${cid}/a.txt`,
        `/ipns/ipfs.io`,
        `/ipns/ipfs.io/`,
        `/ipns/ipfs.io/a.txt`,
      ]
      for (const i of l) {
        expect(stringifyIPFSPath(i)).toBe(i)
      }
    })
  })
})

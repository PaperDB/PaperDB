
import { promisify } from 'util'
import rimraf from 'rimraf'
import type IPFS from 'ipfs'

/**
 * rimraf promise
 */
export const rmrf = promisify(rimraf)

export const connectIpfsNodes = async (ipfs1: IPFS, ipfs2: IPFS): Promise<void> => {
  const id1 = await ipfs1.id()
  const id2 = await ipfs2.id()
  await ipfs1.swarm.connect(id2.addresses[0])
  await ipfs2.swarm.connect(id1.addresses[0])
}


import { promisify } from 'util'
import rimraf from 'rimraf'

/**
 * rimraf promise
 */
export const rmrf = promisify(rimraf)

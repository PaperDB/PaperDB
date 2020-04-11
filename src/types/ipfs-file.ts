
/**
 * IPFS File
 */

import CID from 'cids'
import type { PaperDB } from '../index'
import { stringifyIPFSPath } from '../ipfs'
import { Bytes } from '../utils'
import { Conversion, ERR_TYPED_OBJ_INVALID, TypedObj } from './converter'

export type FileData = Bytes | Blob | string | Iterable<number> | Iterable<Bytes> | AsyncIterable<Bytes>

/**
 * Reference to a file stored in IPFS (dag-pb + UnixFS)  
 * Must point to a single file (Must not be a single-file directory)
 */
export interface FileRefObj extends TypedObj<'ipfs:file', 0> {
  /**
   * the ipfs path to the file
   * @see IPFSFile.constructor
   */
  ref: string;

  /**
   * the human-readable filename of the file
   */
  name?: string;

  /** 
   * size in bytes  
   * 
   * If the actual size exceeds the size here, will throw an error
   */
  size?: number;
}

@Conversion<FileRefObj>()
export class IPFSFile {
  static readonly $type = 'ipfs:file'
  static readonly $v = 0

  readonly ref: string

  /**
   * 
   * @param paperdb the root PaperDB instance
   * @param ipfsPath the path to the IPFS file object,  
   *                 as [the `ipfsPath` param in `ipfs.cat`](https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#cat) ,  
   *                 can be:  
   *                     - a CID instance
   *                     - a base encoded CID string  
   *                     - a string including the ipfs/ipns handler, the CID string and the path to traverse to. For example:  
   *                       
   *                      '/ipfs/QmXEmhrMpbVvTh61FNAxP9nU7ygVtyvZA8HZDUaqQCAb66'
   *                      '/ipns/QmXBUF7nWwQeQfdiewCFUtQvb5YDPdMZ81J1EyfXpbeLVw/README.md'
   * 
   * @param name the human-readable filename of the file
   * @param size 
   */
  constructor (
    private readonly paperdb: PaperDB,
    ipfsPath: string | CID,
    public readonly name?: string,
    public readonly size?: number,
  ) {
    this.ref = stringifyIPFSPath(ipfsPath)
  }

  toTypedObj (): FileRefObj {
    return {
      $type: 'ipfs:file',
      $v: 0,
      ref: this.ref,
      name: this.name,
      size: this.size,
    }
  }

  static fromTypedObj (obj: FileRefObj | IPFSFile, paperdb: PaperDB): IPFSFile {
    if (obj instanceof IPFSFile) {
      return obj
    }

    // validate
    if (
      obj.$type !== 'ipfs:file' ||
      obj.$v !== 0 ||
      typeof obj.ref !== 'string' ||
      (typeof obj.name !== 'undefined' && typeof obj.name !== 'string')
    ) {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new IPFSFile(paperdb, obj.ref, obj.name, obj.size)
  }

  /**
   * Retrieve data of the file from IPFS
   */
  data (): Promise<Buffer> {
    return this.paperdb.files.get(this.ref)
  }

  /**
   * Pin the IPFS file
   */
  async pin (): Promise<void> {
    const cid = await this.paperdb.files.resolve(this.ref)
    return this.paperdb.files.pin(cid)
  }

  /**
   * Pin the IPFS file to IPNS
   * @todo
   */
  publish (): never {
    throw new Error('Not implemented')
  }

  /**
   * upload a file to IPFS
   * @param paperdb the root PaperDB instance
   * @param data 
   * @param name the human-readable filename of the file
   */
  static async upload (
    paperdb: PaperDB,
    data: FileData,
    name?: string
  ): Promise<IPFSFile> {
    const it = paperdb.ipfs.add(data, {
      pin: true,
    })

    for await (const result of it) {
      return new IPFSFile(
        paperdb,
        result.cid,
        name,
        result.size
      )
    }

    throw new Error('Failed to add files to IPFS.')
  }
}

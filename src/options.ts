
import type IPFS from 'ipfs'
import { DEFAULT_NAME } from './constants'

type PickRequired<T, K extends keyof T> = {
  [P in K]-?: T[P];
}

export interface IpfsClientConfig {
  host?: string;
  port?: string;
  protocol?: 'http' | 'https';
  apiPath?: string;
  headers?: { [x: string]: string };
  timeout?: number | string;
}

export interface Options {

  /**
   * Must be alphanumeric, with underscores. (`/^\w+$/`)
   */
  name?: string;

  /**
   * The IPFS instance being used.  
   * 
   * the value could be:   
   * * `null` (default): create a new instance of js-ipfs    
   * * an instance of IPFS  
   * * configs passing to `ipfs-http-client`, to use the IPFS HTTP(S) APIs
   */
  ipfs?: null | IPFS | IpfsClientConfig;

  directory?: string;
}

type RequiredOptions = 'name' | 'directory' | 'ipfs'

export const DEFAULT_OPTIONS: PickRequired<Options, RequiredOptions> = Object.freeze({
  name: DEFAULT_NAME,
  ipfs: null,
  directory: typeof process !== 'undefined' ? `./.${DEFAULT_NAME}` : DEFAULT_NAME,
})

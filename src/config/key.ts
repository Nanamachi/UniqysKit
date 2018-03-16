import { Config } from './loader'
import { Key } from './schema-generated/key'
import { KeyPair } from '../cryptography'
import { Bytes32 } from '../bytes'

export class KeyConfig extends Config<Key> {
  constructor () { super(require('./schema-generated/key.json')) }

  public async loadAsKeyPair (configFile: string): Promise<KeyPair> {
    const config = await this.load(configFile)
    return new KeyPair(new Bytes32(new Buffer(config.privateKey, 'hex')))
  }
}

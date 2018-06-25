import createKeccakHash from 'keccak'
import secp256k1 from 'secp256k1'
import { randomBytes } from 'crypto'
import { Bytes32, Bytes64 } from './bytes'
import { Address } from './address'
import { UInt8, serialize, Serializable, BufferReader, BufferWriter } from './serializable'

export class Hash extends Bytes32 {
  public static deserialize (reader: BufferReader): Hash {
    return new Hash(Bytes32.deserialize(reader).buffer)
  }
  public static fromData (data: string | Buffer | DataView) {
    return new Hash(createKeccakHash('keccak256').update(data).digest())
  }
  public toHexString (): string {
    return this.buffer.toString('hex')
  }
}

export interface Hashable {
  hash: Hash
}

export class Signature implements Hashable, Serializable {
  public readonly hash: Hash
  public get signature (): Bytes64 { return new Bytes64(this.buffer.slice(0, 64)) }
  public get recovery (): number { return this.buffer.readUInt8(64) }
  constructor (
    public readonly buffer: Buffer
  ) {
    this.hash = Hash.fromData(this.buffer)
  }

  // Ethereum compatible
  public static sign (messageHash: Hash, privateKey: Bytes32): Signature {
    const sig = secp256k1.sign(messageHash.buffer, privateKey.buffer)

    return new Signature(Buffer.concat([
      sig.signature,
      serialize(sig.recovery, UInt8.serialize)
    ]))
  }

  public static deserialize (reader: BufferReader): Signature {
    return new Signature(reader.consume(65)) // sign: 64 + recovery: 1
  }
  public serialize (writer: BufferWriter) {
    writer.append(this.buffer)
  }
  public equals (other: Signature): boolean {
    return this.buffer.equals(other.buffer)
  }
  public recover (messageHash: Hash): Bytes64 {
    try {
      return new Bytes64(secp256k1.recover(messageHash.buffer, this.signature.buffer, this.recovery, false).slice(1))
    } catch (e) {
      throw new Error('couldn\'t recover public key from signature')
    }
  }

}

export interface Signer {
  sign (messageHash: Hash): Signature
}

export class KeyPair implements Signer {
  public readonly publicKey: Bytes64
  private readonly privateKey: Bytes32
  constructor (
    privateKey?: Bytes32
  ) {
    if (privateKey === undefined) {
      privateKey = KeyPair.generatePrivateKey()
    }
    this.privateKey = privateKey
    this.publicKey = new Bytes64(secp256k1.publicKeyCreate(privateKey.buffer, false).slice(1))
  }

  public static generatePrivateKey (): Bytes32 {
    let privateKeyBuff: Buffer
    do {
      privateKeyBuff = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privateKeyBuff))
    return new Bytes32(privateKeyBuff)
  }

  // Ethereum compatible
  public sign (messageHash: Hash) {
    return Signature.sign(messageHash, this.privateKey)
  }

  get address (): Address {
    return Address.fromPublicKey(this.publicKey)
  }
}

/*
  Copyright 2018 Bit Factory, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import createKeccakHash from 'keccak'
import secp256k1 from 'secp256k1'
import { randomBytes } from 'crypto'
import { Bytes32, Bytes64 } from '@uniqys/types'
import { serialize, Serializable, BufferReader, BufferWriter, UInt8 } from '@uniqys/serialize'
import { Address } from './address'

export class Hash extends Bytes32 {
  public static zero = new Hash(Buffer.alloc(32))
  public static deserialize (reader: BufferReader): Hash {
    return new Hash(Bytes32.deserialize(reader).buffer)
  }
  public static fromData (data: string | Buffer | DataView): Hash {
    return new Hash(createKeccakHash('keccak256').update(data).digest())
  }
  public static fromHexString (str: string): Hash {
    return new Hash(Buffer.from(str, 'hex'))
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
    if (buffer.length !== 65) { throw TypeError() }
    if (![27, 28].includes(this.recovery)) {
      throw new Error('invalid signature. V must be 27 or 28.')
    }
    this.hash = Hash.fromData(this.buffer)
  }

  // Ethereum compatible
  public static sign (digest: Hash, privateKey: Bytes32): Signature {
    const sig = secp256k1.sign(digest.buffer, privateKey.buffer)

    return new Signature(Buffer.concat([
      sig.signature,
      serialize(sig.recovery + 27, UInt8.serialize) // Transform V from 0/1 to 27/28 according to the Ethereum Yellow Paper
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
  public recover (digest: Hash): Bytes64 {
    try {
      return new Bytes64(secp256k1.recover(digest.buffer, this.signature.buffer, (this.recovery + 1) % 2, false).slice(1))
    } catch (e) {
      throw new Error('couldn\'t recover public key from signature')
    }
  }
  public address (digest: Hash): Address {
    return Address.fromPublicKey(this.recover(digest))
  }
}

export interface Signer {
  sign (digest: Hash): Signature
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
  public sign (digest: Hash) {
    return Signature.sign(digest, this.privateKey)
  }

  get address (): Address {
    return Address.fromPublicKey(this.publicKey)
  }
}

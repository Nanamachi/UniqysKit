/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'

export function hexStr (...buffers: Buffer[]) {
  return '0x' + Buffer.concat(buffers).toString('hex')
}

export function toBuffer (hexStr: string) {
  return Buffer.from(hexStr.slice(2), 'hex')
}

export function toString (hexStr: string, encoding: string = 'utf8') {
  return toBuffer(hexStr).toString(encoding)
}

// assert.throws doesn't support async function
export async function assertAsyncThrows (assert: Chai.Assert, fn: () => Promise<any>, messageMatcher: RegExp) {
  let err
  await fn().catch(e => err = e)

  if (err) {
    assert.match(err, messageMatcher)
  } else {
    assert.fail('expected to throw an error')
  }
}

export async function initSigner (account: string): Promise<{ signer: KeyPair, privateKey: Bytes32}> {
  const privateKey = KeyPair.generatePrivateKey()
  const signer = new KeyPair(privateKey)
  const address = hexStr(signer.address.buffer)
  await web3.eth.sendTransaction({ from: account, to: address, value: web3.utils.toWei('1', 'ether') })

  const password = `signer:${account}`
  await web3.eth.personal.importRawKey(hexStr(privateKey.buffer), password)
  await web3.eth.personal.unlockAccount(address, password)

  return { signer, privateKey }
}

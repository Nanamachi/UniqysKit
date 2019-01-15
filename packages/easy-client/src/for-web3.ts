/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { EasyClient } from './client'
import { /*KeyPair,*/ Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
//import { Bytes32 } from '@uniqys/types'
import Web3 = require('web3')
import { Provider } from 'web3/providers';
import utils = require('ethereumjs-util')

/*
function checkLocalStorage () {
  try {
    localStorage.setItem('__localStorage_test__', '__test__')
    localStorage.removeItem('__localStorage_test__')
    return true
  } catch (e) {
    return false
  }
}
*/

// This implementation is only for development use.
// It is NOT secure, because it save private key in localStorage.
//const key = 'easy_private_key'
export class EasyClientForWeb3 extends EasyClient {
  constructor (provider: Provider, base: string) {
    /*
    if (!checkLocalStorage()) { throw new Error('available localStorage required') }

    const privateKeyString = localStorage.getItem(key)
    const privateKey = privateKeyString
      ? new Bytes32(Buffer.from(privateKeyString, 'hex'))
      : (() => {
        const privateKey = KeyPair.generatePrivateKey()
        localStorage.setItem(key, privateKey.buffer.toString('hex'))
        return privateKey
      })()
    const keyPair = new KeyPair(privateKey)
    console.log(`easy address: ${keyPair.address.toString()}`)
    */

    const web3 = new Web3(provider);

    const signer = {
      address: async () => {return await web3.eth.getAccounts()[0]},
      sign: async (tx: Transaction) => {
/*
        const msg = `
Accept to sign this post?
nonce: ${tx.nonce}
method: ${tx.request.method}
path: ${tx.request.path}
headers:
${tx.request.headers.list.map(kv => `  ${kv['0']}: ${kv['1']}`).join('\n')}
body:
${tx.request.body.toString()}
`
        return new Promise<Signature>((resolve, reject) => {
          if (confirm(msg)) {
            resolve(keyPair.sign(tx.hash))
          } else {
            reject(new Error('sign rejected'))
          }
        })
*/

        const account = await web3.eth.getAccounts()[0];

        return new Promise<Signature>((resolve, reject) => {
          resolve(web3.eth.sign(utils.bufferToHex(tx.hash.buffer), account))
        })
      }
    }

    super(signer, { baseURL: base })
  }
}

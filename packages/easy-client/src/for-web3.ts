/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { EasyClient } from './client'
import { Address, Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import Web3 = require('web3')
import { Provider } from 'web3/providers';
import utils = require('ethereumjs-util')

export class EasyClientForWeb3 extends EasyClient {
  constructor (provider: Provider, base: string) {

    const web3:any = new Web3(provider);
    
    const signer = {
      address: Address.fromString(web3.givenProvider.selectedAddress.substring(2)),

      sign: async (tx: Transaction) => {
        const sig = await web3.eth.sign(utils.bufferToHex(tx.hash.buffer), web3.givenProvider.selectedAddress)
        const buffer: any = utils.toBuffer(sig);
        buffer[64] = buffer[64] - 27;
        const sign = new Signature(buffer)   
        return new Promise<Signature>((resolve) => {       
          resolve(sign)
        })
      }
    }

    super(signer, { baseURL: base })
  }
}

/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Dapp, AppState } from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction, BlockHeader } from '@uniqys/blockchain'
import { SignedTransaction } from '@uniqys/easy-types'
import { deserialize } from '@uniqys/serialize'
import { Optional } from '@uniqys/types'
import { State } from './state'
import { EasyMemcached, OperationMode } from './memcached-implementation'
import { SignedRequest, Response } from './packer'
import { URL } from 'url'
import debug from 'debug'
const logger = debug('easy-fw:controller')

export class Controller implements Dapp {
  constructor (
    private readonly app: URL,
    private readonly state: State,
    private readonly memcachedImpl: EasyMemcached
  ) { }

  public async connect (): Promise<AppState> {
    await this.state.ready()
    return this.state.appState()
  }
  public async validateTransaction (coreTx: CoreTransaction): Promise<boolean> {
    try {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce <= account.nonce) throw new Error(`transaction nonce is too low: current ${account.nonce}, got ${tx.nonce}`)
      return true
    } catch (err) {
      logger('validate transaction failed: %s', err.message)
      return false
    }
  }
  public async selectTransactions (coreTxs: CoreTransaction[]): Promise<Optional<CoreTransaction[]>> {
    const selected: CoreTransaction[] = []
    for (const coreTx of coreTxs) {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce === account.nonce + 1) {
        selected.push(coreTx)
      }
    }
    if (selected.length > 0) {
      // Pending transaction existed
      return Optional.some(selected)
    }
    return Optional.none()
  }
  public async executeTransactions (coreTxs: CoreTransaction[], header: BlockHeader): Promise<AppState> {
    for (const coreTx of coreTxs) {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const sender = tx.signer
      await this.state.rwLock.writeLock.use(async () => {
        const root = this.state.top.root
        try {
          const next = (await this.state.getAccount(sender)).incrementNonce()
          // skip non continuous nonce transaction
          if (tx.nonce !== next.nonce) { throw new Error('non continuous nonce') }
          await this.state.setAccount(sender, next)
          // allow read/write
          this.memcachedImpl.changeMode(OperationMode.ReadWrite)
          const res = await Response.pack(await SignedRequest.unpack(tx, header, this.app))
          await this.state.result.set(coreTx.hash, res)
          if (400 <= res.status && res.status < 600) { throw new Error(res.message) }
        } catch (err) {
          logger('error in action: %s', err.message)
          await this.state.top.rollback(root)
        } finally {
          this.memcachedImpl.changeMode(OperationMode.ReadOnly)
        }
      })
    }
    await this.state.meta.incrementHeight()
    return this.state.appState()
  }
}

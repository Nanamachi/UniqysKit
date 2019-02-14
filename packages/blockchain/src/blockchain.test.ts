/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Blockchain } from './blockchain'
import { Hash, KeyPair } from '@uniqys/signature'
import { Block } from './block'
import { Consensus, ValidatorSet, Validator, Vote, ConsensusMessage } from './consensus'
import { TransactionList } from './transaction'
import { BlockStore } from './block-store'
import { InMemoryStore } from '@uniqys/store'

async function setBlock (blockchain: Blockchain, block: Block, consensus: Consensus, validatorSet: ValidatorSet): Promise<void> {
  const height = block.header.height
  await Promise.all([
    blockchain.blockStore.setHeader(height, block.header),
    blockchain.blockStore.setBody(height, block.body)
  ])
  await blockchain.blockStore.setHeight(height)
  await blockchain.blockStore.setLastConsensus(consensus)
  await blockchain.blockStore.setValidatorSet(validatorSet)
}

/* tslint:disable:no-unused-expression */
describe('blockchain', () => {
  let signer: KeyPair
  let validatorSet: ValidatorSet
  let genesis: Block
  let genesisConsensus: Consensus
  beforeAll(() => {
    signer = new KeyPair()
    validatorSet = new ValidatorSet([ new Validator(signer.address, 100) ])
    const unique = Hash.fromData('genesis')
    genesis = Block.construct(1, 100, unique, validatorSet.hash, Hash.fromData('state'),
      new TransactionList([]), new Consensus(new Vote(0, 1, unique), []))
    const vote = new Vote(1, 1, genesis.hash)
    const digest = ConsensusMessage.PrecommitMessage.digest(vote, genesis.hash)
    genesisConsensus = new Consensus(vote, [signer.sign(digest)])
  })
  it('can create', () => {
    expect(() => { new Blockchain(new BlockStore(new InMemoryStore()), genesis, validatorSet) }).not.toThrow()
  })
  it('need to make ready', async () => {
    const blockchain = new Blockchain(new BlockStore(new InMemoryStore()), genesis, validatorSet)
    await expect(blockchain.height).rejects.toThrow()
    await blockchain.ready()
    await expect(blockchain.height).resolves.toBe(0)
    await expect(blockchain.ready()).resolves.not.toThrow()
  })
  it('restore from block store', async () => {
    const store = new BlockStore(new InMemoryStore())
    const blockchain = new Blockchain(store, genesis, validatorSet)
    await blockchain.ready()
    expect(await blockchain.height).toBe(0)
    await setBlock(blockchain, genesis, genesisConsensus, validatorSet)
    expect(await blockchain.height).toBe(1)

    const restoreChain = new Blockchain(store, genesis, validatorSet)
    await restoreChain.ready()
    expect(await restoreChain.height).toBe(1)
  })
  it('throw if stored other chain', async () => {
    const unique = Hash.fromData('foobar')
    const otherGenesis = Block.construct(1, 100, unique, validatorSet.hash, Hash.fromData('state'),
      new TransactionList([]), new Consensus(new Vote(0, 1, unique), []))
    const vote = new Vote(1, 1, otherGenesis.hash)
    const digest = ConsensusMessage.PrecommitMessage.digest(vote, otherGenesis.hash)
    const store = new BlockStore(new InMemoryStore())
    const otherChain = new Blockchain(store, otherGenesis, validatorSet)
    await otherChain.ready()
    await setBlock(otherChain, otherGenesis, new Consensus(vote, [signer.sign(digest)]), new ValidatorSet([ new Validator(signer.address, 200) ]))
    const blockchain = new Blockchain(store, genesis, validatorSet)
    await expect(blockchain.ready()).rejects.toThrow()
  })
  describe('accessor', () => {
    let blockchain: Blockchain
    let block2: Block
    let consensus2: Consensus
    let validatorSet2: ValidatorSet
    beforeAll(async () => {
      blockchain = new Blockchain(new BlockStore(new InMemoryStore()), genesis, validatorSet)
      await blockchain.ready()
      await setBlock(blockchain, genesis, genesisConsensus, validatorSet)

      validatorSet2 = new ValidatorSet([ new Validator(signer.address, 200) ])
      block2 = Block.construct(2, 110, genesis.hash, validatorSet2.hash, Hash.fromData('state'), new TransactionList([]), genesisConsensus)
      const vote2 = new Vote(2, 1, block2.hash)
      const digest2 = ConsensusMessage.PrecommitMessage.digest(vote2, genesis.hash)
      consensus2 = new Consensus(new Vote(2, 1, block2.hash), [signer.sign(digest2)])
      await setBlock(blockchain, block2, consensus2, validatorSet2)
    })
    it('can get chain height', async () => {
      expect(await blockchain.height).toBe(2)
    })
    it('can get header of height', async () => {
      expect(await blockchain.headerOf(1)).toEqual(genesis.header)
      expect(await blockchain.headerOf(2)).toEqual(block2.header)
      await expect(blockchain.headerOf(3)).rejects.toThrow()
    })
    it('can get body of height', async () => {
      expect(await blockchain.bodyOf(1)).toEqual(genesis.body)
      expect(await blockchain.bodyOf(2)).toEqual(block2.body)
      await expect(blockchain.bodyOf(3)).rejects.toThrow()
    })
    it('can get hash of height', async () => {
      expect(await blockchain.hashOf(1)).toEqual(genesis.hash)
      expect(await blockchain.hashOf(2)).toEqual(block2.hash)
      await expect(blockchain.hashOf(3)).rejects.toThrow()
    })
    it('can get block of height', async () => {
      expect(await blockchain.blockOf(1)).toEqual(genesis)
      expect(await blockchain.blockOf(2)).toEqual(block2)
      await expect(blockchain.blockOf(3)).rejects.toThrow()
    })
    it('can get consensus of height', async () => {
      expect(await blockchain.consensusOf(1)).toEqual(genesisConsensus)
      expect(await blockchain.consensusOf(2)).toEqual(consensus2)
      await expect(blockchain.consensusOf(3)).rejects.toThrow()
    })
    it('can get validator set of height', async () => {
      expect(await blockchain.validatorSetOf(1)).toEqual(validatorSet)
      // expect(await blockchain.validatorSetOf(2)).toEqual(validatorSet)
      // expect(await blockchain.validatorSetOf(3)).toEqual(validatorSet2)
      // await expect(blockchain.validatorSetOf(4)).rejects.toThrow()
    })
  })
})

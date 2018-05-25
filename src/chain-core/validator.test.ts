import { ValidatorNode, Node } from './validator'
import { Blockchain } from '../structure/blockchain'
import { Hash, Signature, KeyPair, Signer } from '../structure/cryptography'
import { Dapp, AppState } from '../interface/dapi'
import { InMemoryBlockStore } from '../store/block'
import { Block, BlockHeader, BlockBody } from '../structure/blockchain/block'
import { TransactionList, Transaction, TransactionData } from '../structure/blockchain/transaction'
import { Consensus, ValidatorSet, Validator } from '../structure/blockchain/consensus'

// mock
class MockDapp implements Dapp {
  public txCount = 0
  public height = 0

  get appState (): AppState {
    return new AppState(this.height, Hash.fromData(`state: ${this.txCount}`))
  }

  connect (): Promise<AppState> {
    return Promise.resolve(this.appState)
  }

  async execute (transactions: Iterable<Transaction>): Promise<AppState> {
    for (const _ of transactions) {
      this.txCount++
    }
    this.height++
    return this.appState
  }
}

class MockNode extends Node {
  protected mainLoop (): Promise<void> {
    return Promise.resolve()
  }
}
class MockRejectionNode extends Node {
  protected mainLoop (): Promise<void> {
    return Promise.reject(':(')
  }
}

describe('node', () => {
  it('can start and stop node', (done) => {
    const node = new MockNode()
    expect(() => { node.start() }).not.toThrow()
    node.on('end', done)
    process.nextTick(() => {
      expect(node['immediateId']).toBeDefined()
      expect(() => { node.stop() }).not.toThrow()
      expect(node['immediateId']).not.toBeDefined()
      expect(() => { node.stop() }).not.toThrow()
    })
  })
  it('can start and stop node', (done) => {
    const node = new MockRejectionNode()
    const handler = jest.fn()
    node.start()
    node.on('error', handler)
    node.on('end', () => {
      expect(handler).toBeCalled()
      done()
    })
  })
})

/* tslint:disable:no-unused-expression */
describe('validator', () => {
  let genesis: Block
  let keyPair: KeyPair
  let signer: Signer
  beforeAll(() => {
    keyPair = new KeyPair()
    const body = new BlockBody(new TransactionList([]), new Consensus([]), new ValidatorSet([new Validator(keyPair.address, 10)]))
    const lastBlockHash = Hash.fromData('genesis!')
    const state = Hash.fromData('genesis state')
    const validator = Hash.fromData('validator set')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, body.lastBlockConsensus.hash, state, validator)
    genesis = new Block(header, body)
    signer = { sign: (_: Hash) => { return new Signature(Buffer.alloc(33)) } }
  })
  it('can create', () => {
    expect(() => { new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis)) }).not.toThrow()
  })
  it('can do mainLoop', async () => {
    const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
    // do 10 times
    for (let i = 0; i < 10; i++) {
      await expect(validator['mainLoop']()).resolves.not.toThrow()
    }
  })
  it('can add transaction', () => {
    const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
    const transaction = Transaction.sign(signer, new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')))
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.addTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  it('proceed consensus if need', async () => {
    const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
    await validator.blockchain.ready()
    validator.addTransaction(Transaction.sign(signer, new TransactionData(1234, Buffer.from('Dapps transaction'))))
    validator.addTransaction(Transaction.sign(signer, new TransactionData(1235, Buffer.from('Dapps transaction'))))
    expect(await validator.blockchain.height).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    await validator.proceedConsensusUntilSteady()
    expect(await validator.blockchain.height).toBe(3) // tx block and appState proof block
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect((await validator.blockchain.blockOf(2)).body.transactionList.transactions.length).toBe(2)
    expect((await validator.blockchain.blockOf(3)).header.appStateHash.equals(Hash.fromData('state: 2'))).toBeTruthy()
  })
  it('add reach block include transactions', async () => {
    const dapp = new MockDapp()
    const validator = new ValidatorNode(dapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
    const dapp2 = new MockDapp()
    const validator2 = new ValidatorNode(dapp2, new Blockchain(new InMemoryBlockStore(), genesis), keyPair) // same signer
    await validator.blockchain.ready()
    await validator2.blockchain.ready()
    validator.addTransaction(Transaction.sign(signer, new TransactionData(1234, Buffer.from('Dapps transaction'))))
    validator.addTransaction(Transaction.sign(signer, new TransactionData(1235, Buffer.from('Dapps transaction'))))
    validator2.addTransaction(Transaction.sign(signer, new TransactionData(1234, Buffer.from('Dapps transaction'))))
    validator2.addTransaction(Transaction.sign(signer, new TransactionData(1235, Buffer.from('Dapps transaction'))))
    // construct block include transactions
    await validator2.proceedConsensusUntilSteady()
    const block2 = await validator2.blockchain.blockOf(2)

    expect(await validator.blockchain.height).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    await validator.addReachedBlock(block2)
    // allow reach already have block
    await expect(validator.addReachedBlock(block2)).resolves.not.toThrow()
    expect(await validator.blockchain.height).toBe(2)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect(dapp.appState.hash.equals(Hash.fromData('state: 0'))).toBeTruthy()
    await validator.proceedConsensusUntilSteady()
    expect(await validator.blockchain.height).toBe(3) // make proof block by myself
    expect(dapp.appState.hash.equals(Hash.fromData('state: 2'))).toBeTruthy()
  })
  describe('error case', () => {
    it('cant add reached block contain invalid app state', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      // hack txCount
      invalidDapp.txCount++
      // construct invalid block
      await invalidValidator.proceedConsensusUntilSteady()
      const block = await invalidValidator.blockchain.lastBlock

      await validator.proceedConsensusUntilSteady() // valid
      await expect(validator.addReachedBlock(block)).rejects.toThrow('invalid block')
    })
  })
  describe('private error case', () => {
    it('cant proceed consensus before initialize', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await expect(validator['proceedConsensus']()).rejects.toThrow('not initialized')
    })
    it('cant construct block before initialize', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await expect(validator['constructBlock']()).rejects.toThrow('not initialized')
    })
    it('cant construct block before execute last block', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await validator['initialize']()
      await expect(validator['constructBlock']()).rejects.toThrow()
    })
    it('cant execute block before initialize', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await expect(validator['executeBlockTransactions']()).rejects.toThrow('not initialized')
    })
    it('cant execute block when all block executed', async () => {
      const validator = new ValidatorNode(new MockDapp(), new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await validator.proceedConsensusUntilSteady()
      await expect(validator['executeBlockTransactions']()).rejects.toThrow()
    })
    it('throw error if connected app block height over known it', async () => {
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      // hack height
      invalidDapp.height = 10
      await expect(invalidValidator['initialize']()).rejects.toThrow('need reset app')
    })
    it('throw error if executed app block height is wrong', async () => {
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
      await invalidValidator['initialize']()
      // hack height
      invalidDapp.height++
      await expect(invalidValidator['executeBlockTransactions']()).rejects.toThrow('block height mismatch')
    })
  })
})

import { Dapp, AppState } from '../../interface/dapi'
import { Transaction } from '../../structure/blockchain/transaction'
import { MerklePatriciaTrie } from '../../structure/merkle-patricia-trie'
import { TrieStore } from '../../store/trie'
import { InMemoryStore } from '../../store/common'
import { UInt64, deserialize, serialize } from '../../structure/serializable'
import debug from 'debug'
const logger = debug('sample')

export class Sample implements Dapp {
  private height: number
  private db: MerklePatriciaTrie
  constructor (
  ) {
    this.db = new MerklePatriciaTrie(new TrieStore(new InMemoryStore()))
    this.height = 0
  }

  public async connect (): Promise<AppState> {
    await this.db.ready()
    const appState = await this.appState()
    logger('connected: %o', appState)
    return appState
  }

  public async validateTransaction (_: Transaction): Promise<boolean> {
    return true
  }

  public async selectTransactions (transactions: Transaction[]): Promise<Transaction[]> {
    return transactions
  }

  public async executeTransactions (transactions: Transaction[]): Promise<AppState> {
    for (const _ of transactions) {
      const txCount = await this.getTransactionCount()
      await this.setTransactionCount(txCount + 1)
    }
    this.height++
    const appState = await this.appState()
    logger('executed: %o', appState)
    return appState
  }

  private async getTransactionCount () {
    return (await this.db.get(Buffer.from('transactions'))).match(v => deserialize(v, UInt64.deserialize), () => 0)
  }

  private async setTransactionCount (count: number) {
    await this.db.set(Buffer.from('transactions'), serialize(count, UInt64.serialize))
  }

  private async appState (): Promise<AppState> {
    const root = this.db.root
    return new AppState(this.height, root)
  }
}

/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Hash, Hashable } from '@uniqys/signature'

// Basic Merkle Tree
// But, doesn't copy leaf for fix CVE-2012-2459
export namespace MerkleTree {
  export function root (items: Hash[]): Hash
  export function root<T extends Hashable> (items: T[]): Hash
  export function root (items: any) {
    if (items.length === 0) { return Hash.fromData(Buffer.alloc(0)) }
    if (items.length === 1) {
      if (items[0] instanceof Hash) { return items[0] }
      return items[0].hash
    }

    const split = splitPoint(items.length)
    return Hash.fromData(Buffer.concat([
      root(items.slice(0, split)).buffer,
      root(items.slice(split)).buffer
    ]))
  }
  function splitPoint (x: number): number {
    // it use: i = 2^n, i < x <= 2i
    // also an option: i = n, x/2 <= i < x/2 + 1
    let i = 1
    while (i < x) { i <<= 1 }
    return i >> 1
  }
}

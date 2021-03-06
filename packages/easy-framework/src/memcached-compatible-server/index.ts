/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import net from 'net'
import { MemcachedTextProtocol, MemcachedSubset, Response } from './protocol'

export { MemcachedSubset, Response }

export class MemcachedCompatibleServer extends net.Server {
  constructor (
    impl: MemcachedSubset
  ) {
    super(socket => new MemcachedTextProtocol(socket, impl).handle())
  }
}

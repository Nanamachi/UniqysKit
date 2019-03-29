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

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "@uniqys/event-provider-ethereum/contracts/Depositable.sol";
import "@uniqys/event-provider-ethereum/contracts/Stakable.sol";

contract SampleToken is Depositable, Stakable {
    string public name = "SampleToken";
    string public symbol = "SMPL";
    uint public decimals = 18;
    uint public INITIAL_SUPPLY = 1000;

    constructor(
        bytes32 genesisHash,
        address[] memory validators,
        uint256[] memory powers
    )
        Depositable(genesisHash)
        public
    {
        for (uint i = 0; i < validators.length; i++) {
            _mint(validators[i], INITIAL_SUPPLY);
            _stakeDeposit(validators[i], powers[i]);
        }
    }
}

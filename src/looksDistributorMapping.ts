import { Address, ethereum } from "@graphprotocol/graph-ts"
import {
  LooksDistributor,
} from "../generated/LooksDistributor/LooksDistributor"

const lookDistributorContractAddr = "0x465A790B428268196865a3AE2648481ad7e0d3b1"

import {
  LooksReward,
} from "../generated/schema"

export function handleBlock(block: ethereum.Block): void {
  let looksReward = LooksReward.load(block.number.toString())
  // created one if it's not existed
  if (!looksReward) {
    looksReward = new LooksReward(block.number.toString())
  }
  looksReward.timestamp = block.timestamp
  const looksDistributorContract = LooksDistributor.bind(Address.fromString(lookDistributorContractAddr))
  looksReward.rewardPerBlockForStaking = looksDistributorContract.rewardPerBlockForStaking()
  looksReward.rewardPerBlockForOthers = looksDistributorContract.rewardPerBlockForOthers()
  looksReward.blockNumber = block.number
  looksReward.save()
}
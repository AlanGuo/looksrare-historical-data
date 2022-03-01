import { Address, ethereum, BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import {
  LooksDistributor,
} from "../generated/LooksDistributor/LooksDistributor"

import {
  Reward,
  LooksReward
} from "../generated/schema"
import { AVG_BLOCKS_PER_YEAR, lookDistributorContractAddr } from "./config"

export function handleBlock(block: ethereum.Block): void {
  let reward = Reward.load(block.number.toString())
  if (!reward) {
    reward = new Reward(block.number.toString())
  }
  reward.timestamp = block.timestamp
  let looksReward = new LooksReward(block.number.toString())
  const looksDistributorContract = LooksDistributor.bind(Address.fromString(lookDistributorContractAddr))
  reward.totalLooksStaked = looksDistributorContract.totalAmountStaked()
  looksReward.looksRewardsPerBlock = looksDistributorContract.rewardPerBlockForStaking()
  const totalLooksRewardsPerYear = looksReward.looksRewardsPerBlock.times(BigInt.fromU32(AVG_BLOCKS_PER_YEAR))
  looksReward.apy = BigDecimal.fromString(totalLooksRewardsPerYear.toString()).div(BigDecimal.fromString(reward.totalLooksStaked.toString()))
  log.debug("totalLooksStaked: {}, looksRewardsPerBlock: {}, apy: {}", [reward.totalLooksStaked.toString(), looksReward.looksRewardsPerBlock.toString(), looksReward.apy.toString()])
  looksReward.save()
  reward.looksReward = block.number.toString()
  reward.save()
}
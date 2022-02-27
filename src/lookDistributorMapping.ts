import {
  NewRewardsPerBlock as NewRewardsPerBlockEvent
} from "../generated/LooksDistributor/LooksDistributor"

import {
  LooksReward,
} from "../generated/schema"

export function handleNewRewardPeriod(event: NewRewardsPerBlockEvent): void {
  let looksReward = LooksReward.load(event.block.number.toString())
  // created one if it's not existed
  if (!looksReward) {
    looksReward = new LooksReward(event.block.number.toString())
    looksReward.timestamp = event.block.timestamp
    looksReward.rewardPerBlockForStaking = event.params.rewardPerBlockForStaking
    looksReward.rewardPerBlockForOthers = event.params.rewardPerBlockForOthers
    looksReward.blockNumber = event.block.number
  }
  looksReward.save()
}
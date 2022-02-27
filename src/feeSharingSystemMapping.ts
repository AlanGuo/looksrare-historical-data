import {
  NewRewardPeriod as NewRewardPeriodEvent
} from "../generated/FeeSharingSystem/FeeSharingSystem"

import {
  FeeSharingReward,
} from "../generated/schema"

export function handleNewRewardPeriod(event: NewRewardPeriodEvent): void {
  let feeSharingReward = FeeSharingReward.load(event.block.number.toString())
  // created one if it's not existed
  if (!feeSharingReward) {
    feeSharingReward = new FeeSharingReward(event.block.number.toString())
    feeSharingReward.timestamp = event.block.timestamp
    feeSharingReward.rewardPerBlock = event.params.rewardPerBlock
    feeSharingReward.blockNumber = event.block.number
  }
  feeSharingReward.save()
}
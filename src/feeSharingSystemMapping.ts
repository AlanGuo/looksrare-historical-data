// Import the generated contract class
import { FeeSharingSystem } from '../generated/FeeSharingSystem/FeeSharingSystem'
import { Address, ethereum, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import {
  FeeSharingReward,
} from "../generated/schema"
const feeSharingRewardContractAddr = "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce"
const AVG_BLOCKS_PER_YEAR = 2102400
const WeiPerEther = BigInt.fromU32(10).pow(18)

export function handleBlock(block: ethereum.Block): void {
  let feeSharingReward = FeeSharingReward.load(block.number.toHexString())
  if(!feeSharingReward) {
    feeSharingReward = new FeeSharingReward(block.number.toHexString())
  }
  let feeSharingSystemContract = FeeSharingSystem.bind(Address.fromHexString(feeSharingRewardContractAddr))
  
  feeSharingReward.rewardPerBlock = feeSharingSystemContract.currentRewardPerBlock()
  const totalShares = feeSharingSystemContract.totalShares()
  const calculateSharePriceInLOOKS = feeSharingSystemContract.calculateSharePriceInLOOKS()
  feeSharingReward.totalSharesInWei = totalShares.times(calculateSharePriceInLOOKS).div(BigInt.fromU32(10).pow(18))
  const totalRewardTokensPerYearInWei = WeiPerEther.times(feeSharingReward.rewardPerBlock).times(BigInt.fromU32(AVG_BLOCKS_PER_YEAR))
  // this should fetched from lp pool
  const looksPriceInWeth = 1
  const relativeValueOfStakedTokensInWei = feeSharingReward.totalSharesInWei.times(BigInt.fromU32(looksPriceInWeth))
  feeSharingReward.apy = BigDecimal.fromString(totalRewardTokensPerYearInWei.toString()).
  div(BigDecimal.fromString(relativeValueOfStakedTokensInWei.toString())).
  times(BigDecimal.fromString("100"))
  feeSharingReward.blockNumber = block.number
  feeSharingReward.timestamp = block.timestamp
  let id = block.hash.toHex()
}
// Import the generated contract class
import { FeeSharingSystem } from "../generated/FeeSharingSystem/FeeSharingSystem"
import { UniswapLooksWeth } from "../generated/UniswapLooksWeth/UniswapLooksWeth"
import { Address, ethereum, BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  FeeSharingReward, Reward,
} from "../generated/schema"
import { AVG_BLOCKS_PER_YEAR, feeSharingRewardContractAddr, lookDistributorContractAddr, uniV2LpContractAddr, WeiPerEther } from "./config"
import { LooksDistributor } from "../generated/LooksDistributor/LooksDistributor"

export function handleBlock(block: ethereum.Block): void {
  let reward = Reward.load(block.number.toString())
  if (!reward) {
    reward = new Reward(block.number.toString())
  }
  let feeSharingReward = FeeSharingReward.load(block.number.toString())
  if(!feeSharingReward) {
    feeSharingReward = new FeeSharingReward(block.number.toString())
  }
  let feeSharingSystemContract = FeeSharingSystem.bind(Address.fromString(feeSharingRewardContractAddr))
  // get totalStakingShares from contract
  feeSharingReward.wethRewardsPerBlock = feeSharingSystemContract.currentRewardPerBlock()
  const totalShares = feeSharingSystemContract.totalShares()
  const sharePriceInLOOKS = feeSharingSystemContract.calculateSharePriceInLOOKS()
  log.debug("totalShares: {}, sharePriceInLOOKS: {}", [totalShares.toString(), sharePriceInLOOKS.toString()])
  const totalSharesLooksInWei = totalShares.times(sharePriceInLOOKS).div(BigInt.fromU32(10).pow(18))
  const totalRewardWethPerYearInWei = WeiPerEther.times(feeSharingReward.wethRewardsPerBlock).times(BigInt.fromU32(AVG_BLOCKS_PER_YEAR))
  log.debug("totalRewardWethPerYearInWei: {}", [totalRewardWethPerYearInWei.toString()])
  // calculate looksPriceWeth from uniswap lp-pool
  const uniswapLooksWethLP = UniswapLooksWeth.bind(Address.fromString(uniV2LpContractAddr))
  const lpReserves = uniswapLooksWethLP.getReserves()
  const totalSupply = uniswapLooksWethLP.totalSupply()
  const twiceLooksLpBalance = lpReserves.value1.times(BigInt.fromU32(2))
  const twiceWethLpBalance = lpReserves.value0.times(BigInt.fromU32(2))
  log.debug("twiceLooksLpBalance: {}, twiceWethLpBalance: {}", [twiceLooksLpBalance.toString(), twiceWethLpBalance.toString()])
  const looksPerLpToken = BigDecimal.fromString(twiceLooksLpBalance.toString()).div(BigDecimal.fromString(totalSupply.toString()))
  const WethPerLpToken = BigDecimal.fromString(twiceWethLpBalance.toString()).div(BigDecimal.fromString(totalSupply.toString()))
  const looksPriceWeth = BigDecimal.fromString(WethPerLpToken.toString()).div(looksPerLpToken)
  const looksPriceWethInWeiDecimal = looksPriceWeth.times(BigDecimal.fromString((BigInt.fromU32(10).pow(18)).toString()))
  const looksPriceWethInWei = BigInt.fromString(looksPriceWethInWeiDecimal.toString().split(".")[0])
  log.debug("looksPriceWethInWei: {}", [looksPriceWethInWei.toString()])
  const relativeValueOfStakedTokensInWei = totalSharesLooksInWei.times(looksPriceWethInWei)
  feeSharingReward.apy = BigDecimal.fromString(totalRewardWethPerYearInWei.toString()).
  div(BigDecimal.fromString(relativeValueOfStakedTokensInWei.toString()))
  log.debug("apy: {}", [feeSharingReward.apy.toString()])
  feeSharingReward.save()
  reward.feeSharingReward = block.number.toString()
  
  // calculate sum of apy
  const looksDistributorContract = LooksDistributor.bind(Address.fromString(lookDistributorContractAddr))
  const looksRewardsPerBlock = looksDistributorContract.rewardPerBlockForStaking()
  const totalLooksRewardsPerYear = looksRewardsPerBlock.times(BigInt.fromU32(AVG_BLOCKS_PER_YEAR))
  const looksRewardApy = BigDecimal.fromString(totalLooksRewardsPerYear.toString()).div(BigDecimal.fromString(reward.totalLooksStaked.toString()))
  reward.apy = feeSharingReward.apy.plus(looksRewardApy)
  reward.save()
}
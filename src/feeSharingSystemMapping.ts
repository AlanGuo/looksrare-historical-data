// Import the generated contract class
import { FeeSharingSystem } from "../generated/FeeSharingSystem/FeeSharingSystem"
import { UniswapLooksWeth } from "../generated/UniswapLooksWeth/UniswapLooksWeth"
import { Address, ethereum, BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  FeeSharingReward,
} from "../generated/schema"
const feeSharingRewardContractAddr: string = "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce"
const uniV2LpContractAddr = "0xDC00bA87Cc2D99468f7f34BC04CBf72E111A32f7"
const AVG_BLOCKS_PER_YEAR = 2102400
const WeiPerEther = BigInt.fromU32(10).pow(18)

export function handleBlock(block: ethereum.Block): void {
  let feeSharingReward = FeeSharingReward.load(block.number.toHexString())
  if(!feeSharingReward) {
    feeSharingReward = new FeeSharingReward(block.number.toHexString())
  }
  let feeSharingSystemContract = FeeSharingSystem.bind(Address.fromString(feeSharingRewardContractAddr))
  // get totalStakingShares from contract
  feeSharingReward.rewardWethPerBlock = feeSharingSystemContract.currentRewardPerBlock()
  const totalShares = feeSharingSystemContract.totalShares()
  const sharePriceInLOOKS = feeSharingSystemContract.calculateSharePriceInLOOKS()
  log.debug("totalShares: {}, sharePriceInLOOKS: {}", [totalShares.toString(), sharePriceInLOOKS.toString()])
  feeSharingReward.totalSharesLooksInWei = totalShares.times(sharePriceInLOOKS).div(BigInt.fromU32(10).pow(18))
  const totalRewardWethPerYearInWei = WeiPerEther.times(feeSharingReward.rewardWethPerBlock).times(BigInt.fromU32(AVG_BLOCKS_PER_YEAR))
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
  feeSharingReward.looksPriceWethInWei = looksPriceWethInWei
  log.debug("looksPriceWethInWei: {}", [looksPriceWethInWei.toString()])
  const relativeValueOfStakedTokensInWei = feeSharingReward.totalSharesLooksInWei.times(looksPriceWethInWei)
  feeSharingReward.apy = BigDecimal.fromString(totalRewardWethPerYearInWei.toString()).
  div(BigDecimal.fromString(relativeValueOfStakedTokensInWei.toString()))
  log.debug("apy: {}", [feeSharingReward.apy.toString()])
  feeSharingReward.blockNumber = block.number
  feeSharingReward.timestamp = block.timestamp
  feeSharingReward.save()
}
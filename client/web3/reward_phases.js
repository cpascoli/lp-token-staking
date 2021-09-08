import { myWeb3, eth, getInstance } from './provider'
import { toTokenDecimals, toTokenUnits, getAccount, toNumber } from './utils'

import StakingRewardPool from "./artifacts/StakingRewardPool.json"
import ETB from "./artifacts/ETB.json"
import CakeLP from "./artifacts/CakeLP.json"


export const getCurrentRewardPeriod = async () => {
  const rewardPerdiodId = await getCurrentRewardPeriodId()
  if (!rewardPerdiodId) return null

  const period = await getRewardPeriod(rewardPerdiodId-1)
  return period
}


export const getRewardPeriods = async () => {

  const count = await getRewardPeriodsCount()
  if (count == 0) return []

  const phases =  Array(count).fill().map( async (_, i) => {
    const period = await getRewardPeriod(i)

    return {
      id: period.id,
      reward: period.reward,
      from: period.from,
      to: period.to,
      lastUpdated: period.lastUpdated,
      totalStaked: period.totalStaked,
      rewardPerTokenStaked: period.rewardPerTokenStaked,
    }
  });
 
  return Promise.all(phases)
}



export const getRewardPeriod = async (index) => {
  
  const pool = await getInstance(StakingRewardPool)
  const rewardPhase = await pool.rewardPeriods.call(index)
  const etb = await getInstance(ETB)
  const cakeLP = await getInstance(CakeLP)

  const currentPhaseId = await getCurrentRewardPeriodId()

  return {
      id: rewardPhase.id.toNumber(),
      reward: await toTokenUnits(etb, rewardPhase.reward),
      from: rewardPhase.from.toNumber(),
      to: rewardPhase.to.toNumber(),
      lastUpdated: rewardPhase.lastUpdated.toNumber(),
      totalStaked: await toNumber(cakeLP,  rewardPhase.totalStaked, 4),
      rewardPerTokenStaked: await toNumber(etb, rewardPhase.rewardPerTokenStaked, 4),
      isCurrent: rewardPhase.id.toNumber() == currentPhaseId
  }
}

export const getCurrentRewardPeriodId = async () => {
  const pool = await getInstance(StakingRewardPool)
  const phaseIdBN = await pool.getCurrentRewardPeriodId.call()
  const phaseId = phaseIdBN.toNumber()

  return (phaseId > 0)? phaseId : undefined
}


export const getRewardPeriodsCount = async () => {
  const pool = await getInstance(StakingRewardPool)
  const count = await pool.getRewardPeriodsCount.call()
  
  return count.toNumber()
}


export const createRewardPeriod = async (amount, startDate, endDate) => {
    const etb = await getInstance(ETB)
    const account = await getAccount()
    const pool = await getInstance(StakingRewardPool)
    const start = Math.round(startDate.getTime() / 1000)
    const end = Math.round(endDate.getTime() / 1000)
    const amountDecimals = await toTokenDecimals(etb, amount)

    return new Promise( async (resolve, reject)  => {

      try {
        await ethereum.enable()
        const result = await pool.newRewardPeriod(amountDecimals, start, end, {from: account} )
        resolve(result)
      } catch (error) {
        console.error(">>> createRewardPeriod error: ", error)
        reject(error)
      }
    });
}
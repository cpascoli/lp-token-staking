import { myWeb3, eth, getInstance } from './provider'
import { toTokenDecimals, toTokenUnits, getAccount, toNumber } from './utils'

import StakingRewardPool from "./artifacts/StakingRewardPool.json"
import ETB from "./artifacts/ETB.json"
import CakeLP from "./artifacts/CakeLP.json"

export const getRewardPhases = async () => {

  const count = await getRewardPhasesCount()

  if (count == 0) return []

  const phases =  Array(count).fill().map( async (_, i) => {
    const phase = await getRewardPhase(i)
    console.log(">>> getRewardPhases -  phase: ", i, phase)

    return {
      id: phase.id,
      from: phase.from,
      to: phase.to,
      reward: phase.reward,
      totalRewardPaid: phase.totalRewardPaid,
      pendingStaked: phase.pendingStaked,
      isCurrent: phase.isCurrent,
    }
  });
 
  return Promise.all(phases)
}


export const getRewardPhase = async (index) => {
  
  const pool = await getInstance(StakingRewardPool)
  const rewardPhase = await pool.rewardPhases.call(index)
  const etb = await getInstance(ETB)
  const cakeLP = await getInstance(CakeLP)

  const currentPhaseId = await getCurrentRewardPhaseId()

  console.log(">>> rewardPhase: ", index, rewardPhase, "currentPhaseId: ", currentPhaseId)

  return {
      id: rewardPhase.id.toNumber(),
      from: rewardPhase.from.toNumber(),
      to: rewardPhase.to.toNumber(),
      reward: await toTokenUnits(etb, rewardPhase.reward),
      totalRewardPaid: await toNumber(etb, rewardPhase.totalRewardPaid, 4),
      pendingStaked: await toNumber(cakeLP,  rewardPhase.pendingStaked, 2),
      totalStakedWeight: await toTokenUnits(cakeLP, rewardPhase.totalStakedWeight),
      lastUpdated: rewardPhase.lastUpdated.toNumber(),
      isCurrent: rewardPhase.id.toNumber() == currentPhaseId
  }
}

export const getCurrentRewardPhaseId = async () => {
  const pool = await getInstance(StakingRewardPool)
  const phaseIdBN = await pool.getCurrentRewardPhaseId.call()
  console.log(">>>> count: ", phaseId)
  const phaseId = phaseIdBN.toNumber()

  return (phaseId > 0)? phaseId : undefined
}


export const getRewardPhasesCount = async () => {
  const pool = await getInstance(StakingRewardPool)
  const count = await pool.rewardPhasesCount.call()
  console.log(">>>> count: ", count)
  
  return count.toNumber()
}


export const createRewardPhase = async (amount, startDate, endDate) => {

    const etb = await getInstance(ETB)
    const account = await getAccount()
    const pool = await getInstance(StakingRewardPool)
    const start = Math.round(startDate.getTime() / 1000)
    const end = Math.round(endDate.getTime() / 1000)
    const amountDecimals = await toTokenDecimals(etb, amount)

    console.log(">>> createRewardPhase input: ", start, end, amount, amountDecimals)

    return new Promise( async (resolve, reject)  => {

      try {
        await ethereum.enable()

        const result = await pool.newRewardPhase(amountDecimals, start, end, {from: account} )
        console.log(">>> createRewardPhase ok - result: ", result)
  
        resolve(result)
      } catch (error) {
        console.error(">>> createRewardPhase error: ", error)
        reject(error)
      }

    });
}
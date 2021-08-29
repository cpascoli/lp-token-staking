import { myWeb3, eth, getInstance } from './provider'
import { toTokenDecimals, toTokenUnits, toNumber, getAccount } from './utils'

import StakingRewardPool from "./artifacts/StakingRewardPool.json"
import CakeLP from "./artifacts/CakeLP.json"
import ETB from "./artifacts/ETB.json"

export const getStakesCount = async () => {
  const account = await getAccount()
  const pool = await getInstance(StakingRewardPool)
  const stakes = await pool.getStakes.call({from: account}) 
  console.log(">>>> getStakesCount: ", stakes.length)

  return stakes.length
}


export const getStakes = async () => {

  const account = await getAccount()
  console.log(">>> getStakes - account: ", account)

  const pool = await getInstance(StakingRewardPool)
  const etb = await getInstance(ETB)
  const cakeLP = await getInstance(CakeLP)

  const stakes = await pool.getStakes.call({from: account})
  console.log(">>>> getStakes: ", stakes)

  const rewards = await pool.getStakeRewardPhases.call({from: account})
  console.log(">>>> getStakes rewards: ", rewards)

  

  const response =  stakes.map( async (stake, i) => {
    console.log(">>> getStakes -  stake: ", i, stake)
    const amount = await toTokenUnits(cakeLP, stake.amount)
    const to = (stake.to != "0")? stake.to : undefined

    const rewardPaid = await toNumber(etb, rewards[i].rewardPaid, 4)
   
    return {
      id: i+1,
      from: stake.from,
      to: to,
      amount: amount,
      rewardPaid: rewardPaid,
    }
  });
 
  console.log(">>>> getStakes: ", response)
  return Promise.all(response)
}


export const createStake = async (amount) => {

    const cakeLP = await getInstance(CakeLP)
    const account = await getAccount()
    const pool = await getInstance(StakingRewardPool)
    const amountDecimals = await toTokenDecimals(cakeLP, amount)

    console.log(">>> createStake input: ", amount, amountDecimals)

    return new Promise( async (resolve, reject)  => {
      try {
        // await ethereum.enable()
        const result = await pool.depositAndStartStake(amountDecimals, { from: account } )
        console.log(">>> createStake ok - result: ", result)
  
        resolve(result)
      } catch (error) {
        console.log(">>> createStake error: ", error)
        reject(error)
      }
    });
}


export const endStake = async (stakeId) => {
  console.log(">>> endStake stakeId: ", stakeId)
  const pool = await getInstance(StakingRewardPool)
  const account = await getAccount()

  return new Promise( async (resolve, reject)  => {
    try {
      const result = await pool.endStakeAndWithdraw(stakeId, { from: account } )
      console.log(">>> endStake ok - result: ", result)

      resolve(result)
    } catch (error) {
      console.log(">>> endStake error: ", error)
      reject(error)
    }
  });

}

export const calculateReward = async (stakeId) => {

  const pool = await getInstance(StakingRewardPool)
  const etb = await getInstance(ETB)
  const cakeLP = await getInstance(CakeLP)
  const account = await getAccount()

  return new Promise( async (resolve, reject)  => {
    try {
      console.log(">>> calculateReward - stakeId: ", stakeId)
      const result = await pool.calculateReward(stakeId, {from: account})
      const info = {
        reward : await toNumber(etb, result.reward, 4), 
        rewardRate : await toNumber(etb, result.rewardRate, '6'), 
        stakeAmount: await toTokenUnits(cakeLP, result.stakeAmount), 
        stakeWeight: await toTokenUnits(cakeLP, result.stakeWeight), 
        totalStakedWeight: await toTokenUnits(cakeLP, result.totalStakedWeight),
        stakedInterval: parseInt(result.stakedInterval),
      }

      console.log(">>> calculateReward ok - info: ", info)

      resolve(info)
    } catch (error) {
      console.log(">>> calculateReward error: ", error)
      reject(error)
    }
  });

}


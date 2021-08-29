import { myWeb3, eth, getInstance } from './provider'
import { toTokenDecimals, toTokenUnits } from './utils'
import ETB from "./artifacts/ETB.json"
import StakingRewardPool from "./artifacts/StakingRewardPool.json"
import { toNumber, getAccount } from './utils'

export const getBalance = async () => {
  const etb = await getInstance(ETB)
  const account = await getAccount()
  const balance = await etb.balanceOf.call(account)

  return {
      balance: balance.toString(),
      units: await toNumber(etb, balance, 4)
  }
}


export const getAllowance = async () => {
  const pool = await getInstance(StakingRewardPool)
  const etb = await getInstance(ETB)
  const account = await getAccount()
  const allowance = await etb.allowance(account, pool.address);
  const allowanceUnits = await toTokenUnits(etb, allowance)

  return allowanceUnits
}

export const approve = async (amount) => {
  const etb = await getInstance(ETB)
  const pool = await getInstance(StakingRewardPool)
  const account = await getAccount()
  const tokenDecimals = await toTokenDecimals(etb, amount)
  console.log(">>>> approve tokenDecimals: ", amount, tokenDecimals)
  await etb.approve(pool.address, tokenDecimals, {from: account});
}




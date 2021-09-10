import { myWeb3, eth, getInstance } from './provider'
import { toTokenDecimals, toTokenUnits } from './utils'
import CakeLP from "./artifacts/CakeLP.json"
import StakingRewardPool from "./artifacts/StakingRewardPool.json"
import { toNumber, getAccount } from './utils'


export const getBalance = async () => {
  const cakeLP = await getInstance(CakeLP)
  const account = await getAccount()
  const balance = await cakeLP.balanceOf.call(account)

  return {
      balance: balance.toString(),
      units: await toNumber(cakeLP, balance, 4)
  }
}


export const getAllowance = async () => {
  const pool = await getInstance(StakingRewardPool)
  const cakeLP = await getInstance(CakeLP)

  const account = await getAccount()
  const allowance = await cakeLP.allowance(account, pool.address);
  const allowanceDec = await toNumber(cakeLP, allowance, 4)

  return Number(allowanceDec.toString())
}

export const approve = async (amount) => {
  const cakeLP = await getInstance(CakeLP)
  const pool = await getInstance(StakingRewardPool)
  const account = await getAccount()

  const tokenDecimals = await toTokenDecimals(cakeLP, amount)
  console.log(">>>> tokenDecimals: ", tokenDecimals)

  const response = await cakeLP.approve(pool.address, tokenDecimals, {from: account});
  return response
}


export const symbol = async() => {
  const cakeLP = await getInstance(CakeLP)
  const response = await cakeLP.symbol()
  console.log(">>>> symbol: ", response)
  return response
}

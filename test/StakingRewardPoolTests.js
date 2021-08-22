const truffleAssert = require("truffle-assertions")
const helper = require("./helpers/truffleTestHelper");

const CakeLP = artifacts.require("CakeLP")
const ETB = artifacts.require("ETB");
const StakingRewardPool = artifacts.require("StakingRewardPool")


contract("StakingRewardPool", accounts => {

    beforeEach(async () => {
        let pool = await StakingRewardPool.deployed()
        await pool.reset()
    })


    it("starting a new reward phase should increase the reward balance", async () => {
        let pool = await StakingRewardPool.deployed()
        let etb = await ETB.deployed()

        let balance = (await pool.rewardBalance()).toNumber()
        assert.equal(balance, 0, "Invalid reward token balance")

        // reward phase
        let reward = 100
        let start = Math.round(new Date("2021-06-01T00:00:00.000+00:00").getTime() / 1000)
        let end = start + (7 * 24 * 60 * 60)

        // approve reward transfer
        await etb.approve(pool.address, reward);

        // start a new reward phase
        await pool.newRewardPhase(reward, start, end);
        let phase = await pool.rewardPhases(0);
       
        assert.equal(phase.from.toNumber(), start, "Invalid reward phase start")
        assert.equal(phase.to.toNumber(), end, "Invalid reward phase end")
        assert.equal(phase.reward.toNumber(), reward, "Invalid reward phase amount")

        // verify reward balance
        let balanceAfter = (await pool.rewardBalance()).toNumber()
        assert.equal(balanceAfter, reward, "Invalid reward token balance after deposit")
     
    })


    it("reward for 1 stake should equal the full reward", async () => {

        let pool = await StakingRewardPool.deployed()
        let etb = await ETB.deployed()

        // start a new reward phase
        let deltaTime = 7 * 24 * 60 * 60 // 7 days
        let reward = 5 * deltaTime // 5 tokens per per second for 7 days
        let start = Math.round(new Date().getTime() / 1000)
        
        let end = start + deltaTime

        await etb.approve(pool.address, reward);
        await pool.newRewardPhase(reward, start, end);
      
        let rewardBalanceBefore = await getRewardBalance(accounts[0])

        // deposit LP tokens 
        let stakeAmount = 10
        await deposit(stakeAmount)
     
        // stake LP tokens 
        await pool.startStake(stakeAmount)

        // wait 7 days
        await helper.advanceTimeAndBlock(deltaTime);
    
        let contractRewards = (await etb.balanceOf(pool.address)).toNumber()

        // rewards data
        // let data = await pool.calculateRewards()
        // console.log(">>> rewardData: ", 
        //     "quota:", data[0].toNumber(), 
        //     "delta_interval:", data[1].toNumber(), 
        //     "rate:", data[2].toNumber(), 
        //     "reward:", data[3].toNumber()
        // )

        // rewards weight
        // let weights = await pool.stakingWeights(start, end, accounts[0])
        // console.log(">>> weights: ", 
        //     "staker:", weights[0].toNumber(), 
        //     "total:", weights[1].toNumber(), 
        // )

        // end stake
        await pool.endStake()

        let rewardBalanceAfter = await getRewardBalance(accounts[0])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore

        assert.equal(rewardEarned, contractRewards, "Reward earned should equal the contract reward for this phase")
    })


    async function deposit(depositAmount) {
        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)
    }


    async function getRewardBalance(address) {
        let etb = await ETB.deployed()
        return (await etb.balanceOf(address)).toNumber()
    }

})
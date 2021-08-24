const truffleAssert = require("truffle-assertions")
const helper = require("./helpers/truffleTestHelper");

const CakeLP = artifacts.require("CakeLP")
const StakingPool = artifacts.require("StakingPool")


contract("StakingPool", accounts => {

    beforeEach(async () => {
        let pool = await StakingPool.deployed()
        pool.reset()
    })

    it("staking CaleLP tokens should decrease the account balance", async () => {
        let pool = await StakingPool.deployed()

        // deposit 100 CakeLP 
        let depositAmount = 100
        await deposit(depositAmount)

        let balance = await getBalance()
        assert.equal(balance, depositAmount, "Invalid initial token balance")
      
        // stake 60 CakeLP
        let stakedAmount = 60
        await pool.startStake(stakedAmount)

        let balanceAfter = await getBalance()
        let expectedBalance = depositAmount - stakedAmount
        assert.equal(balanceAfter, expectedBalance, "Invalid token balance after staking")
    })

    it("staking CaleLP tokens should increase the staked token balance", async () => {
        let pool = await StakingPool.deployed()

        // deposit 100 CakeLP 
        await deposit(100)

        // initial stake
        let stakedTokens = await getStakedBalance()
        assert.equal(stakedTokens, 0, "Account should have no staked tokens balance")

        // stake 60 CakeLP
        let stakedAmount = 60
        await pool.startStake(stakedAmount)

        let stakedTokensAfter = await getStakedBalance()
        assert.equal(stakedTokensAfter, stakedAmount , "Account should have expected staked tokens balance")
    })

    it("staking multiple times should produce multiple Stakes", async () => {
        let pool = await StakingPool.deployed()

        // deposit 100 CakeLP 
        await deposit(100)

        // stake 30 CakeLP
        let firstStakeAmount = 30
        await pool.startStake(firstStakeAmount)

        let stakes1 = await pool.getStakes()
        assert.equal(stakes1.length, 1 , "Account should have 1 stake")
        assert.equal(stakes1[0].amount, firstStakeAmount , "Invalid amount in 1st stake")

        let deltaTime = 10
        await helper.advanceTime(deltaTime);

        // stake 40 CakeLP
        let secondStakeAmount = 40
        await pool.startStake(secondStakeAmount)

        let stakes2 = await pool.getStakes()
        assert.equal(stakes2.length, 2 , "Account should have 2 stakes")
        assert.equal(stakes2[1].amount, secondStakeAmount , "Invalid amount in 2nd stake")

        assert.equal(parseInt(stakes2[1].from), parseInt(stakes2[0].from) + deltaTime, "Invalid time differences between 2 stakes")
    })

    it("unstaking CaleLP tokens should increase the account balance", async () => {
        let pool = await StakingPool.deployed()

        // deposit 100 CakeLP 
        await deposit(100)

        // stake 30 CakeLP
        let stakedAmount = 30
        await pool.startStake(stakedAmount)

        // end stake
        let balanceBefore = await getBalance()
        await pool.endStake(1)
        let balanceAfter = await getBalance()

        assert.equal(balanceAfter, balanceBefore + stakedAmount, "Invalid account balance after end stake")
    })

    it("unstaking CaleLP tokens should descese the staked amount", async () => {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()

        // deposit 100 CakeLP 
        let depositAmount = 100
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)

        // stake 30 CakeLP
        let stakedAmount = 30
        await pool.startStake(stakedAmount)

        // end stake
        let stakedBalanceBefore = await getStakedBalance()
        await pool.endStake(1)
        let stakedBalanceAfter = await getStakedBalance()

        assert.equal(stakedBalanceAfter, stakedBalanceBefore - stakedAmount, "Invalid staked balance after end stake")
    })

    it("attempting to end stake with no active stake should throw", async () => {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()

        let balance = await getBalance()
        assert.equal(balance, 0, "Account should have no balance")

        // deposit 100 CakeLP 
        let depositAmount = 100
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)

        await truffleAssert.reverts(
              pool.endStake(1)
        )
    })


    //// Helpers
  
    async function deposit(depositAmount) {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)
    }

    async function getStakedBalance() {
        let pool = await StakingPool.deployed()
        return (await pool.getStakedBalance()).toNumber()
    }

    async function getBalance() {
        let pool = await StakingPool.deployed()
        return (await pool.getBalance()).toNumber()
    }
})
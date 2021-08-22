const truffleAssert = require("truffle-assertions")
const helper = require("./helpers/truffleTestHelper");

const CakeLP = artifacts.require("CakeLP")
const ETB = artifacts.require("ETB");
const StakingRewardPool = artifacts.require("StakingRewardPool")


contract("StakingRewardPool", accounts => {

    beforeEach(async () => {
        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        await pool.reset()
        
        // reset reward tokens
        await resetTokenBalanceToAmount(etb, accounts[1], 0, accounts[0])
        await resetTokenBalanceToAmount(etb, accounts[2], 0, accounts[0])
        await resetTokenBalanceToAmount(etb, accounts[3], 0, accounts[0])
        await resetTokenBalanceToAmount(etb, accounts[4], 0, accounts[0])

        // allocate some LP tokens
        await resetTokenBalanceToAmount(cakeLP, accounts[1], 10, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[2], 20, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[3], 30, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[4], 40, accounts[0])
    })

    async function resetTokenBalanceToAmount(token, account, tokenAmount, owner) {
            let tokenSymbol = (await token.symbol())

            let accountBalance = (await token.balanceOf(account)).toNumber()
            console.log(">>> accountBalance0: ", accountBalance, tokenSymbol)
            // transfer all tokens back to owner 
            if (accountBalance > 0) {
                await token.transfer(owner, accountBalance, {from: account})
            }
            let accountBalance1 = (await token.balanceOf(account)).toNumber()
            console.log(">>> accountBalance1: ", accountBalance1, tokenSymbol)
           
            if (tokenAmount > 0) {
                await token.transfer(account, tokenAmount)

                let accountBalance2 = (await token.balanceOf(account)).toNumber()
                console.log(">>> accountBalance2: ", accountBalance2, tokenSymbol)
            }
    }


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

        // end stake
        await pool.endStake()

        let rewardBalanceAfter = await getRewardBalance(accounts[0])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore

        assert.equal(rewardEarned, contractRewards, "Reward earned should equal the contract reward for this phase")
    })


    it("stake reward should be proportional to the amount of tokens staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // start a new reward phase
        let deltaTime = 7 * 24 * 60 * 60 // 7 days
        let reward = 5 * deltaTime // 5 tokens per per second for 7 days => 3,024,000 tokens
        let start = Math.round(new Date().getTime() / 1000)
        
        let end = start + deltaTime

        await etb.approve(pool.address, reward);
        await pool.newRewardPhase(reward, start, end);

        // deposit LP tokens 
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, {from: accounts[1]})
        await pool.deposit(stake1Amount, {from: accounts[1]})

        let stake2Amount = 20
        await cakeLP.approve(pool.address, stake2Amount, {from: accounts[2]})
        await pool.deposit(stake2Amount, {from: accounts[2]})

        // stake LP tokens 
        await pool.startStake(stake1Amount, {from: accounts[1]})
        await pool.startStake(stake2Amount, {from: accounts[2]})

        // wait 7 days
        await helper.advanceTimeAndBlock(deltaTime);
      
        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // end stakes
        await pool.endStake({from: accounts[1]})

        data2 = await pool.calculateRewards({from: accounts[1]})
        console.log(">>> rewardData2b: ", 
            "quota:", data2[0].toNumber(), 
            "delta_interval:", data2[1].toNumber(), 
            "rate:", data2[2].toNumber(), 
            "reward:", data2[3].toNumber()
        )

        data2 = await pool.stakingWeights(start, end, accounts[1])
        console.log(">>> rewardData2b: ", 
            "staker:", data2[0].toNumber(), 
            "total:", data2[1].toNumber()
        )

        data2 = await pool.stakesWeight(accounts[1], start, end)
        console.log(">>> stakesWeightb:", data2.toNumber())


        await pool.endStake({from: accounts[2]})

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal( Math.floor(rewardEarned2 / rewardEarned1), 2, "Reward earned by account2 should be double that of account1")
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
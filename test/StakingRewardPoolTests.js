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
        await resetTokenBalanceToAmount(cakeLP, accounts[1], 10000, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[2], 10000, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[3], 10000, accounts[0])
        await resetTokenBalanceToAmount(cakeLP, accounts[4], 10000, accounts[0])
    })

    
    it("starting a new reward phase should setup the reward phase and reward token balance in the pool", async () => {
        let pool = await StakingRewardPool.deployed()
        let etb = await ETB.deployed()

        let balance = (await pool.rewardBalance()).toNumber()
        assert.equal(balance, 0, "Invalid reward token balance")

        // reward phase
        let reward = 100

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + (7 * 24 * 60 * 60)

        // approve reward transfer
        await etb.approve(pool.address, reward);

        // start a new reward phase
        await pool.newRewardPeriod(reward, start, end);
        let count = await pool.getRewardPeriodsCount()
        let phase = await pool.rewardPeriods(count - 1);

        // verify reward phase data
        assert.equal(phase.from.toNumber(), start, "Invalid reward phase start")
        assert.equal(phase.to.toNumber(), end, "Invalid reward phase end")
        assert.equal(phase.reward.toNumber(), reward, "Invalid reward phase amount")

        // verify reward balance
        let balanceAfter = (await pool.rewardBalance()).toNumber()
        assert.equal(balanceAfter, reward, "Invalid reward token balance after deposit")
    })


    it("claimableReward should return the reward yet to be claimed ", async () => {

        let pool = await StakingRewardPool.deployed()
        let etb = await ETB.deployed()
        let cakeLP = await CakeLP.deployed()

        // deposit LP tokens to stake
        let stakeAmount = 10
        await cakeLP.approve(pool.address, stakeAmount, { from: accounts[1] })
        await pool.deposit(stakeAmount, { from: accounts[1] })

        // start a new reward phase
        let period = 1000
        let rewardRate = 2
        let periodReward = rewardRate * period

        await etb.approve(pool.address, periodReward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPeriod(periodReward, start, end);

        // stake LP tokens 
        await pool.startStake(stakeAmount, { from: accounts[1] })
        
        // wait 
        let t0 = (await web3.eth.getBlock('latest')).timestamp
        await helper.advanceTimeAndBlock(200);
        let t1 = (await web3.eth.getBlock('latest')).timestamp

        // get stake reward so far
        let stakeReward1 = (await pool.claimableReward({ from: accounts[1] })).toNumber()
        let stakePeriod1 = t1 - t0
        let expectedReward1 = rewardRate * stakePeriod1
        assert.equal(stakeReward1, expectedReward1, "Invalid stake reward amount")

        // wait some moore
        await advanceTime(100, "stake 2 period");
        let t2 = (await web3.eth.getBlock('latest')).timestamp

        // get stake reward so far
        let stakeReward2 = (await pool.claimableReward({ from: accounts[1] })).toNumber()
        let stakePeriod2 = t2 - t0
        let expectedReward2 = rewardRate * stakePeriod2
        assert.equal(stakeReward2, expectedReward2, "Invalid stake reward amount")
    })


    it("The reward for 1 stake across the full reward phase should equal the full reward", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens to stake
        let stakeAmount = 10
        await cakeLP.approve(pool.address, stakeAmount, { from: accounts[1] })
        await pool.deposit(stakeAmount, { from: accounts[1] })

        // start a new reward phase of 1 week. 
        // reward: 5 tokens per per second for 7 days => 3,024,000 tokens
        let day = 24 * 60 * 60
        let week = 7 * day
        let reward = 5 * week

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + week

        await pool.newRewardPeriod(reward, start, end);

        let contractRewards = (await etb.balanceOf(pool.address)).toNumber()
        let rewardBalanceBefore = await getRewardBalance(accounts[1])

        // stake LP tokens 
        await pool.startStake(stakeAmount, { from: accounts[1] })

        // wait 7 days
        await helper.advanceTimeAndBlock(week - 1);

        // end stake
        await pool.endStake(stakeAmount, { from: accounts[1] })

        let rewardBalanceAfter = await getRewardBalance(accounts[1])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore

        assert.equal(Math.round(rewardEarned / contractRewards), 1, "Reward earned should equal the contract reward for this phase")
    })


    it("The reward for a single stake should be the total reward distributed during the stake interval", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens to stake
        let stakeAmount = 10
        await cakeLP.approve(pool.address, stakeAmount, { from: accounts[1] })
        await pool.deposit(stakeAmount, { from: accounts[1] })

        // start a new reward phase of 1000 seconds
        // reward: 2 tokens per per second for 1000 days => 2,000 tokens
        let period = 1000
        let rewardRate = 2
        let reward = rewardRate * period

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPeriod(reward, start, end);

        let rewardBalanceBefore = await getRewardBalance(accounts[1])

        // wait
        await helper.advanceTimeAndBlock(500);

        // stake LP tokens 
        await pool.startStake(stakeAmount, { from: accounts[1] })
        let t0 = (await web3.eth.getBlock('latest')).timestamp

        // wait 
        await helper.advanceTimeAndBlock(200);
     
        // end stake
        await pool.endStake(stakeAmount, { from: accounts[1] })
        let t1 = (await web3.eth.getBlock('latest')).timestamp

        // verify reward earned
        let rewardBalanceAfter = await getRewardBalance(accounts[1])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore
        let stakeInterval = t1 - t0
        let expectedReward = rewardRate * stakeInterval

        assert.equal(rewardEarned, expectedReward, "Incorrect reward earned")
    })


    it("The reward of 2 overlapping stakes should be proportional to the amount of tokens staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens 
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, { from: accounts[1] })
        await pool.deposit(stake1Amount, { from: accounts[1] })

        let stake2Amount = 20
        await cakeLP.approve(pool.address, stake2Amount, { from: accounts[2] })
        await pool.deposit(stake2Amount, { from: accounts[2] })

        // start a new reward phase of 1000s . 
        // reward: 1 token per second => 1000 tokens
        let period = 1000
        let reward = 1 * period

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await etb.approve(pool.address, reward);
        await pool.newRewardPeriod(reward, start, end);

        // wait some time
        await helper.advanceTimeAndBlock(100)

        // stake LP tokens 
        await pool.startStake(stake1Amount, { from: accounts[1] })
        await pool.startStake(stake2Amount, { from: accounts[2] })

        // wait some time
        await helper.advanceTimeAndBlock(100)

        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // end stakes
        await pool.endStake(1, { from: accounts[1] })
        await pool.endStake(1, { from: accounts[2] })

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned2 / rewardEarned1), 2, "Reward earned by account2 should be double that of account1")
    })


    it("The reward of 2 non overlapping stakes of the same duration and different amounts should be the same", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deplosit LP tokens
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, { from: accounts[1] })
        await pool.deposit(stake1Amount, { from: accounts[1] })

        let stake2Amount = 20
        await cakeLP.approve(pool.address, stake2Amount, { from: accounts[2] })
        await pool.deposit(stake2Amount, { from: accounts[2] })

        // start a new reward phase of 1000 seconds
        // reward: 1 token per second => 1000 tokens
        let period = 1000
        let reward = 1 * period

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPeriod(reward, start, end);

        // get reward token balance before staking starts
        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // start account 1 stake
        await pool.startStake(stake1Amount, { from: accounts[1] })

        // wait 50s
        await helper.advanceTimeAndBlock(50);

        // start account 2 stake
        await pool.startStake(stake2Amount, { from: accounts[2] })

        // end account 2 stake
        await pool.endStake(stake1Amount, { from: accounts[1] })

        // wait 50s
        await helper.advanceTimeAndBlock(50);

        // end second stake
        await pool.endStake(stake2Amount, { from: accounts[2] })

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned2 / rewardEarned1), 1, "Reward earned by account1 should be the same as that of account2")
    })


    it("The rewards for 2 non overlapping stakes of the same amount, should be proportional to the time the tokens were staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deplosit lp tokens
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, {from: accounts[1]})
        await pool.deposit(stake1Amount, {from: accounts[1]})

        let stake2Amount = 10
        await cakeLP.approve(pool.address, stake2Amount, {from: accounts[2]})
        await pool.deposit(stake2Amount, {from: accounts[2]})

        // start a new reward phase of 7 days
        // reward: 5 tokens per per second for 7 days => 3,024,000 tokens
        let period = 1000
        let reward = 1 * period

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPeriod(reward, start, end);

        // reward balances before staking
        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])


        // start 1st stake
        await helper.advanceTimeAndBlock(30);
        await pool.startStake(stake1Amount, {from: accounts[1]})

        // end 1st stake after 100
        let stake1Interval = 100
        await helper.advanceTimeAndBlock(stake1Interval);
        await pool.endStake(stake1Amount, {from: accounts[1]})

        // wait 50
        await helper.advanceTimeAndBlock(50);

        // start 2nd stake 
        await pool.startStake(stake2Amount, {from: accounts[2]})

        // end 2nd stake after 200
        let stake2Interval = 200
        await helper.advanceTimeAndBlock(stake2Interval);
        await pool.endStake(stake2Amount, {from: accounts[2]})

        // get reward balance after
        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned2 / rewardEarned1), stake2Interval / stake1Interval, "Reward earned by account1 should be double that of account2")
    })


    it("The reward of several stakes from 2 accounts should be proportional to the amount and time of the tokens staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deplosit lp tokens
        let stake = 100
        let stake1Amount = 1 * stake
        await cakeLP.approve(pool.address, stake1Amount, { from: accounts[1] })
        await pool.deposit(stake1Amount, { from: accounts[1] })

        let stake2Amount = 3 * stake
        await cakeLP.approve(pool.address, stake2Amount, { from: accounts[2] })
        await pool.deposit(stake2Amount, { from: accounts[2] })

        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // start a new reward phase of 10 days of 100 seconds
        let day = 100
        let rewardPerdiod = 20 * day
        let reward = 1 * rewardPerdiod

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + rewardPerdiod

        // day 0
        await pool.newRewardPeriod(reward, start, end);

        // day 1
        await pool.startStake(stake1Amount, { from: accounts[1] })   // STAKE 1

        let ts1s = (await web3.eth.getBlock('latest')).timestamp
        await advanceTime(day, "day 1");
        let ts1e = (await web3.eth.getBlock('latest')).timestamp

        let reward1Day1 = (await pool.claimableReward({ from: accounts[1] })).toNumber()
        let expected1Day1 = (ts1e - ts1s)
        assert.equal(reward1Day1, expected1Day1, "Incorrect day 1 reward for account 1")

        // day 2
        await pool.startStake(stake2Amount, { from: accounts[2] })    // STAKE 2

        let ts2s = (await web3.eth.getBlock('latest')).timestamp
        await advanceTime(day, "day 2");
        let ts2e = (await web3.eth.getBlock('latest')).timestamp

        let reward1Day2 = (await pool.claimableReward({ from: accounts[1] })).toNumber()
        let expected1Day2 = Math.floor((ts2s - ts1s) / 1) + Math.floor((ts2e - ts2s) * 1 / 4)
        assert.equal(reward1Day2, expected1Day2, "Incorrect day 2 reward for account 1")

        let reward2Day2 = (await pool.claimableReward({ from: accounts[2] })).toNumber()
        let expected2Day2 = Math.floor((ts2e - ts2s) * 3 / 4)
        assert.equal(reward2Day2, expected2Day2, "Incorrect day 2 reward for account 2")

        // day 3
        await advanceTime(day, "day 3");

        await pool.endStake(stake, { from: accounts[1] })      // END STAKE 1
        let ts3e1 = (await web3.eth.getBlock('latest')).timestamp
        await pool.endStake(stake, { from: accounts[2] })      // END STAKE 2
        let ts3e2 = (await web3.eth.getBlock('latest')).timestamp

        let claimable1Day3 = (await pool.claimableReward({ from: accounts[1] })).toNumber()
        let claimable2Day3 = (await pool.claimableReward({ from: accounts[2] })).toNumber()

        assert.equal(claimable1Day3, 0, "Account 1 should not have any reward to claim after ending stake")
        assert.equal(claimable2Day3, 0, "Account 2 should not have any reward to claim after ending stake")

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])
        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before
        let totalRewardDistributed = rewardEarned1 + rewardEarned2

        // caclulate expected total reward received by account1 and account2
        let expected1Day3 = Math.floor((ts2s - ts1s)) + Math.floor((ts3e1 - ts2s) * 1 / 4 )
        let expected2Day3 = Math.floor((ts3e2 - ts2s) * 3 / 4)

        assert.equal(rewardEarned1, expected1Day3, "Incorrect reward receved by account 1")
        assert.equal(rewardEarned2, expected2Day3, "Incorrect reward receved by account 2")

        let expectedRewardDistributed = (ts3e2 - ts1s)
        assert.ok(Math.abs(totalRewardDistributed - expectedRewardDistributed) <= 1, "Incorrect total reward distributed")

    })





    //// Helper functions //// 

    async function getStakedBalance(address) {
        let pool = await StakingRewardPool.deployed()
        let staked = (await pool.getStakedBalance({ from: address })).toNumber()
        return staked
    }


    async function getRewardBalance(address) {
        let etb = await ETB.deployed()
        return (await etb.balanceOf(address)).toString()
    }

    async function resetTokenBalanceToAmount(token, account, tokenAmount, owner) {
        let accountBalance = (await token.balanceOf(account)).toNumber()
        // transfer all tokens back to owner 
        if (accountBalance > 0) {
            await token.transfer(owner, accountBalance, { from: account })
        }
        if (tokenAmount > 0) {
            await token.transfer(account, tokenAmount)
        }
    }


    async function advanceTime(time, info) {
        var ts1 = (await web3.eth.getBlock('latest')).timestamp
        await helper.advanceTimeAndBlock(time);
        var ts2 = (await web3.eth.getBlock('latest')).timestamp
        //assert.equal(ts2 - ts1 , time, `Incorrect timestamps ${info}, ts1: ${ts1}, ts2: ${ts2}, time: ${time}`)
    }

})
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
        let start = Math.round(new Date("2021-06-01T00:00:00.000+00:00").getTime() / 1000)
        let end = start + (7 * 24 * 60 * 60)

        // approve reward transfer
        await etb.approve(pool.address, reward);

        // start a new reward phase
        await pool.newRewardPhase(reward, start, end);
        let phase = await pool.rewardPhases(0);
       
        // verify reward phase data
        assert.equal(phase.from.toNumber(), start, "Invalid reward phase start")
        assert.equal(phase.to.toNumber(), end, "Invalid reward phase end")
        assert.equal(phase.reward.toNumber(), reward, "Invalid reward phase amount")

        // verify reward balance
        let balanceAfter = (await pool.rewardBalance()).toNumber()
        assert.equal(balanceAfter, reward, "Invalid reward token balance after deposit")
    })


    it("The reward for 1 stake across the full reward phase should equal the full reward", async () => {

        let pool = await StakingRewardPool.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens 
        let stakeAmount = 10
        await deposit(stakeAmount)

        // start a new reward phase of 1 week. 
        // reward: 5 tokens per per second for 7 days => 3,024,000 tokens
        let day = 24 * 60 * 60 
        let week = 7 * day
        let reward = 5 * week  

        await etb.approve(pool.address, reward);
      
        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + week

        await pool.newRewardPhase(reward, start, end);

        let contractRewards = (await etb.balanceOf(pool.address)).toNumber()
        let rewardBalanceBefore = await getRewardBalance(accounts[0])
     
        // stake LP tokens 
        await pool.startStake(stakeAmount)

        // wait 7 days
        await helper.advanceTimeAndBlock(week-1);

        // end stake
        await pool.endStake(1)

        let rewardBalanceAfter = await getRewardBalance(accounts[0])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore
        
        assert.equal(Math.round(rewardEarned / contractRewards), 1, "Reward earned should equal the contract reward for this phase")
    })


    it("The reward for 1 only stake should be the total reward accrued since the start of the reward phase", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens to stake
        let stakeAmount = 10
        await cakeLP.approve(pool.address, stakeAmount, {from: accounts[1]})
        await pool.deposit(stakeAmount, {from: accounts[1]})

        // start a new reward phase of 1000 seconds
        // reward: 2 tokens per per second for 1000 days => 2,000 tokens
        let period = 1000
        let reward = 2 * period   

        await etb.approve(pool.address, reward);
      
        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPhase(reward, start, end);

        let contractRewards = (await etb.balanceOf(pool.address)).toNumber()
        let rewardBalanceBefore = await getRewardBalance(accounts[1])

        // wait 500s
        await helper.advanceTimeAndBlock(500);

        // stake LP tokens 
        await pool.startStake(stakeAmount, {from: accounts[1]})

        // wait 100s
        await helper.advanceTimeAndBlock(100);

        // end stake
        await pool.endStake(1, {from: accounts[1]})

        // verify reward earned
        let rewardBalanceAfter = await getRewardBalance(accounts[1])
        let rewardEarned = rewardBalanceAfter - rewardBalanceBefore
        
        let stake = await pool.getStakeInfo(1, {from: accounts[1]})
        //let stakeInterval = stake.to - stake.from
        //let expectedReward = 2 * stakeInterval // reward rate * stake period
        let rewardInterval = stake.to - start
        let expectedReward = 2 * rewardInterval // reward rate * reward period

        assert.equal(rewardEarned, expectedReward, "Incorrect reward earned")
    })

  

    it("The reward of 2 overlapping     stakes should be proportional to the amount of tokens staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deposit LP tokens 
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, {from: accounts[1]})
        await pool.deposit(stake1Amount, {from: accounts[1]})

        let stake2Amount = 20
        await cakeLP.approve(pool.address, stake2Amount, {from: accounts[2]})
        await pool.deposit(stake2Amount, {from: accounts[2]})

        // start a new reward phase of 1000s . 
        // reward: 1 token per second => 1000 tokens
        let period = 1000
        let reward = 1 * period

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await etb.approve(pool.address, reward);
        await pool.newRewardPhase(reward, start, end);

        // stake LP tokens 
        await pool.startStake(stake1Amount, {from: accounts[1]})
        await pool.startStake(stake2Amount, {from: accounts[2]})

        // wait some time
        await helper.advanceTimeAndBlock(100)
      
        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // end stakes
        await pool.endStake(1, {from: accounts[1]})
        await pool.endStake(1, {from: accounts[2]})

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned2 / rewardEarned1), 2, "Reward earned by account2 should be double that of account1")
    })

  
    it("The rewards of 2 stakes should be proportional to the time the tokens were staked", async () => {

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
        let day = 24 * 60 * 60 
        let week = 7 * day
        let reward = 5 * week

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + week

        await pool.newRewardPhase(reward, start, end);

        // wait 1 day
        await helper.advanceTimeAndBlock(day);

        // first stake
        await pool.startStake(stake1Amount, {from: accounts[1]})

        // wait 2 days
        await helper.advanceTimeAndBlock( (2 * day));

        // second stake
        await pool.startStake(stake2Amount, {from: accounts[2]})

        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // wait 1 day
        await helper.advanceTimeAndBlock(day);

        // end stakes
        await pool.endStake(1, {from: accounts[1]})
        await pool.endStake(1, {from: accounts[2]})

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned1 / rewardEarned2), 3, "Reward earned by account1 should be triple that of account2")
    })




    it("The reward of 2 non overlapping stakes of the same duration and different amounts should be the same", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deplosit LP tokens
        let stake1Amount = 10
        await cakeLP.approve(pool.address, stake1Amount, {from: accounts[1]})
        await pool.deposit(stake1Amount, {from: accounts[1]})

        let stake2Amount = 20
        await cakeLP.approve(pool.address, stake2Amount, {from: accounts[2]})
        await pool.deposit(stake2Amount, {from: accounts[2]})

        // start a new reward phase of 1000 seconds
        // reward: 1 token per second => 1000 tokens
        let period = 1000
        let reward = 1 * period

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + period

        await pool.newRewardPhase(reward, start, end);

        // get reward token balance before staking starts
        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])

        // start account 1 stake
        await pool.startStake(stake1Amount, {from: accounts[1]})

        // wait 50s
        await helper.advanceTimeAndBlock(50);

        // start account 2 stake
        await pool.startStake(stake2Amount, {from: accounts[2]})

        // end account 2 stake
        await pool.endStake(1, {from: accounts[1]})

        // wait 50s
        await helper.advanceTimeAndBlock(50);

        // end second stake
        await pool.endStake(1, {from: accounts[2]})

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before

        assert.equal(Math.round(rewardEarned2 / rewardEarned1), 1, "Reward earned by account1 should be the same as that of account2")
    })

  
    it("The reward of several stakes from 4 accounts should be proportional to the amount and time of the tokens staked", async () => {

        let pool = await StakingRewardPool.deployed()
        let cakeLP = await CakeLP.deployed()
        let etb = await ETB.deployed()

        // deplosit lp tokens
        let stake = 100
        let stake1Amount = 5 * stake
        await cakeLP.approve(pool.address, stake1Amount, {from: accounts[1]})
        await pool.deposit(stake1Amount, {from: accounts[1]})

        let stake2Amount = 3 * stake
        await cakeLP.approve(pool.address, stake2Amount, {from: accounts[2]})
        await pool.deposit(stake2Amount, {from: accounts[2]})

        let stake3Amount = 2 * stake
        await cakeLP.approve(pool.address, stake3Amount, {from: accounts[3]})
        await pool.deposit(stake3Amount, {from: accounts[3]})

        let stake4Amount = 1 * stake
        await cakeLP.approve(pool.address, stake4Amount, {from: accounts[4]})
        await pool.deposit(stake4Amount, {from: accounts[4]})

        let rewardBalance1Before = await getRewardBalance(accounts[1])
        let rewardBalance2Before = await getRewardBalance(accounts[2])
        let rewardBalance3Before = await getRewardBalance(accounts[3])
        let rewardBalance4Before = await getRewardBalance(accounts[4])

        // start a new reward phase of 10 days of 100 seconds
        let day = 100 
        let rewardPerdiod = 10 * day
        let reward = 1 * rewardPerdiod

        await etb.approve(pool.address, reward);

        let latestBlock = await web3.eth.getBlock('latest')
        let start = latestBlock.timestamp
        let end = start + rewardPerdiod

        await pool.newRewardPhase(reward, start, end);

        // day 0
        await pool.startStake(stake, {from: accounts[2]})
        await pool.startStake(2 * stake, {from: accounts[3]})

        // day 1
        await helper.advanceTimeAndBlock(day);
        await pool.startStake(3 * stake, {from: accounts[1]})

        // day 3
        await helper.advanceTimeAndBlock(2 * day - 1);
        await pool.startStake(2 * stake, {from: accounts[1]})

        // day 4
        await helper.advanceTimeAndBlock(day);
        await pool.startStake(stake, {from: accounts[4]})

        // day 5
        await helper.advanceTimeAndBlock(day);
        await pool.startStake(2 * stake, {from: accounts[2]})
        await pool.endStake(1, {from: accounts[1]})
        await pool.endStake(1, {from: accounts[2]})
        await pool.endStake(1, {from: accounts[3]})
        
        // day 7
        await helper.advanceTimeAndBlock(2 * day - 1);
        await pool.endStake(2, {from: accounts[1]})
        await pool.endStake(1, {from: accounts[4]})
        
        // day 8
        await helper.advanceTimeAndBlock(day);
        await pool.startStake(stake, {from: accounts[4]})

        // day 10
        await helper.advanceTimeAndBlock(2 * day - 1);  //  1747398450 1748262450 4320000 -> 1748262452
        await pool.endStake(2, {from: accounts[2]})
        await pool.endStake(2, {from: accounts[4]})

        // await printStakes(accounts[1])
        // await printStakes(accounts[2])
        // await printStakes(accounts[3])
        // await printStakes(accounts[4])

        // let rewardBalance1After = await getRewardBalance(accounts[1])
        // let rewardBalance2After = await getRewardBalance(accounts[2])

        let rewardBalance1After = await getRewardBalance(accounts[1])
        let rewardBalance2After = await getRewardBalance(accounts[2])
        let rewardBalance3After = await getRewardBalance(accounts[3])
        let rewardBalance4After = await getRewardBalance(accounts[4])

        let rewardEarned1 = rewardBalance1After - rewardBalance1Before
        let rewardEarned2 = rewardBalance2After - rewardBalance2Before
        let rewardEarned3 = rewardBalance3After - rewardBalance3Before
        let rewardEarned4 = rewardBalance4After - rewardBalance4Before

        // total: 1000
        // distributed: 335 390 156 119  //// 335 389 156 119
        //console.log(">>>> rewards: ", rewardEarned1, rewardEarned2, rewardEarned3, rewardEarned4)

        let totalRewardDistributed = rewardEarned1 + rewardEarned2 + rewardEarned3 + rewardEarned4
        assert.equal(Math.round(totalRewardDistributed / reward), 1 , "Incorrect total reward distributed")
    })



    //// Helper functions //// 

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

    async function resetTokenBalanceToAmount(token, account, tokenAmount, owner) {
        let accountBalance = (await token.balanceOf(account)).toNumber()
        // transfer all tokens back to owner 
        if (accountBalance > 0) {
            await token.transfer(owner, accountBalance, {from: account})
        }
        if (tokenAmount > 0) {
            await token.transfer(account, tokenAmount)
        }
    }

    async function printStakes(account) {
        let pool = await StakingRewardPool.deployed()
        let stakes = await pool.getStakes({from: account})
        console.log("------- stakes: "+account+"----------")
        stakes.forEach(stake => {
            let start = stake.from * 1000
            let end = stake.to * 1000
            // console.log(">> ", stake.amount, start, end)
            let amount = stake.amount
            let from = new Date(start).toISOString().split('T')[0]
            let to = new Date(end).toISOString().split('T')[0]
            console.log(">>>> ", amount, from, to)
        });
       
    }

})
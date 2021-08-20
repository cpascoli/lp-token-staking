const truffleAssert = require("truffle-assertions")

const CakeLP = artifacts.require("CakeLP")
const StakingPool = artifacts.require("StakingPool")


contract("Wallet", accounts => {

    beforeEach(async () => {
        let pool = await StakingPool.deployed()
        pool.reset()
    })


    it("deposit CaleLP tokens into the pool should increase the account balance", async () => {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()

        let balanceBefore = await pool.getBalance()
        assert.equal(balanceBefore, 0, "Account should have no balance")

        // deposit 100 CakeLP 
        let depositAmount = 100
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)

        let balanceAfter = await pool.getBalance()
        assert.equal(balanceAfter, depositAmount , "Account should have expected token balance")
    })

    it("withdraw CaleLP tokens from the pool should reduce the account balance", async () => {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()

        let balance = await pool.getBalance()
        assert.equal(balance, 0, "Account should have no balance")

        // deposit 100 CakeLP 
        let depositAmount = 100
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)

        // withdraw
        await pool.withdraw(depositAmount)

        let balanceAfter = await pool.getBalance()
        assert.equal(balanceAfter, 0 , "Account should have no token after withdraw")

    })

    it("attempting to withdraw more CaleLP tokens than available in balance should throw", async () => {
        let pool = await StakingPool.deployed()
        let cakeLP = await CakeLP.deployed()

        let balance = await pool.getBalance()
        assert.equal(balance, 0, "Account should have no balance")

        // deposit 100 CakeLP 
        let depositAmount = 100
        await cakeLP.approve(pool.address, depositAmount)
        await pool.deposit(depositAmount)

        await truffleAssert.reverts(
              pool.withdraw(depositAmount + 1)
        )

    })

})
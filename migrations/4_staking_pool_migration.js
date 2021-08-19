const ETB = artifacts.require("ETB");
const CakeLP = artifacts.require("CakeLP");
const StakingPool = artifacts.require("StakingPool");



module.exports = (deployer, network, accounts) => {

  deployer.deploy(StakingPool, ETB.address, CakeLP.address)
}

const ETB = artifacts.require("ETB");
const CakeLP = artifacts.require("CakeLP");
const StakingRewardPool = artifacts.require("StakingRewardPool");

module.exports = (deployer, network, accounts) => {
  deployer.deploy(StakingRewardPool, ETB.address, CakeLP.address)
}

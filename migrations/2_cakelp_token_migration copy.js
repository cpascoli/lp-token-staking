const CakeLP = artifacts.require("CakeLP");

module.exports = async function (deployer) {
  deployer.deploy(CakeLP);
};
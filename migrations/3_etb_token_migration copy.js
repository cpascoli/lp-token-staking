const ETB = artifacts.require("ETB");

module.exports = async function (deployer) {
  deployer.deploy(ETB);
};
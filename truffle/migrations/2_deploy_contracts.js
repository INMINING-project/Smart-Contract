var Token = artifacts.require("INMGToken");
module.exports = function(deployer) {
  deployer.deploy(Token);
};
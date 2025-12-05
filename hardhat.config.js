require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable IR-based code generation to avoid "stack too deep" errors
    },
  },
  networks: {
    intuition: {
      url: process.env.INTUITION_RPC_URL || "https://rpc.intuition.systems/http",
      chainId: 1155,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    intuitionTestnet: {
      url: process.env.INTUITION_TESTNET_RPC_URL || "https://rpc-testnet.intuition.systems/http",
      chainId: 1155,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};



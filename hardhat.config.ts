import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const { GOERLI_RPC_URL, MUMBAI_RPC_URL, ADMIN_PRIVATE_KEY } = process.env

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: 'mumbai',
  networks: {
    hardhat: {},
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [ADMIN_PRIVATE_KEY!]
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [ADMIN_PRIVATE_KEY!]
    }
  }
}

export default config
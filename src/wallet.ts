import { ethers, BigNumber } from 'ethers'

export interface BlockchainWallet {
    signer: ethers.Wallet
    walletAddress: string
    walletBalance: BigNumber
    providerGasPrice: BigNumber
}

interface WalletConnectionOptions {
    providerType: 'rpc' | 'alchemy'
    params: (string | undefined)[]
}

export const initializeWallet = async (privateKey: string, options?: WalletConnectionOptions): Promise<BlockchainWallet> => {
    
  if (!privateKey) {
    throw new Error('Private key missing from env variables')
  }

  let provider
    
  if (options) {
    if (options.providerType === 'rpc') {
      provider = new ethers.providers.JsonRpcProvider(...options.params) 
    } else if (options.providerType === 'alchemy') {
      provider = new ethers.providers.AlchemyProvider(...options.params)
    } else {
      provider = ethers.getDefaultProvider()
    }
  } else {
    provider = ethers.getDefaultProvider()
  }

  // Sign the transaction with the contract owner's private key
  const signer = new ethers.Wallet(privateKey, provider)

  const walletAddress = await signer.getAddress()
  const walletBalance = await signer.getBalance()

  const providerGasPrice = await provider.getGasPrice()

  return {
    signer,
    walletAddress,
    walletBalance,
    providerGasPrice
  }

}



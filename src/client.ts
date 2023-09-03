import { ethers } from 'ethers'
import StarABI from '../artifacts/contracts/Star.sol/Star.json'
import ShipABI from '../artifacts/contracts/Ship.sol/Ship.json'
import SLWABI from '../artifacts/contracts/SLW.sol/SLW.json'
import MetaverseABI from '../artifacts/contracts/Metaverse.sol/Metaverse.json'
import { callContractMethod } from './utils/contract'
import { BlockchainWallet, initializeWallet } from './wallet'
import { getParsedEthersError } from '@enzoferey/ethers-error-parser'

type ContractInterface = typeof StarABI.abi | typeof ShipABI.abi

async function mint(
  wallet: BlockchainWallet,
  uri: string,
  contractAddress: string,
  contractAbi: ContractInterface,
  recipientAddress: string
): Promise<number> {

  console.log(`Mint NFT @ contract ${contractAddress} for ${recipientAddress} with URI ${uri}`)

  const nftContract = new ethers.Contract(contractAddress, contractAbi, wallet.signer)

  const transaction = await callContractMethod(nftContract, 'safeMint', [recipientAddress, uri], wallet.providerGasPrice)
  // const transaction = await nftContract.safeMint(recipientAddress, uri)
  const contractInterface = new ethers.utils.Interface(contractAbi)
  const decodedTransaction = contractInterface.parseTransaction(transaction)

  console.log('Decoded TX', decodedTransaction)

  try {
    const receipt = await transaction.wait()
    console.log('TX status', receipt.status)
    console.log('TX event args', receipt.events[0].args)
    const tokenId = receipt.events[0].args[2].toNumber()
    return tokenId
  } catch (err: any) {
    const parsedEthersError = getParsedEthersError(err)
    console.log('Transaction failed', err.receipt)
    throw new Error(parsedEthersError.toString())
  }

}

export interface BlockchainClient {
  mintStar: (id: string) => Promise<number>
  mintShip: (id: string, recipient: string) => Promise<number>
  enterOrbit: (shipId: number, starId: number) => Promise<void>
  harvest: (shipId: number) => Promise<{ shipNftId: number; amountShip: number; starOwnerAddress: string; taxAmount: number } | null>
  getSLWBalance: (address: string) => Promise<number>
  burnSLW: (address: string, amount: number) => Promise<void>
  mintSLW: (address: string, amount: number) => Promise<void>
  setStarLuminosity: (starTokenId: number, luminosity: number) => Promise<void>
  setMinterRole: (metaverseContactAddress: string) => Promise<void>
  sendShip: (shipTokenId: number, starTokenId: number, distance: number, fuel: number, ffwd?: boolean) => Promise<number>
  claimStar: (starTokenId: number, newOwnerAddress: string, ownerPrivateKey: string | null) => Promise<void>
  attackShip: (attacker: number, target: number, power: number) => Promise<{ success: boolean; amount?: number } | null>
}

export const initialize = async (): Promise<BlockchainClient> => {
  
  const {
    MUMBAI_RPC_URL,
    ADMIN_ADDRESS,
    ADMIN_PRIVATE_KEY,
    SLW_CONTRACT_ADDRESS,
    STAR_CONTRACT_ADDRESS,
    SHIP_CONTRACT_ADDRESS,
    METAVERSE_CONTRACT_ADDRESS
  } = process.env

  if (!MUMBAI_RPC_URL) throw new Error('Missing RPC URL setting')
  if (!ADMIN_ADDRESS) throw new Error('Missing admin address setting')
  if (!ADMIN_PRIVATE_KEY) throw new Error('Missing wallet private key setting')
  if (!SLW_CONTRACT_ADDRESS) throw new Error('Missing SLW contract address setting')
  if (!STAR_CONTRACT_ADDRESS) throw new Error('Missing Star contract address setting')
  if (!SHIP_CONTRACT_ADDRESS) throw new Error('Missing Ship contract address setting')
  if (!METAVERSE_CONTRACT_ADDRESS) throw new Error('Missing Metaverse contract address setting')

  const wallet = await initializeWallet(
    ADMIN_PRIVATE_KEY,
    {
      providerType: 'rpc',
      params: [process.env.MUMBAI_RPC_URL]
    })

    
  const client: BlockchainClient = {

    mintStar: async (id): Promise<number> => {
      const tokenId = await mint(wallet, id, STAR_CONTRACT_ADDRESS, StarABI.abi, ADMIN_ADDRESS)
      return tokenId
    },

    mintShip: async (id, recipient): Promise<number> => {
      const tokenId = await mint(wallet, id, SHIP_CONTRACT_ADDRESS, ShipABI.abi, recipient)
      return tokenId
    },

    enterOrbit: async (shipToken, starToken): Promise<void> => {

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )
    
      const tx = await callContractMethod(mvContract, 'enterOrbit', [shipToken, starToken], wallet.providerGasPrice)
      await tx.wait()
    
    },

    harvest: async (shipId): Promise<{ shipNftId: number; amountShip: number; starOwnerAddress: string; taxAmount: number } | null> => {

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )
    
      const tx = await callContractMethod(mvContract, 'harvestSlw', [shipId, shipId], wallet.providerGasPrice)
    
      const contractInterface = new ethers.utils.Interface(MetaverseABI.abi)
      const decodedTransaction = contractInterface.parseTransaction(tx)
      console.log('Decoded TX', decodedTransaction)
    
      try {
        const receipt = await tx.wait()
        console.log('Harvest transaction successful', receipt.events[2])
        const { _ship, _amountShip, _starOwner, _amountTax } = receipt.events[2].args
        const shipNftId = Number(_ship)
        const amountShip = Number(ethers.utils.formatUnits(_amountShip, 18))
        const starOwnerAddress = _starOwner.toString()
        const taxAmount = Number(ethers.utils.formatUnits(_amountTax, 18))
        
        const result = {
          shipNftId,
          amountShip,
          starOwnerAddress,
          taxAmount
        }

        console.log('SLW Harvested:', result)
        return result

      } catch (err: any) {
        const parsedEthersError = getParsedEthersError(err)
        console.log('Transaction failed', err, parsedEthersError)
        throw new Error(parsedEthersError.toString())
      }
    
    },

    getSLWBalance: async (address): Promise<number> => {
    
      const slwContract = new ethers.Contract(SLW_CONTRACT_ADDRESS, SLWABI.abi, wallet.signer)
      const balance = await slwContract.balanceOf(address)
    
      const decimalBalance = ethers.utils.formatUnits(balance, 18)
      console.log(`Got ${address} balance:`, balance, decimalBalance)
      return Number(decimalBalance)
    
    },

    mintSLW: async (address, amount): Promise<void> => {
    
      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )

      const mintAmount = ethers.utils.parseUnits(String(amount), 18)
    
      const tx = await callContractMethod(mvContract, 'mintSlw', [address, mintAmount], wallet.providerGasPrice)
      console.log('Mint tx', tx)
      await tx.wait()
    
    },

    burnSLW: async (address, amount): Promise<void> => {
    
      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )

      const burnAmount = ethers.utils.parseUnits(String(amount), 18)
    
      const tx = await callContractMethod(mvContract, 'burnSlw', [address, burnAmount], wallet.providerGasPrice)
      console.log('Burn tx', tx)
      await tx.wait()
    
    },

    setStarLuminosity: async (starTokenId, luminosity): Promise<void> => {

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )
    
      const luminosityValue = ethers.BigNumber.from(String(Math.round(luminosity * 10 ** 12)))
      console.log('Setting luminosity to', luminosity)

      const tx = await callContractMethod(mvContract, 'setStarLuminosity', [starTokenId, luminosityValue], wallet.providerGasPrice)
      await tx.wait()
    
    },

    setMinterRole: async (metaverseContractAddress): Promise<void> => {

      const slwContract = new ethers.Contract(
        SLW_CONTRACT_ADDRESS,
        SLWABI.abi,
        wallet.signer
      )
    
      const tx = await callContractMethod(slwContract, 'setMinterRole', [metaverseContractAddress], wallet.providerGasPrice)
      await tx.wait()
    
    },

    sendShip: async (shipTokenId, starTokenId, distance, fuel, ffwd?): Promise<number> => {

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )
    
      const distanceValue = ethers.BigNumber.from(String(distance * 10 ** 18))

      const tx = await callContractMethod(mvContract, ffwd ? 'sendShipFfwd' : 'sendShip', [shipTokenId, starTokenId, distanceValue, fuel], wallet.providerGasPrice)

      const contractInterface = new ethers.utils.Interface(MetaverseABI.abi)
      const decodedTransaction = contractInterface.parseTransaction(tx)
      console.log('Decoded TX', decodedTransaction)
    
      try {
        const receipt = await tx.wait()
        console.log('SendFfwd transaction successful', receipt.events)
        const arrivalTime = receipt.events[1].args._arrivalTime.toNumber()
        console.log('Estimated arrival time:', arrivalTime)
        return arrivalTime
      } catch (err: any) {
        const parsedEthersError = getParsedEthersError(err)
        console.log('Transaction failed', err, parsedEthersError)
        throw new Error(parsedEthersError.toString())
      }
    
    },

    claimStar: async (starTokenId, newOwnerAddress, ownerPrivateKey): Promise<void> => {

      const ownerWallet = ownerPrivateKey ? await initializeWallet(
        ownerPrivateKey,
        {
          providerType: 'rpc',
          params: [process.env.MUMBAI_RPC_URL]
        }) : wallet

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )

      const starContract = new ethers.Contract(
        STAR_CONTRACT_ADDRESS,
        StarABI.abi,
        ownerWallet.signer
      )

      const approvalResult = await callContractMethod(starContract, 'approve', [METAVERSE_CONTRACT_ADDRESS, starTokenId], ownerWallet.providerGasPrice)
      console.log('Contract Approval result', approvalResult)

      const tx = await callContractMethod(mvContract, 'claimStar', [starTokenId, newOwnerAddress], wallet.providerGasPrice)

      console.log('TX', tx)
      // await tx.wait()

      const contractInterface = new ethers.utils.Interface(MetaverseABI.abi)
      const decodedTransaction = contractInterface.parseTransaction(tx)
      console.log('Decoded TX', decodedTransaction)
    
      try {
        const receipt = await tx.wait()
        console.log('Claim transaction successful', receipt.events)
        const args = receipt.events[0].args
        console.log('Args:', args)
      } catch (err: any) {
        const parsedEthersError = getParsedEthersError(err)
        console.log('Transaction failed', err, parsedEthersError)
        throw new Error(parsedEthersError.toString())
      }
    
    },

    attackShip: async (attackerTokenId, targetTokenId, power): Promise<{ success: boolean; amount?: number; } | null> => {

      const mvContract = new ethers.Contract(
        METAVERSE_CONTRACT_ADDRESS,
        MetaverseABI.abi,
        wallet.signer
      )
    
      const tx = await callContractMethod(mvContract, 'attackShip', [attackerTokenId, targetTokenId, power], wallet.providerGasPrice)
    
      const contractInterface = new ethers.utils.Interface(MetaverseABI.abi)
      const decodedTransaction = contractInterface.parseTransaction(tx)
      console.log('Decoded TX', decodedTransaction)
    
      try {
        const receipt = await tx.wait()
        console.log('Events', receipt.events)
        if (receipt.events.length > 3) {
          const eventArgs = receipt.events[1].args
          console.log('Attack transaction successful', eventArgs)
          const prizeSlw = ethers.utils.formatUnits(eventArgs._amount, 18)
          console.log('SLW won:', prizeSlw)
          return {
            success: true,
            amount: Number(prizeSlw)
          }
        } else {
          const eventArgs = receipt.events[0].args
          console.log('Attack transaction successful', eventArgs)
          return {
            success: false
          }
        }
      } catch (err: any) {
        const parsedEthersError = getParsedEthersError(err)
        console.log('Transaction failed', err, parsedEthersError)
        throw new Error(parsedEthersError.toString())
      }
    
    },

  }
  
  return client
  
}


export const initializeMock = async (): Promise<BlockchainClient> => {

  const client = await initialize()

  return {

    ...client,

    sendShip: async (shipTokenId, starTokenId, distance, fuel, ffwd?): Promise<number> => {
      return Promise.resolve(60)
    },

    enterOrbit: async (shipToken, starToken): Promise<void> => {
      return Promise.resolve()
    }

  }

}

export default {
  initialize,
  initializeMock
}
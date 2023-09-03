import { ethers } from 'ethers'
import StarABI from '../artifacts/contracts/Star.sol/Star.json'
import ShipABI from '../artifacts/contracts/Star.sol/Star.json'
import { initializeWallet } from '../src/wallet'

async function main() {

  const { 
    MUMBAI_RPC_URL,
    ADMIN_PRIVATE_KEY,
    ADMIN_ADDRESS,
    STAR_CONTRACT_ADDRESS,
    SHIP_CONTRACT_ADDRESS
  } = process.env

  if (!MUMBAI_RPC_URL) throw new Error('Missing RPC URL setting')
  if (!ADMIN_PRIVATE_KEY) throw new Error('Missing wallet private key setting')
  if (!STAR_CONTRACT_ADDRESS) throw new Error('Missing Star contract address setting')
  if (!SHIP_CONTRACT_ADDRESS) throw new Error('Missing Ship contract address setting')

  const wallet = await initializeWallet(
    ADMIN_PRIVATE_KEY,
    {
      providerType: 'rpc',
      params: [ MUMBAI_RPC_URL ]
    })

  const address = process.argv.length >= 3 ? process.argv[2] : ADMIN_ADDRESS
  const contractId = process.argv.length >= 4 ? process.argv[3] : 'SWSTAR'

  if (!address) throw new Error('Missing address parameter')

  const params: {
    [key: string]: {
      contractAddress: string
      contractABI: typeof StarABI.abi | typeof ShipABI.abi
    }
  } = {
    'SWSTAR': {
      contractAddress: STAR_CONTRACT_ADDRESS,
      contractABI: StarABI.abi
    },
    'SWSHIP': {
      contractAddress: SHIP_CONTRACT_ADDRESS,
      contractABI: ShipABI.abi
    }
  }

  const starContract = new ethers.Contract(
    params[contractId].contractAddress,
    params[contractId].contractABI, 
    wallet.signer
  )

  const balance = await starContract.balanceOf(address)

  console.log(`${address} owns ${balance} ${contractId} NFTs`)

  for (let i = 0; i < balance; i++) {
    const tokenId = await starContract.tokenOfOwnerByIndex(address, i)
    const tokenURI = await starContract.tokenURI(tokenId)
    const tokenOwner = await starContract.ownerOf(tokenId)
    console.log(`    ${i}. ${tokenId} - ${tokenURI} - ${tokenOwner}`)
  }

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
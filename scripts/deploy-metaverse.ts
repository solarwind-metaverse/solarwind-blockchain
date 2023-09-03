import { ethers } from 'hardhat'
import { initialize } from '../src/client'

async function main() {


  const { 
    SLW_CONTRACT_ADDRESS,
    SHIP_CONTRACT_ADDRESS,
    STAR_CONTRACT_ADDRESS
  } = process.env

  if (!SLW_CONTRACT_ADDRESS) throw new Error('Missing SLW contract address setting')
  if (!SHIP_CONTRACT_ADDRESS) throw new Error('Missing Ship contract address setting')
  if (!STAR_CONTRACT_ADDRESS) throw new Error('Missing Star contract address setting')

  const Metaverse = await ethers.getContractFactory('Metaverse')
  const metaverse = await Metaverse.deploy(
    SLW_CONTRACT_ADDRESS,
    SHIP_CONTRACT_ADDRESS,
    STAR_CONTRACT_ADDRESS
  )
  await metaverse.deployed()
        
  const { address } = metaverse
  
  console.log(`Metaverse contract address: ${address}`)

  const client = await initialize()
  await client.setMinterRole(address)


}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

import { ethers } from 'hardhat'

async function main() {

  const Ship = await ethers.getContractFactory('Ship')
  const ship = await Ship.deploy()
  await ship.deployed()
      
  const { address } = ship

  console.log(`Ship contract address: ${address}`)
    
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
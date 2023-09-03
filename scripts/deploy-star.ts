import { ethers } from 'hardhat'

async function main() {

  const Star = await ethers.getContractFactory('Star')
  const star = await Star.deploy()
  await star.deployed()
      
  const { address } = star

  console.log(`Star contract address: ${address}`)
    
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
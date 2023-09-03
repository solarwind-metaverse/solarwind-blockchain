import { ethers } from 'hardhat'

async function main() {

  const SLW = await ethers.getContractFactory('SLW')
  const slw = await SLW.deploy()
  await slw.deployed()
      
  const { address } = slw

  console.log(`SLW contract address: ${address}`)
    
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
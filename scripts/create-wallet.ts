import { ethers } from 'ethers'

async function main() {

  const wallet = ethers.Wallet.createRandom()
  const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC_URL)
  const account = new ethers.Wallet(wallet.privateKey, provider)

  console.log(`Address created: ${account.address}`)
  console.log(`Private Key: ${wallet.privateKey}`)

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
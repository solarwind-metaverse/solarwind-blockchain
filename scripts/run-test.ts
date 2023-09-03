import { initialize } from '../src/client'

async function main() {
  
  const client = await initialize()
  
  const result = await client.harvest(26)
  // const result = await client.claimStar(29, '0xC9A1e74EC287e2216e9E6951Bd808d8741712c61', '0x6eb06f792318c86a11473eee22c8996bd7908f2e701ed6ac5a57804f36f2cbbd')

  console.log('TEST RESULT', result)

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
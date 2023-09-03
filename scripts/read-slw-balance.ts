import { initialize } from '../src/client'

async function main() {

  const {
    ADMIN_ADDRESS
  } = process.env

  const address = process.argv.length >= 3 ? process.argv[2] : ADMIN_ADDRESS
  if (!address) throw new Error('Missing address parameter')

  const client = await initialize()
  const balance = await client.getSLWBalance(address)

  console.log(`${address}: ${balance} SLW`)

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
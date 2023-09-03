import { initialize } from '../src/client'

async function main() {

  const client = await initialize()
  const result = await client.mintStar('141527ca-0f1f-40b1-9b48-57154a143fa7')
  console.log('MINT RESULT', result)

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
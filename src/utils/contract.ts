import { BigNumber, Contract } from 'ethers'

export async function callContractMethod(contract: Contract, method: string, inputs: any[], gasPrice: BigNumber) {

  console.log(`${method}(${inputs}) @ ${gasPrice.toBigInt()}`)
  
  const gasLimit = BigNumber.from(5000000)

  try {
    console.log('Estimating gas...')
    const gasEstimate: BigNumber = await contract.estimateGas[method](...inputs)
    const gasLimit = gasEstimate.mul(2)
    console.log('Gas estimate:', gasEstimate.toBigInt())
    console.log('   Gas limit:', gasLimit.toBigInt())
  } catch (error) {
    console.log('Default gas limit:', gasLimit.toBigInt())
  }
    
  console.log('INPUTS ]' + inputs + '[')
  const txResponse = await contract[method](...inputs, { gasPrice, gasLimit })
  console.log('Done! Tx Hash:', txResponse.hash)
  return txResponse

}
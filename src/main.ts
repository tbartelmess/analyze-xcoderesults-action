import * as core from '@actions/core'
import * as xcresulttool from './xcresulttool'
async function run(): Promise<void> {
  try {
    const inputFile: string = core.getInput('results')
    core.info(`Analyzing ${inputFile} ...`)
    await xcresulttool.transformXCodeResults(inputFile)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

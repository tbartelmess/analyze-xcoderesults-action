import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    const inputFile: string = core.getInput('results')
    core.debug(`Analyzing ${inputFile} ...`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

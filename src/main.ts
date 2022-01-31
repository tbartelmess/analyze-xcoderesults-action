import * as core from '@actions/core'
import * as xcresulttool from './xcresulttool'
import * as github from '@actions/github'
import {RestEndpointMethodTypes} from '@octokit/rest'
import * as ok from '@octokit/action'
type PullRequest = RestEndpointMethodTypes['pulls']['get']['response']['data']
type CheckCreate = RestEndpointMethodTypes['checks']['create']['parameters']
type CheckUpdate = RestEndpointMethodTypes['checks']['update']['parameters']
const prEvents = [
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment'
]

function getSHA(): string {
  let sha = github.context.sha
  if (prEvents.includes(github.context.eventName)) {
    const pull = github.context.payload.pull_request as PullRequest
    if (pull?.head.sha) {
      sha = pull?.head.sha
    }
  }
  return sha
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type Ownership = {
  owner: string
  repo: string
}

const formatDate = (): string => {
  return new Date().toISOString()
}

async function run(): Promise<void> {
  try {
    const ownership = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    }
    const sha = getSHA()

    const inputFile: string = core.getInput('results')
    core.info(`Analyzing ${inputFile} ...`)

    let settings = new xcresulttool.GenerationSettings()
    settings.readActionSettings()
    let output = await xcresulttool.generateGitHubCheckOutput(
      settings,
      inputFile
    )
    let conclusion = await xcresulttool.generateGitHubOutcome(
      settings,
      inputFile
    )
    core.debug(
      `Creating a new Run on ${ownership.owner}/${ownership.repo}@${sha}`
    )

    let octokit = new ok.Octokit()

    let allAnnotations = output.annotations
    let firstBatch = true
    const batchLimit = 50

    let checkInfo = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      name: core.getInput('title'),
      status: 'completed',
      conclusion: conclusion,
      head_sha: sha,
      output: output
    }

    while (allAnnotations.length > 0) {
      output.annotations = allAnnotations.slice(0, batchLimit)

      if (firstBatch) {
        firstBatch = false
        const checkRun = await octokit.checks.create(checkInfo as CheckCreate)
        core.debug(`Server create response: ${JSON.stringify(checkRun)}`)
        checkInfo = {
          ...checkInfo,
          ...{check_run_id: checkRun.data.id}
        }
      } else {
        const checkRun = await octokit.checks.update(checkInfo as CheckUpdate)
        core.debug(`Server update response: ${JSON.stringify(checkRun)}`)
      }

      allAnnotations = allAnnotations.slice(batchLimit)

      // avoid hitting a secondary rate
      await sleep(2000)
    }

    core.debug(`Done`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

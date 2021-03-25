import * as core from '@actions/core'
import * as xcresulttool from './xcresulttool'
import * as github from '@actions/github';
import * as Inputs from './namespaces/Inputs';
import * as GitHub from './namespaces/GitHub';

const prEvents = [
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
];


function getSHA(): string {
  let sha = github.context.sha;
  if (prEvents.includes(github.context.eventName)) {
    const pull = github.context.payload.pull_request as GitHub.PullRequest;
    if (pull?.head.sha) {
      sha = pull?.head.sha;
    }
  }
  return sha;
};

type Ownership = {
  owner: string;
  repo: string;
};

const formatDate = (): string => {
  return new Date().toISOString();
};

export const createRun = async (
  octokit: InstanceType<typeof GitHub>,
  name: string,
  sha: string,
  ownership: Ownership,
  output: any
): Promise<number> => {
  const {data} = await octokit.checks.create({
    ...ownership,
    head_sha: sha,
    name: name,
    started_at: formatDate(),
    ...output
  });
  return data.id;
};

async function run(): Promise<void> {
  try {
    core.debug(`Setting up OctoKit`);
    const octokit = github.getOctokit(core.getInput('token'));

    const ownership = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    };
    const sha = getSHA();

    const inputFile: string = core.getInput('results')
    core.info(`Analyzing ${inputFile} ...`)

    let annotations = await xcresulttool.transformXCodeResults(inputFile)
    core.debug(`Creating a new Run on ${ownership.owner}/${ownership.repo}@${sha}`);
    const id = await createRun(octokit, "Test Results", sha, ownership, {"annotations": annotations});
    core.setOutput('check_id', id);
    core.debug(`Done`);
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

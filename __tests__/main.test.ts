import {wait} from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as xcresultool from '../src/xcresulttool'
jest.setTimeout(10000)
const FAILED_TEST_FILE = './TestResultsMacFailed.xcresult'
const SUCCEEDED_TEST_FILE = './TestResultsMac.xcresult'
beforeEach(() => {
  process.env['INPUT_PATHPREFIX'] =
    '/Users/thomasbartelmess/Developer/action-test/'
})

test('wait 500 ms', async () => {
  await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(), FAILED_TEST_FILE)
})

test('test summary generation', async () => {
  let summary = await xcresultool.convertResultsToJSON(FAILED_TEST_FILE)
  expect(summary).toBeDefined
  expect(summary.metrics).toBeDefined
  let markdown = xcresultool.testSummary(summary.metrics)
  expect(markdown.split('\n').length).toBe(7)
  expect(markdown.split('\n')[5]).toBe('| 1 | 1 | 2 |')
})

test('test check output', async () => {
  let result = await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(),FAILED_TEST_FILE)
  let output = result.output
  expect(result.title).toBeDefined()
  expect(result.summary).toBeDefined()
  expect(result.annotations).toBeDefined()
})

test('check failure outcome', async () => {
  let output = await xcresultool.generateGitHubOutcome(new xcresultool.GenerationSettings(),FAILED_TEST_FILE)
  expect(output).toBe('failure')
})

test('check success outcome', async () => {
  let output = await xcresultool.generateGitHubOutcome(new xcresultool.GenerationSettings(),SUCCEEDED_TEST_FILE)
  expect(output).toBe('success')
})



test('test generate warning annotations', async () => {
  process.env['SHOWWARNINGS'] = 'true'
  let output = await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(),FAILED_TEST_FILE)
  expect(output.annotations.length).toBe(2)
})

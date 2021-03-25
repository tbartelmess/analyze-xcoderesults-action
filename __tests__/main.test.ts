import {wait} from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as xcresultool from '../src/xcresulttool'
jest.setTimeout(10000)
const TEST_FILE = './TestResultsMac.xcresult'
beforeEach(() => {
  process.env['INPUT_PATHPREFIX'] =
    '/Users/thomasbartelmess/Developer/action-test/'
})

test('wait 500 ms', async () => {
  await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(), TEST_FILE)
})

test('test summary generation', async () => {
  let summary = await xcresultool.convertResultsToJSON(TEST_FILE)
  expect(summary).toBeDefined
  expect(summary.metrics).toBeDefined
  let markdown = xcresultool.testSummary(summary.metrics)
  expect(markdown.split('\n').length).toBe(5)
  expect(markdown.split('\n')[3]).toBe('| 1 | 1 | 2 |')
})

test('test check output', async () => {
  let result = await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(),TEST_FILE)
  let output = result.output
  expect(result.title).toBeDefined()
  expect(result.summary).toBeDefined()
  expect(result.annotations).toBeDefined()
})

test('test generate warning annotations', async () => {
  process.env['SHOWWARNINGS'] = 'true'
  let output = await xcresultool.generateGitHubCheckOutput(new xcresultool.GenerationSettings(),TEST_FILE)
  expect(output.annotations.length).toBe(2)
})

import {wait} from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as xcresultool from '../src/xcresulttool'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  console.log('hello World')
  process.env['INPUT_PATHPREFIX'] = '/Users/thomasbartelmess/Developer/action-test/'
  await xcresultool.transformXCodeResults('./TestResultsMac.xcresult')
})

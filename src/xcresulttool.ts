import * as exec from '@actions/exec'
import {ExecOptions} from '@actions/exec/lib/interfaces'

export async function transformXCodeResults(
  file: string
): Promise<void> {

  let output = '';
  const options: ExecOptions = {};
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString();
    },
  };
  options.silent = true;
  const args: string[] = [
    "xcresulttool",
     "get",
     "--path",
     file,
     "--format",
     "json"
  ];

  await exec.exec('xcrun', args, options);
}

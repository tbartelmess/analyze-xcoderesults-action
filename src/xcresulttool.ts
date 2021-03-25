import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {ExecOptions} from '@actions/exec/lib/interfaces'
import {RestEndpointMethodTypes} from '@octokit/rest';

export type Annotations = NonNullable<
  NonNullable<RestEndpointMethodTypes['checks']['create']['parameters']['output']>['annotations']
>;


export async function generateGitHubCheckOutput(file: string): Promise<any> {
  let summary: ResultSummary = await convertResultsToJSON(file)
  let annotations = summary.issues.testFailureSummaries._values.map((failure) => {
    return testFailureToGitHubAnnotation(failure);
  });
  return {
    summary:  testSummary(summary.metrics),
    title: "Test Title",
    annotations: annotations
  }
}

export async function convertResultsToJSON(file: string): Promise<ResultSummary> {
  let output = ''
  const options: ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    }
  }
  options.silent = true
  const args: string[] = [
    'xcresulttool',
    'get',
    '--path',
    file,
    '--format',
    'json'
  ]

  await exec.exec('xcrun', args, options)
  return (JSON.parse(output) as ResultSummary)
}

interface ResultSummary {
  actions: [any];
  issues: ResultIssueSummaries
  metrics: ResultMetrics
}

interface TypeInfo {
  _name: string
  _supertype?: TypeInfo
}

interface TypedDictionary<T> {
  _type: TypeInfo,
  _value: T
}

interface TypedArray<T> {
  _type: TypeInfo;
  _values: [T];
}

interface TypedValue<T> {
  _type: TypeInfo,
  _value: T
}

interface ResultIssueSummaries {
  _type: TypeInfo
  testFailureSummaries: TypedArray<any>
}

interface URL {
  _type: TypeInfo
  _value: string
}

interface DocumentLocation {
  _type: TypeInfo
  url: URL
}

interface IssueSummary {
  documentLocationInCreatingWorkspace: DocumentLocation
}

interface TestFailureIssueSummary extends IssueSummary {
  message: TypedValue<string>
  productingTarget: TypedValue<string>
  testCaseName: TypedValue<string>
}

interface LocationInfo {
  file: string
  startLine?: number
  endLine?: number
}

interface TestFailureInfo {
  location: LocationInfo
}

interface ResultMetrics {
  _type: TypeInfo
  testsCount: TypedValue<number>
  testsFailedCount: TypedValue<number>
}

enum AnnotationLevel {
  notice = "notice",
  warning = "warning",
  failure = "failure"
}

interface GitHubAnnotation {
  path: string
  start_line: number
  end_line: number
  start_column?: number
  end_column?: number
  annotation_level: AnnotationLevel
  message: string
  title: string
  raw_details?: string
}



export function testSummary(metrics: ResultMetrics): string {
  let testCount = metrics?.testsCount._value ?? 0
  let failed = metrics?.testsFailedCount._value ?? 0
  let passed = testCount - failed;
  return `
|Tests Passed ✅ | Tests Failed ⛔️ | Tests Total |
|:---------------|:----------------|:------------|
| ${passed} | ${failed} | ${testCount} |
`
}

function testFailureToGitHubAnnotation(issue: TestFailureIssueSummary): GitHubAnnotation {
  let url = new URL(issue.documentLocationInCreatingWorkspace.url._value)
  let path = url.pathname.replace(core.getInput("pathPrefix") + "/", "")
  let locations = url.hash.substring(1).split("&")

  let info: LocationInfo = {
    file: path,
  }

  locations.forEach((location) => {
    let pair = location.split("=");
    if (pair.length == 2) {
      let value = parseInt(pair[1]);
      switch (pair[0]) {
        case 'StartingLineNumber': {
          info.startLine = value;
          break;
        }
        case 'EndingLineNumber': {
          info.endLine = value;
          break;
        }
        default:
          break;
      }
    }
  });

  let annotation: GitHubAnnotation = {
    path: info.file,
    start_line: info.startLine ?? 0,
    end_line: info.endLine ?? info.startLine ?? 0,
    annotation_level: AnnotationLevel.failure,
    title: `${issue.testCaseName._value} failed`,
    message: issue.message._value
  }

  if (info.startLine) {
    annotation['start_line'] = info.startLine;
  }

  return annotation

}

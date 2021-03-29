import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {ExecOptions} from '@actions/exec/lib/interfaces'
import {RestEndpointMethodTypes} from '@octokit/rest'

export type Annotations = NonNullable<
  NonNullable<
    RestEndpointMethodTypes['checks']['create']['parameters']['output']
  >['annotations']
>

interface ResultSummary {
  actions: TypedArray<ActionRecord>
  issues: ResultIssueSummaries
  metrics: ResultMetrics
}

interface TypeInfo {
  _name: string
  _supertype?: TypeInfo
}

interface TypedDictionary<T> {
  _type: TypeInfo
  _value: T
}

interface TypedArray<T> {
  _type: TypeInfo
  _values: [T]
}

interface TypedValue<T> {
  _type: TypeInfo
  _value: T
}

interface ResultIssueSummaries {
  _type: TypeInfo
  testFailureSummaries: TypedArray<TestFailureIssueSummary>
  warningSummaries: TypedArray<IssueSummary>
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
  message: TypedValue<string>
  issueType: TypedValue<string>
}

interface TestFailureIssueSummary extends IssueSummary {
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
  testsCount?: TypedValue<number>
  testsFailedCount?: TypedValue<number>
  warningCount?: TypedValue<number>
}

interface ActionSDKRecord {
  _type: TypeInfo
  identifier: TypedValue<string>
  name: TypedValue<string>
  operatingSystemVersion: TypedValue<string>
}

interface ActionResult {
  _type: TypeInfo
  status: TypedValue<string>
}

interface ActionRecord {
  _type: TypeInfo
  actionResult: ActionResult
  title: TypedValue<string>
  startedTime: TypedValue<string>
  endedTime: TypedValue<string>
  actionStatus: TypedValue<string>
}

interface ActionRunDestinationRecord {
  _type: TypeInfo
  displayName: TypedValue<string>
  localComputerRecord: ActionDeviceRecord
  targetArchitecture: TypedValue<string>
  targetDeviceRecord: ActionDeviceRecord
  targetSDKRecord: ActionSDKRecord
}

interface ActionPlatformRecord {
  _type: TypeInfo
  identifier: TypedValue<string>
  userDescription: TypedValue<string>
}

interface ActionDeviceRecord {
  _type: TypeInfo
  busSpeedInMHz: TypedValue<string>
  cpuCount: TypedValue<string>
  cpuKind: TypedValue<string>
  cpuSpeedInMHz: TypedValue<string>
  identifier: TypedValue<string>
  isConcreteDevice: TypedValue<string>
  logicalCPUCoresPerPackage: TypedValue<string>
  modelCode: TypedValue<string>
  modelName: TypedValue<string>
  modelUTI: TypedValue<string>
  name: TypedValue<string>
  nativeArchitecture: TypedValue<string>
  operatingSystemVersion: TypedValue<string>
  operatingSystemVersionWithBuildNumber: TypedValue<string>
  physicalCPUCoresPerPackage: TypedValue<string>
  platformRecord: TypedValue<string>
  ramSizeInMegabytes: TypedValue<string>
}

enum AnnotationLevel {
  notice = 'notice',
  warning = 'warning',
  failure = 'failure'
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


export class GenerationSettings {
  testSummaryTable: boolean = true;
  testFailureAnnotations: boolean = true;
  summary: boolean = true;
  warningAnnotations: boolean = true;
  showSDKInfo: boolean = true;

  readActionSettings() {
    this.testSummaryTable = (core.getInput('testSummaryTable') === "true")
    this.testFailureAnnotations = (core.getInput('testFailureAnnotations') === "true")
    this.summary = (core.getInput('summary') === "true")
    this.warningAnnotations = (core.getInput('warningAnnotations') === "true")
    this.showSDKInfo = (core.getInput('showSDKInfo') === "true")
  }
}

export async function generateGitHubOutcome(settings: GenerationSettings, file: string): Promise<string> {

  let summary: ResultSummary = await convertResultsToJSON(file)
  let success = true
  summary.actions?._values.forEach(action => {
    console.log(action.title._value);
    success = (success && action.actionResult.status._value != "succeeded" && action.actionResult.status._value != "notRequested");
  });
  return success ? "success" : "failure";
}

export async function generateGitHubCheckOutput(settings: GenerationSettings, file: string): Promise<any> {
  let summary: ResultSummary = await convertResultsToJSON(file)
  let annotations: GitHubAnnotation[] = []

  if (settings.testSummaryTable) {
    summary.issues.testFailureSummaries?._values.forEach(failure => {
      let annotation = testFailureToGitHubAnnotation(failure)
      annotations.push(annotation)
    })
  }

  if (settings.warningAnnotations) {
    let warningAnnotations = summary.issues.warningSummaries?._values.forEach(warning => {
        let annotation = warningsToGitHubAnnotation(warning)
        if (annotation) {
          annotations.push(annotation)
        }
    })
  }

  let summaryMd = ""

  if (settings.summary) {
    summaryMd += buildSummary(summary.metrics)
  }

  if (settings.testSummaryTable) {
    summaryMd += testSummary(summary.metrics)
  }

  return {
    summary: summaryMd,
    title: core.getInput('title'),
    annotations: annotations
  }
}

/**
 * Wrapper around the xcresultool
 * to transform xcresult files to JSON.
 *
 * @argument file: path to the xcresult bundle
 * @argument object: name of the object to export, if null, the root object will be returned
 */
export async function convertResultsToJSON(
  file: string,
  object: string|null = null
): Promise<ResultSummary> {
  let output = ''
  const options: ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    }
  }
  options.silent = true
  let args: string[] = [
    'xcresulttool',
    'get',
    '--path',
    file,
    '--format',
    'json'
  ]

  if (object != null) {
    args.push("--id")
    args.push(object)
  }

  await exec.exec('xcrun', args, options)
  return JSON.parse(output) as ResultSummary
}


export function testSummary(metrics: ResultMetrics): string {
  let testCount = metrics?.testsCount?._value ?? 0
  let failed = metrics?.testsFailedCount?._value ?? 0
  let passed = testCount - failed
  return `

## Tests
|Tests Passed ✅ | Tests Failed ⛔️ | Tests Total |
|:---------------|:----------------|:------------|
| ${passed} | ${failed} | ${testCount} |
`
}


/**
 * Generates a bit of mark down that is shown at the top of the
 * check page
 */
export function buildSummary(metrics: ResultMetrics) {
  let testCount = metrics?.testsCount?._value ?? 0
  let failed = metrics?.testsFailedCount?._value ?? 0
  let passed = testCount - failed
  let warnings = metrics?.warningCount?._value ?? 0
return `
## Summary
🧪 ${passed}/${testCount} tests passed
⚠️ Build finished with **${warnings}** Warnings
`
}

export function parseURLToLocation(urlString: string): LocationInfo {
  let url = new URL(urlString)
  let path = url.pathname.replace(core.getInput('pathPrefix') + '/', '')
  let locations = url.hash.substring(1).split('&') as [string]

  let info: LocationInfo = {
    file: path
  }

  locations.forEach(location => {
    let pair = location.split('=')
    if (pair.length == 2) {
      let value = parseInt(pair[1])
      switch (pair[0]) {
        case 'StartingLineNumber': {
          info.startLine = value
          break
        }
        case 'EndingLineNumber': {
          info.endLine = value
          break
        }
        default:
          break
      }
    }
  })
  return info
}

/**
 * Generate GitHub annotations from an IssueSummary Object
 */
export function warningsToGitHubAnnotation(issue: IssueSummary): GitHubAnnotation | null {
  let location = issue.documentLocationInCreatingWorkspace;
  if (location == undefined) {
    return null;
  }
  let info = parseURLToLocation(issue.documentLocationInCreatingWorkspace.url._value)
  let annotation: GitHubAnnotation = {
    path: info.file,
    start_line: info.startLine ?? 0,
    end_line: info.endLine ?? info.startLine ?? 0,
    annotation_level: AnnotationLevel.warning,
    title: issue.message._value,
    message: issue.message._value
  }
  return annotation
}

/**
 * Generate GitHub annotations from TestFailureIssueSummary objects
 *
 * GitHub requires start_line and end_line to be non-null so when xcode does
 * not include source information we are pretending it's line zero.
 */
export function testFailureToGitHubAnnotation(
  issue: TestFailureIssueSummary
): GitHubAnnotation {
  let info = parseURLToLocation(issue.documentLocationInCreatingWorkspace.url._value)
  let annotation: GitHubAnnotation = {
    path: info.file,
    start_line: info.startLine ?? 0,
    end_line: info.endLine ?? info.startLine ?? 0,
    annotation_level: AnnotationLevel.failure,
    title: `${issue.testCaseName._value} failed`,
    message: issue.message._value
  }
  return annotation
}

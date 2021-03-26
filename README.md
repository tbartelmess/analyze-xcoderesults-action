# Analyze Xcode Build and Test Results

This action adds GitHub checks for XCode results.

## Usage

### Pre-Requisites

This action only works on macOS builders.

By default `xcodebuild` only writes information to stdout, to use this action `xcodebuild`
needs to generate `xcresult` bundle while building and testing.

This can be done using the `-resultBundlePath` flag in XCode build.

The following action uses a script action to invoke xcodebuild and store the results
in `TestResults.xcresult`

```yaml
      - name: Run Tests
        run: |
          xcodebuild -scheme "MyFramework"  -resultBundlePath TestResults test
```

### Configuration
| Option       | Required | Default | Description |
|:-------------|:---------|:--------|:------------|
| `results`     | Yes      |         | Path to the `.xcresult` bundle | 
| `GITHUB_TOKEN` | Yes      |         | GitHub token to create the GitHub check objects. ` ${{ secrets.GITHUB_TOKEN }}` is recommended | 
| `pathPrefix` | No       | Path to the GitHub Workspace | Paths inside the xcode result build are absolute. For GitHub to find the corresponding file for annotations the paths need to be relative to the build directory. If your checkout is not into the GitHub workspace, this option can be used to configure a different prefix. |
| `title`      | No       | Test Results | Title to show up as the check name | 
| `testSummaryTable` | No | `true`    | Setting if a table with the test results should be included | 
| `testFailureAnnotations` | No | `true` | Setting if GitHub code annotations should be added in the check results | 
| `summary` | No | `true` | Setting if a summary section, with the number of warnings and test failures should be included | 
| `warningAnnotations` | No | `false` | Setting if warnings should be added as GitHub annotations| 


### Example

The following example builds and tests the "My Framework" scheme and analyzes the results.

The result of this can be seen in this [test run](https://github.com/tbartelmess/action-test/pull/1/checks?check_run_id=2197833878)

```yaml
---
name: Run Tests
on:
  pull_request

jobs:
  tests:
    name: Run Tests
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Setup Certificates
        uses: apple-actions/import-codesign-certs@v1
        with:
          p12-file-base64: ${{ secrets.CERTIFICATES_P12 }}
          p12-password: ${{ secrets.CERTIFICATES_P12_PASSWORD }}
      - name: Run Tests
        run: |
          xcodebuild -scheme "MyFramework"  -resultBundlePath TestResults test
      - uses: tbartelmess/analyze-xcoderesults-action@0.1.0
        if: always()
        with:
          results: TestResults.xcresult
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

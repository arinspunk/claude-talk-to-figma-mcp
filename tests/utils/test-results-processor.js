/**
 * Custom Test Results Processor for Tool Testing
 * Provides enhanced reporting and analytics for tool test results
 */

const fs = require('fs');
const path = require('path');

/**
 * Process and enhance test results
 */
function processResults(results) {
  const enhancedResults = {
    ...results,
    toolsTestingSummary: generateToolsSummary(results),
    coverageByCategory: generateCoverageSummary(results),
    performanceMetrics: generatePerformanceMetrics(results),
    timestamp: new Date().toISOString()
  };

  // Write enhanced results to file for CI/CD consumption
  writeResultsToFile(enhancedResults);

  // Generate tool-specific reports
  generateToolReports(enhancedResults);

  return enhancedResults;
}

/**
 * Generate summary specific to tools testing
 */
function generateToolsSummary(results) {
  const toolTests = results.testResults.filter(result => 
    result.testFilePath.includes('tools') || 
    result.testFilePath.includes('-tools.test.')
  );

  const toolCategories = {
    variable: [],
    style: [],
    boolean: [],
    layout: [],
    navigation: [],
    storage: [],
    media: [],
    figjam: [],
    dev: []
  };

  // Categorize tool tests
  toolTests.forEach(test => {
    const fileName = path.basename(test.testFilePath);
    Object.keys(toolCategories).forEach(category => {
      if (fileName.includes(category)) {
        toolCategories[category].push(test);
      }
    });
  });

  // Calculate statistics per category
  const categorySummary = {};
  Object.entries(toolCategories).forEach(([category, tests]) => {
    if (tests.length > 0) {
      const totalTests = tests.reduce((sum, test) => sum + test.numTotalTests, 0);
      const passedTests = tests.reduce((sum, test) => sum + test.numPassingTests, 0);
      const failedTests = tests.reduce((sum, test) => sum + test.numFailingTests, 0);
      const avgDuration = tests.reduce((sum, test) => sum + (test.perfStats?.end - test.perfStats?.start || 0), 0) / tests.length;

      categorySummary[category] = {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0,
        avgDuration: Math.round(avgDuration),
        files: tests.length
      };
    }
  });

  return {
    totalToolCategories: Object.keys(categorySummary).length,
    categorySummary,
    overallToolTests: {
      total: toolTests.reduce((sum, test) => sum + test.numTotalTests, 0),
      passed: toolTests.reduce((sum, test) => sum + test.numPassingTests, 0),
      failed: toolTests.reduce((sum, test) => sum + test.numFailingTests, 0)
    }
  };
}

/**
 * Generate coverage summary by tool category
 */
function generateCoverageSummary(results) {
  if (!results.coverageMap) {
    return null;
  }

  const coverageData = results.coverageMap.data || {};
  const toolFiles = Object.keys(coverageData).filter(file => 
    file.includes('/tools/') && file.endsWith('.ts')
  );

  const categoryTracking = {
    'variable-tools': [],
    'style-tools': [],
    'boolean-tools': [],
    'layout-tools': [],
    'navigation-tools': [],
    'storage-tools': [],
    'media-tools': [],
    'figjam-tools': [],
    'dev-tools': []
  };

  // Categorize coverage files
  toolFiles.forEach(file => {
    Object.keys(categoryTracking).forEach(category => {
      if (file.includes(category)) {
        categoryTracking[category].push({
          file,
          coverage: coverageData[file]
        });
      }
    });
  });

  // Calculate coverage per category
  const coverageSummary = {};
  Object.entries(categoryTracking).forEach(([category, files]) => {
    if (files.length > 0) {
      const avgCoverage = {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      };

      files.forEach(({ coverage }) => {
        if (coverage && coverage.s) {
          avgCoverage.lines += Object.values(coverage.l || {}).filter(Boolean).length;
          avgCoverage.functions += Object.values(coverage.f || {}).filter(Boolean).length;
          avgCoverage.branches += Object.values(coverage.b || {}).flat().filter(Boolean).length;
          avgCoverage.statements += Object.values(coverage.s || {}).filter(Boolean).length;
        }
      });

      coverageSummary[category] = {
        files: files.length,
        avgCoverage: {
          lines: (avgCoverage.lines / files.length).toFixed(2),
          functions: (avgCoverage.functions / files.length).toFixed(2),
          branches: (avgCoverage.branches / files.length).toFixed(2),
          statements: (avgCoverage.statements / files.length).toFixed(2)
        }
      };
    }
  });

  return coverageSummary;
}

/**
 * Generate performance metrics for tools
 */
function generatePerformanceMetrics(results) {
  const toolTests = results.testResults.filter(result => 
    result.testFilePath.includes('tools') || 
    result.testFilePath.includes('-tools.test.')
  );

  if (toolTests.length === 0) {
    return null;
  }

  const durations = toolTests.map(test => 
    test.perfStats ? test.perfStats.end - test.perfStats.start : 0
  ).filter(duration => duration > 0);

  if (durations.length === 0) {
    return null;
  }

  durations.sort((a, b) => a - b);

  return {
    totalTests: toolTests.length,
    avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
    medianDuration: Math.round(durations[Math.floor(durations.length / 2)]),
    p95Duration: Math.round(durations[Math.floor(durations.length * 0.95)]),
    slowestTests: toolTests
      .map(test => ({
        file: path.basename(test.testFilePath),
        duration: test.perfStats ? test.perfStats.end - test.perfStats.start : 0
      }))
      .filter(test => test.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
  };
}

/**
 * Write enhanced results to file
 */
function writeResultsToFile(results) {
  const outputDir = path.join(process.cwd(), 'coverage', 'tools');
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write summary report
    const summaryPath = path.join(outputDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: results.timestamp,
      toolsTestingSummary: results.toolsTestingSummary,
      coverageByCategory: results.coverageByCategory,
      performanceMetrics: results.performanceMetrics
    }, null, 2));

    console.log(`✅ Enhanced test results written to: ${summaryPath}`);
  } catch (error) {
    console.warn(`⚠️  Could not write enhanced results: ${error.message}`);
  }
}

/**
 * Generate individual tool reports
 */
function generateToolReports(results) {
  if (!results.toolsTestingSummary?.categorySummary) {
    return;
  }

  const outputDir = path.join(process.cwd(), 'coverage', 'tools', 'reports');
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    Object.entries(results.toolsTestingSummary.categorySummary).forEach(([category, summary]) => {
      const reportPath = path.join(outputDir, `${category}-tools-report.json`);
      fs.writeFileSync(reportPath, JSON.stringify({
        category,
        timestamp: results.timestamp,
        summary,
        coverage: results.coverageByCategory?.[`${category}-tools`] || null
      }, null, 2));
    });

    console.log(`📊 Individual tool reports generated in: ${outputDir}`);
  } catch (error) {
    console.warn(`⚠️  Could not generate tool reports: ${error.message}`);
  }
}

/**
 * Console output enhancement
 */
function enhanceConsoleOutput(results) {
  if (results.toolsTestingSummary) {
    console.log('\n🔧 TOOLS TESTING SUMMARY');
    console.log('========================');
    
    const { overallToolTests, totalToolCategories } = results.toolsTestingSummary;
    console.log(`📦 Tool Categories: ${totalToolCategories}`);
    console.log(`🧪 Total Tool Tests: ${overallToolTests.total}`);
    console.log(`✅ Passed: ${overallToolTests.passed}`);
    console.log(`❌ Failed: ${overallToolTests.failed}`);
    
    if (overallToolTests.total > 0) {
      const successRate = (overallToolTests.passed / overallToolTests.total * 100).toFixed(2);
      console.log(`📊 Success Rate: ${successRate}%`);
    }
  }

  if (results.performanceMetrics) {
    console.log('\n⏱️  PERFORMANCE METRICS');
    console.log('======================');
    console.log(`Average Duration: ${results.performanceMetrics.avgDuration}ms`);
    console.log(`Median Duration: ${results.performanceMetrics.medianDuration}ms`);
    console.log(`95th Percentile: ${results.performanceMetrics.p95Duration}ms`);
    
    if (results.performanceMetrics.slowestTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      results.performanceMetrics.slowestTests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.file}: ${test.duration}ms`);
      });
    }
  }
}

// Main export
module.exports = function(results) {
  const processedResults = processResults(results);
  enhanceConsoleOutput(processedResults);
  return processedResults;
}; 
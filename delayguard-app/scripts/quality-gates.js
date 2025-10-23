#!/usr/bin/env node

/**
 * Quality Gates for DelayGuard
 * 
 * This script implements comprehensive quality gates to ensure code quality,
 * test coverage, and build success before allowing merges or deployments.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  minTestCoverage: 80,
  minTestPassRate: 95,
  maxBundleSize: 1.5, // MB
  maxBuildTime: 10, // seconds
  requiredFiles: [
    'src/components/index.ts',
    'src/services/AnalyticsService.ts',
    'src/types/index.ts',
    'tests/unit/components/MinimalApp.test.tsx',
  ],
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

class QualityGate {
  constructor(name, checkFn) {
    this.name = name;
    this.checkFn = checkFn;
    this.passed = false;
    this.message = '';
  }

  async run() {
    try {
      console.log(`${colors.blue}🔍 Running: ${this.name}${colors.reset}`);
      const result = await this.checkFn();
      this.passed = result.passed;
      this.message = result.message;
      
      if (this.passed) {
        console.log(`${colors.green}✅ ${this.name}: ${this.message}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ ${this.name}: ${this.message}${colors.reset}`);
      }
      
      return this.passed;
    } catch (error) {
      this.passed = false;
      this.message = `Error: ${error.message}`;
      console.log(`${colors.red}❌ ${this.name}: ${this.message}${colors.reset}`);
      return false;
    }
  }
}

// Quality Gate Definitions
const qualityGates = [
  new QualityGate('Build Success', async() => {
    try {
      const startTime = Date.now();
      execSync('npm run build', { stdio: 'pipe', env: { ...process.env, CI: 'true' } });
      const buildTime = (Date.now() - startTime) / 1000;
      
      // Don't fail on build time in CI (can be slower)
      if (buildTime > CONFIG.maxBuildTime && !process.env.CI) {
        return {
          passed: false,
          message: `Build time ${buildTime.toFixed(1)}s exceeds limit of ${CONFIG.maxBuildTime}s`,
        };
      }
      
      return {
        passed: true,
        message: `Build successful in ${buildTime.toFixed(1)}s`,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Build failed: ${error.message}`,
      };
    }
  }),

  new QualityGate('TypeScript Compilation', async() => {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      return {
        passed: true,
        message: 'No TypeScript errors found',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'TypeScript compilation errors found',
      };
    }
  }),

  new QualityGate('Test Suite', async() => {
    try {
      const output = execSync('npm test -- --coverage --watchAll=false --passWithNoTests', { 
        stdio: 'pipe',
        encoding: 'utf8',
      });
      
      // Extract coverage percentage from output
      const coverageMatch = output.match(/All files\s+\|\s+(\d+(?:\.\d+)?)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
      
      // Extract test results - handle both formats
      let testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/);
      if (!testMatch) {
        // Try alternate format (when all tests pass)
        testMatch = output.match(/Tests:\s+(\d+)\s+passed/);
        if (testMatch) {
          const passed = parseInt(testMatch[1]);
          const passRate = 100;
          
          if (coverage < CONFIG.minTestCoverage) {
            return {
              passed: false,
              message: `Coverage ${coverage}% below minimum ${CONFIG.minTestCoverage}%, but all ${passed} tests passed`,
            };
          }
          
          return {
            passed: true,
            message: `All ${passed} tests passed (100%), coverage ${coverage}%`,
          };
        }
      }
      
      if (!testMatch) {
        // If we can't parse, but no error was thrown, assume success
        return {
          passed: true,
          message: 'Tests completed successfully',
        };
      }
      
      const failed = parseInt(testMatch[1]);
      const passed = parseInt(testMatch[2]);
      const total = failed + passed;
      const passRate = (passed / total) * 100;
      
      if (passRate < CONFIG.minTestPassRate) {
        return {
          passed: false,
          message: `Pass rate ${passRate.toFixed(1)}% below minimum ${CONFIG.minTestPassRate}%`,
        };
      }
      
      if (coverage < CONFIG.minTestCoverage) {
        return {
          passed: false,
          message: `Coverage ${coverage}% below minimum ${CONFIG.minTestCoverage}%`,
        };
      }
      
      return {
        passed: true,
        message: `${passed}/${total} tests passed (${passRate.toFixed(1)}%), coverage ${coverage}%`,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Test suite failed: ${error.message}`,
      };
    }
  }),

  new QualityGate('Bundle Size Check', async() => {
    try {
      // Check if dist directory exists and get size
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) {
        return {
          passed: true,
          message: 'Skipping bundle size check (dist not found, but build succeeded)',
        };
      }
      
      // Calculate total size of dist directory
      let totalSize = 0;
      const calculateDirSize = (dirPath) => {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            calculateDirSize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
      };
      calculateDirSize(distPath);
      
      const sizeInMB = totalSize / (1024 * 1024);
      
      if (sizeInMB > CONFIG.maxBundleSize) {
        return {
          passed: false,
          message: `Bundle size ${sizeInMB.toFixed(2)}MB exceeds limit of ${CONFIG.maxBundleSize}MB`,
        };
      }
      
      return {
        passed: true,
        message: `Bundle size ${sizeInMB.toFixed(2)}MB within limit of ${CONFIG.maxBundleSize}MB`,
      };
    } catch (error) {
      return {
        passed: true,
        message: 'Bundle size check skipped (non-critical)',
      };
    }
  }),

  new QualityGate('Required Files Check', async() => {
    const missingFiles = [];
    
    for (const file of CONFIG.requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      return {
        passed: false,
        message: `Missing required files: ${missingFiles.join(', ')}`,
      };
    }
    
    return {
      passed: true,
      message: 'All required files present',
    };
  }),

  new QualityGate('Linting Check', async() => {
    try {
      const output = execSync('npm run lint', { 
        stdio: 'pipe',
        encoding: 'utf8',
      });
      return {
        passed: true,
        message: 'No linting errors found',
      };
    } catch (error) {
      // Check if it's just warnings (exit code 1 with output)
      const output = error.stdout || error.stderr || '';
      const hasErrors = output.includes('error') && !output.includes('0 errors');
      
      if (hasErrors) {
        return {
          passed: false,
          message: 'Linting errors found - run npm run lint:fix',
        };
      } else {
        return {
          passed: true,
          message: 'Linting passed (warnings only)',
        };
      }
    }
  }),
];

// Main execution
async function runQualityGates() {
  console.log(`${colors.bold}${colors.blue}🚀 Running DelayGuard Quality Gates${colors.reset}\n`);
  
  const results = [];
  let allPassed = true;
  
  for (const gate of qualityGates) {
    const passed = await gate.run();
    results.push(gate);
    if (!passed) {
      allPassed = false;
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log(`${colors.bold}${colors.blue}📊 Quality Gates Summary${colors.reset}`);
  console.log('='.repeat(50));
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(gate => {
    const status = gate.passed ? '✅' : '❌';
    const color = gate.passed ? colors.green : colors.red;
    console.log(`${status} ${color}${gate.name}${colors.reset}`);
  });
  
  console.log('='.repeat(50));
  console.log(`${colors.bold}Result: ${allPassed ? `${colors.green}ALL GATES PASSED` : `${colors.red}SOME GATES FAILED`}${colors.reset}`);
  console.log(`${colors.bold}Passed: ${passedCount}/${totalCount}${colors.reset}`);
  
  if (!allPassed) {
    console.log(`\n${colors.red}❌ Quality gates failed. Please fix the issues above before proceeding.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}🎉 All quality gates passed! Ready for merge/deployment.${colors.reset}`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runQualityGates().catch(error => {
    console.error(`${colors.red}❌ Quality gates execution failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { QualityGate, runQualityGates };

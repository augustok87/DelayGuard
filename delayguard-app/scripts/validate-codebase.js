#!/usr/bin/env node

/**
 * Codebase Validation for DelayGuard
 * 
 * This script performs comprehensive validation of the codebase to ensure
 * consistency, quality, and adherence to best practices.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  srcDir: 'src',
  testDir: 'tests',
  requiredExports: [
    'MinimalApp',
    'AnalyticsService',
    'Button',
    'Card',
    'Text',
    'Badge',
    'Modal',
  ],
  maxFileSize: 500, // KB
  maxFunctionLength: 50, // lines
  maxComponentLength: 200, // lines
  requiredTestFiles: [
    'MinimalApp.test.tsx',
    'Button.test.tsx',
    'Card.test.tsx',
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

class ValidationRule {
  constructor(name, checkFn, severity = 'error') {
    this.name = name;
    this.checkFn = checkFn;
    this.severity = severity; // 'error', 'warning', 'info'
    this.passed = false;
    this.message = '';
    this.details = [];
  }

  async run() {
    try {
      console.log(`${colors.blue}🔍 Validating: ${this.name}${colors.reset}`);
      const result = await this.checkFn();
      this.passed = result.passed;
      this.message = result.message;
      this.details = result.details || [];
      
      const statusColor = this.passed ? colors.green : 
                         this.severity === 'error' ? colors.red : 
                         this.severity === 'warning' ? colors.yellow : colors.blue;
      
      const statusIcon = this.passed ? '✅' : 
                        this.severity === 'error' ? '❌' : 
                        this.severity === 'warning' ? '⚠️' : 'ℹ️';
      
      console.log(`${statusIcon} ${statusColor}${this.name}: ${this.message}${colors.reset}`);
      
      if (this.details.length > 0) {
        this.details.forEach(detail => {
          console.log(`   ${colors.yellow}• ${detail}${colors.reset}`);
        });
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

// Validation Rules
const validationRules = [
  new ValidationRule('File Structure Validation', async() => {
    const requiredDirs = ['src', 'tests', 'src/components', 'src/services', 'src/types'];
    const missingDirs = [];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        missingDirs.push(dir);
      }
    }
    
    if (missingDirs.length > 0) {
      return {
        passed: false,
        message: 'Missing required directories',
        details: missingDirs,
      };
    }
    
    return {
      passed: true,
      message: 'All required directories present',
    };
  }),

  new ValidationRule('TypeScript Configuration', async() => {
    if (!fs.existsSync('tsconfig.json')) {
      return {
        passed: false,
        message: 'tsconfig.json not found',
      };
    }
    
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (!tsconfig.compilerOptions?.strict) {
      return {
        passed: false,
        message: 'TypeScript strict mode not enabled',
      };
    }
    
    return {
      passed: true,
      message: 'TypeScript configuration is valid',
    };
  }),

  new ValidationRule('Package.json Validation', async() => {
    if (!fs.existsSync('package.json')) {
      return {
        passed: false,
        message: 'package.json not found',
      };
    }
    
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['build', 'test', 'lint', 'start'];
    const missingScripts = requiredScripts.filter(script => !pkg.scripts?.[script]);
    
    if (missingScripts.length > 0) {
      return {
        passed: false,
        message: 'Missing required scripts',
        details: missingScripts,
      };
    }
    
    return {
      passed: true,
      message: 'Package.json is valid',
    };
  }),

  new ValidationRule('Component Export Validation', async() => {
    const indexFile = 'src/components/index.ts';
    if (!fs.existsSync(indexFile)) {
      return {
        passed: false,
        message: 'Component index file not found',
      };
    }
    
    const content = fs.readFileSync(indexFile, 'utf8');
    const missingExports = CONFIG.requiredExports.filter(exportName => 
      !content.includes(`export { ${exportName}`) && 
      !content.includes(`export default ${exportName}`),
    );
    
    if (missingExports.length > 0) {
      return {
        passed: false,
        message: 'Missing required component exports',
        details: missingExports,
      };
    }
    
    return {
      passed: true,
      message: 'All required components are exported',
    };
  }),

  new ValidationRule('Test File Validation', async() => {
    const missingTests = CONFIG.requiredTestFiles.filter(testFile => 
      !fs.existsSync(path.join(CONFIG.testDir, 'unit/components', testFile)),
    );
    
    if (missingTests.length > 0) {
      return {
        passed: false,
        message: 'Missing required test files',
        details: missingTests,
      };
    }
    
    return {
      passed: true,
      message: 'All required test files present',
    };
  }),

  new ValidationRule('File Size Validation', async() => {
    const largeFiles = [];
    
    function checkDirectory(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const sizeInKB = stats.size / 1024;
          if (sizeInKB > CONFIG.maxFileSize) {
            largeFiles.push(`${filePath} (${sizeInKB.toFixed(1)}KB)`);
          }
        }
      }
    }
    
    checkDirectory(CONFIG.srcDir);
    
    if (largeFiles.length > 0) {
      return {
        passed: false,
        message: 'Files exceed maximum size limit',
        details: largeFiles,
      };
    }
    
    return {
      passed: true,
      message: 'All files within size limits',
    };
  }),

  new ValidationRule('Import/Export Consistency', async() => {
    const issues = [];
    
    function checkFile(filePath) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for unused imports
        if (line.trim().startsWith('import ')) {
          const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/);
          if (importMatch) {
            const importPath = importMatch[1];
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              // Check if the imported file exists
              const resolvedPath = path.resolve(path.dirname(filePath), importPath);
              if (!fs.existsSync(resolvedPath) && !fs.existsSync(`${resolvedPath}.ts`) && !fs.existsSync(`${resolvedPath}.tsx`)) {
                issues.push(`${filePath}:${index + 1} - Import path not found: ${importPath}`);
              }
            }
          }
        }
      });
    }
    
    function checkDirectory(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          checkDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          checkFile(filePath);
        }
      }
    }
    
    checkDirectory(CONFIG.srcDir);
    
    if (issues.length > 0) {
      return {
        passed: false,
        message: 'Import/export consistency issues found',
        details: issues.slice(0, 10), // Limit to first 10 issues
      };
    }
    
    return {
      passed: true,
      message: 'Import/export consistency is valid',
    };
  }),

  new ValidationRule('TypeScript Strict Mode Compliance', async() => {
    try {
      execSync('npx tsc --noEmit --strict', { stdio: 'pipe' });
      return {
        passed: true,
        message: 'TypeScript strict mode compliance verified',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'TypeScript strict mode violations found',
      };
    }
  }),

  new ValidationRule('ESLint Configuration', async() => {
    if (!fs.existsSync('.eslintrc.js') && !fs.existsSync('.eslintrc.json')) {
      return {
        passed: false,
        message: 'ESLint configuration not found',
      };
    }
    
    try {
      execSync('npx eslint --version', { stdio: 'pipe' });
      return {
        passed: true,
        message: 'ESLint is properly configured',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'ESLint not properly configured',
      };
    }
  }),

  new ValidationRule('Test Configuration Validation', async() => {
    if (!fs.existsSync('jest.config.js') && !fs.existsSync('jest.config.json')) {
      return {
        passed: false,
        message: 'Jest configuration not found',
      };
    }
    
    try {
      execSync('npx jest --version', { stdio: 'pipe' });
      return {
        passed: true,
        message: 'Jest is properly configured',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Jest not properly configured',
      };
    }
  }),
];

// Main execution
async function runValidation() {
  console.log(`${colors.bold}${colors.blue}🔍 Running DelayGuard Codebase Validation${colors.reset}\n`);
  
  const results = [];
  let allPassed = true;
  let errorCount = 0;
  let warningCount = 0;
  
  for (const rule of validationRules) {
    const passed = await rule.run();
    results.push(rule);
    
    if (!passed) {
      allPassed = false;
      if (rule.severity === 'error') {
        errorCount++;
      } else if (rule.severity === 'warning') {
        warningCount++;
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log(`${colors.bold}${colors.blue}📊 Validation Summary${colors.reset}`);
  console.log('='.repeat(50));
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(rule => {
    const status = rule.passed ? '✅' : 
                  rule.severity === 'error' ? '❌' : 
                  rule.severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = rule.passed ? colors.green : 
                  rule.severity === 'error' ? colors.red : 
                  rule.severity === 'warning' ? colors.yellow : colors.blue;
    console.log(`${status} ${color}${rule.name}${colors.reset}`);
  });
  
  console.log('='.repeat(50));
  console.log(`${colors.bold}Result: ${allPassed ? `${colors.green}VALIDATION PASSED` : `${colors.red}VALIDATION FAILED`}${colors.reset}`);
  console.log(`${colors.bold}Passed: ${passedCount}/${totalCount}${colors.reset}`);
  console.log(`${colors.bold}Errors: ${errorCount}${colors.reset}`);
  console.log(`${colors.bold}Warnings: ${warningCount}${colors.reset}`);
  
  if (!allPassed) {
    console.log(`\n${colors.red}❌ Validation failed. Please fix the issues above.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}🎉 Codebase validation passed!${colors.reset}`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation().catch(error => {
    console.error(`${colors.red}❌ Validation execution failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { ValidationRule, runValidation };

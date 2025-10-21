#!/usr/bin/env node

/**
 * Fix Broken Tests Script
 * 
 * This script fixes the issues caused by our linting improvements:
 * - Fix display name syntax errors
 * - Fix logger import conflicts
 * - Fix type compatibility issues
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class TestFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      displayNamesFixed: 0,
      loggerImportsFixed: 0,
      typeIssuesFixed: 0,
      errors: [],
    };
  }

  /**
   * Run test fixes
   */
  async runFixes() {
    console.log('🔧 Fixing broken tests...\n');

    // Fix display name syntax errors
    await this.fixDisplayNameSyntax();

    // Fix logger import conflicts
    await this.fixLoggerImports();

    // Fix type compatibility issues
    await this.fixTypeIssues();

    // Display results
    this.displayResults();

    return this.results;
  }

  /**
   * Fix display name syntax errors
   */
  async fixDisplayNameSyntax() {
    console.log('🔧 Fixing display name syntax errors...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix incorrect display name syntax
        // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps) {
        const incorrectPattern = /(\w+)\.displayName = '(\w+)';\s*:\s*(\w+)\)\s*{/g;
        if (incorrectPattern.test(content)) {
          content = content.replace(incorrectPattern, (match, componentName, displayName, propsType) => {
            return `): ${propsType} {`;
          });
          modified = true;
          fixed++;
        }

        // Fix display names that were added in wrong places
        // Remove display names that are in the middle of function signatures
        const wrongPlacePattern = /(\w+)\.displayName = '(\w+)';\s*:\s*(\w+)\s*\)\s*=>\s*{/g;
        if (wrongPlacePattern.test(content)) {
          content = content.replace(wrongPlacePattern, (match, componentName, displayName, propsType) => {
            return `): ${propsType} => {`;
          });
          modified = true;
          fixed++;
        }

        // Fix display names in object literals
        const objectLiteralPattern = /(\w+)\.displayName = '(\w+)';\s*,/g;
        if (objectLiteralPattern.test(content)) {
          content = content.replace(objectLiteralPattern, '');
          modified = true;
          fixed++;
        }

        if (modified) {
          fs.writeFileSync(file, content);
          this.results.filesProcessed++;
        }
      } catch (error) {
        this.results.errors.push(`Error processing ${file}: ${error.message}`);
      }
    }

    this.results.displayNamesFixed = fixed;
    console.log(`✅ Fixed ${fixed} display name syntax errors\n`);
  }

  /**
   * Fix logger import conflicts
   */
  async fixLoggerImports() {
    console.log('🔧 Fixing logger import conflicts...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Remove duplicate logger imports
        const importLines = content.split('\n');
        const loggerImports = importLines.filter(line => 
          line.includes("import { logger }") && line.includes("from '../utils/logger'")
        );

        if (loggerImports.length > 1) {
          // Keep only the first import
          const firstImportIndex = importLines.findIndex(line => 
            line.includes("import { logger }") && line.includes("from '../utils/logger'")
          );
          
          const filteredLines = importLines.filter((line, index) => 
            !(line.includes("import { logger }") && line.includes("from '../utils/logger'") && index !== firstImportIndex)
          );
          
          content = filteredLines.join('\n');
          modified = true;
          fixed++;
        }

        if (modified) {
          fs.writeFileSync(file, content);
          this.results.filesProcessed++;
        }
      } catch (error) {
        this.results.errors.push(`Error processing ${file}: ${error.message}`);
      }
    }

    this.results.loggerImportsFixed = fixed;
    console.log(`✅ Fixed ${fixed} logger import conflicts\n`);
  }

  /**
   * Fix type compatibility issues
   */
  async fixTypeIssues() {
    console.log('🔧 Fixing type compatibility issues...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix logger.error calls with unknown types
        if (content.includes('logger.error(') && content.includes('error)')) {
          content = content.replace(
            /logger\.error\([^,]+,\s*error\)/g,
            'logger.error($1, error as Error)'
          );
          modified = true;
          fixed++;
        }

        // Fix logger.warn calls with unknown types
        if (content.includes('logger.warn(') && content.includes('error)')) {
          content = content.replace(
            /logger\.warn\([^,]+,\s*error\)/g,
            'logger.warn($1, error as Error)'
          );
          modified = true;
          fixed++;
        }

        // Fix error.stack issues
        if (content.includes('error.stack')) {
          content = content.replace(
            /error\.stack/g,
            'error.stack || ""'
          );
          modified = true;
          fixed++;
        }

        if (modified) {
          fs.writeFileSync(file, content);
          this.results.filesProcessed++;
        }
      } catch (error) {
        this.results.errors.push(`Error processing ${file}: ${error.message}`);
      }
    }

    this.results.typeIssuesFixed = fixed;
    console.log(`✅ Fixed ${fixed} type compatibility issues\n`);
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 TEST FIX RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Files Processed: ${this.results.filesProcessed}`);
    console.log(`   Display Names Fixed: ${this.results.displayNamesFixed}`);
    console.log(`   Logger Imports Fixed: ${this.results.loggerImportsFixed}`);
    console.log(`   Type Issues Fixed: ${this.results.typeIssuesFixed}`);

    if (this.results.errors.length > 0) {
      console.log(`\n❌ ERRORS ENCOUNTERED:`);
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run the fixes
if (require.main === module) {
  const fixer = new TestFixer();
  fixer.runFixes()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error running test fixes:', error);
      process.exit(1);
    });
}

module.exports = TestFixer;

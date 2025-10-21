#!/usr/bin/env node

/**
 * Comprehensive Test Fix Script
 * 
 * This script fixes the specific issues causing test failures:
 * - Display name syntax errors in component definitions
 * - Logger import conflicts
 * - Type compatibility issues with unknown types
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class ComprehensiveTestFixer {
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
   * Run comprehensive test fixes
   */
  async runFixes() {
    console.log('🔧 Running comprehensive test fixes...\n');

    // Fix specific files with known issues
    await this.fixSpecificFiles();

    // Fix display name issues
    await this.fixDisplayNameIssues();

    // Fix logger issues
    await this.fixLoggerIssues();

    // Fix type issues
    await this.fixTypeIssues();

    // Display results
    this.displayResults();

    return this.results;
  }

  /**
   * Fix specific files with known issues
   */
  async fixSpecificFiles() {
    console.log('🔧 Fixing specific files...');
    
    const specificFiles = [
      'src/components/tabs/DashboardTab/index.tsx',
      'src/components/tabs/AlertsTab/AlertCard.tsx',
      'src/components/tabs/AlertsTab/index.tsx',
      'src/components/MinimalApp.tsx',
      'src/utils/logger.ts',
    ];

    for (const file of specificFiles) {
      if (fs.existsSync(file)) {
        try {
          let content = fs.readFileSync(file, 'utf8');
          let modified = false;

          // Fix display name syntax errors
          if (content.includes('.displayName = ') && content.includes(':')) {
            // Remove display names that are in the wrong place
            content = content.replace(/(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\)\s*{/g, '): $2 {');
            content = content.replace(/(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\s*\)\s*=>\s*{/g, '): $2 => {');
            modified = true;
          }

          // Fix logger import conflicts in logger.ts
          if (file.includes('logger.ts')) {
            // Remove the self-import
            content = content.replace(/import { logger } from '\.\.\/utils\/logger';/, '');
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(file, content);
            this.results.filesProcessed++;
            console.log(`✅ Fixed ${file}`);
          }
        } catch (error) {
          this.results.errors.push(`Error processing ${file}: ${error.message}`);
        }
      }
    }

    console.log('✅ Specific files fixed\n');
  }

  /**
   * Fix display name issues
   */
  async fixDisplayNameIssues() {
    console.log('🔧 Fixing display name issues...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix display names in wrong places
        const patterns = [
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps) {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\)\s*{/g,
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps) => {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\s*\)\s*=>\s*{/g,
          // Pattern: ComponentName.displayName = 'ComponentName';, (in object literals)
          /(\w+)\.displayName = '[^']+';\s*,/g,
        ];

        for (const pattern of patterns) {
          if (pattern.test(content)) {
            if (pattern === patterns[0]) {
              content = content.replace(pattern, '): $2 {');
            } else if (pattern === patterns[1]) {
              content = content.replace(pattern, '): $2 => {');
            } else {
              content = content.replace(pattern, '');
            }
            modified = true;
            fixed++;
          }
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
    console.log(`✅ Fixed ${fixed} display name issues\n`);
  }

  /**
   * Fix logger issues
   */
  async fixLoggerIssues() {
    console.log('🔧 Fixing logger issues...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix logger import conflicts
        if (content.includes("import { logger } from '../utils/logger'") && file.includes('logger.ts')) {
          content = content.replace(/import { logger } from '\.\.\/utils\/logger';/, '');
          modified = true;
          fixed++;
        }

        // Fix error.stack issues
        if (content.includes('error.stack')) {
          content = content.replace(/error\.stack/g, 'error.stack || ""');
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
    console.log(`✅ Fixed ${fixed} logger issues\n`);
  }

  /**
   * Fix type issues
   */
  async fixTypeIssues() {
    console.log('🔧 Fixing type issues...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix logger calls with unknown types
        const loggerPatterns = [
          // logger.error calls
          /logger\.error\(([^,]+),\s*error\)/g,
          // logger.warn calls
          /logger\.warn\(([^,]+),\s*error\)/g,
        ];

        for (const pattern of loggerPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, 'logger.$1($2, error as Error)');
            modified = true;
            fixed++;
          }
        }

        // Fix specific type issues
        if (content.includes('Object is of type \'unknown\'')) {
          // Fix redis status issues
          content = content.replace(/this\.redis\.status/g, '(this.redis as any).status');
          // Fix redis method calls
          content = content.replace(/this\.redis\.(\w+)/g, '(this.redis as any).$1');
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
    console.log(`✅ Fixed ${fixed} type issues\n`);
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 COMPREHENSIVE TEST FIX RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Files Processed: ${this.results.filesProcessed}`);
    console.log(`   Display Names Fixed: ${this.results.displayNamesFixed}`);
    console.log(`   Logger Issues Fixed: ${this.results.loggerImportsFixed}`);
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
  const fixer = new ComprehensiveTestFixer();
  fixer.runFixes()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error running comprehensive test fixes:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveTestFixer;

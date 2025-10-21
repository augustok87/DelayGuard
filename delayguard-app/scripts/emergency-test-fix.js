#!/usr/bin/env node

/**
 * Emergency Test Fix Script
 * 
 * This script fixes the critical issue where React components are returning
 * their props interface instead of JSX elements due to incorrect display name placement.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class EmergencyTestFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      componentsFixed: 0,
      errors: [],
    };
  }

  /**
   * Run emergency fixes
   */
  async runFixes() {
    console.log('🚨 Running emergency test fixes...\n');

    // Fix all React components with incorrect display name placement
    await this.fixReactComponents();

    // Fix function signature issues
    await this.fixFunctionSignatures();

    // Display results
    this.displayResults();

    return this.results;
  }

  /**
   * Fix React components with incorrect display name placement
   */
  async fixReactComponents() {
    console.log('🔧 Fixing React components...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix display names in wrong places in function signatures
        const patterns = [
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps) {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\)\s*{/g,
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps) => {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\s*\)\s*=>\s*{/g,
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps = {}) {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\s*=\s*\{\}\)\s*{/g,
          // Pattern: ComponentName.displayName = 'ComponentName';: ComponentProps = {}) => {
          /(\w+)\.displayName = '[^']+';\s*:\s*(\w+)\s*=\s*\{\}\)\s*=>\s*{/g,
        ];

        for (const pattern of patterns) {
          if (pattern.test(content)) {
            if (pattern === patterns[0]) {
              content = content.replace(pattern, '): $2 {');
            } else if (pattern === patterns[1]) {
              content = content.replace(pattern, '): $2 => {');
            } else if (pattern === patterns[2]) {
              content = content.replace(pattern, '): $2 = {}) {');
            } else if (pattern === patterns[3]) {
              content = content.replace(pattern, '): $2 = {}) => {');
            }
            modified = true;
            fixed++;
          }
        }

        // Fix display names in wrong places in object literals
        const objectLiteralPattern = /(\w+)\.displayName = '[^']+';\s*,/g;
        if (objectLiteralPattern.test(content)) {
          content = content.replace(objectLiteralPattern, '');
          modified = true;
          fixed++;
        }

        // Fix display names in wrong places in variable declarations
        const variablePattern = /(\w+)\.displayName = '[^']+';\s*=\s*(\w+)\(\)/g;
        if (variablePattern.test(content)) {
          content = content.replace(variablePattern, '$1 = $2()');
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

    this.results.componentsFixed = fixed;
    console.log(`✅ Fixed ${fixed} React component issues\n`);
  }

  /**
   * Fix function signatures
   */
  async fixFunctionSignatures() {
    console.log('🔧 Fixing function signatures...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['**/*.test.*', '**/*.spec.*'] });
    let fixed = 0;

    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Fix function signatures that are missing proper typing
        const functionPatterns = [
          // Pattern: export function ComponentName({ prop1, prop2 }): ComponentProps {
          /export function (\w+)\(\{([^}]+)\}\)\s*:\s*(\w+)\s*{/g,
          // Pattern: export function ComponentName({ prop1, prop2 }): ComponentProps => {
          /export function (\w+)\(\{([^}]+)\}\)\s*:\s*(\w+)\s*=>\s*{/g,
        ];

        for (const pattern of functionPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, 'export function $1({ $2 }: $3) {');
            modified = true;
            fixed++;
          }
        }

        // Fix arrow function signatures
        const arrowPatterns = [
          // Pattern: const ComponentName = ({ prop1, prop2 }): ComponentProps => {
          /const (\w+)\s*=\s*\(\{([^}]+)\}\)\s*:\s*(\w+)\s*=>\s*{/g,
        ];

        for (const pattern of arrowPatterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, 'const $1 = ({ $2 }: $3) => {');
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

    console.log(`✅ Fixed ${fixed} function signature issues\n`);
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 EMERGENCY TEST FIX RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Files Processed: ${this.results.filesProcessed}`);
    console.log(`   Components Fixed: ${this.results.componentsFixed}`);

    if (this.results.errors.length > 0) {
      console.log(`\n❌ ERRORS ENCOUNTERED:`);
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run the fixes
if (require.main === module) {
  const fixer = new EmergencyTestFixer();
  fixer.runFixes()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error running emergency test fixes:', error);
      process.exit(1);
    });
}

module.exports = EmergencyTestFixer;

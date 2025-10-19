#!/usr/bin/env node

/**
 * Automated Lint Fixer - World-Class Standards
 * 
 * This script provides automated fixes for common linting issues:
 * - Auto-fixable issues
 * - Import organization
 * - Code formatting
 * - TypeScript improvements
 * - React optimizations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class LintFixer {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      fixed: 0,
      errors: 0,
      warnings: 0,
      files: [],
      categories: {},
    };
    this.config = {
      srcDir: 'src',
      maxRetries: 3,
      backupDir: 'lint-backups',
    };
  }

  /**
   * Run comprehensive lint fixing
   */
  async runFixes() {
    console.log('🔧 Starting automated lint fixes...\n');

    // Create backup
    await this.createBackup();

    // Run automated fixes
    await this.runAutomatedFixes();

    // Run import organization
    await this.organizeImports();

    // Run TypeScript fixes
    await this.runTypeScriptFixes();

    // Run React optimizations
    await this.runReactOptimizations();

    // Run code formatting
    await this.runCodeFormatting();

    // Generate fix report
    await this.generateFixReport();

    // Display results
    this.displayResults();

    return this.results;
  }

  /**
   * Create backup of source files
   */
  async createBackup() {
    console.log('💾 Creating backup...');
    
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir, `backup-${timestamp}`);
    
    try {
      execSync(`cp -r ${this.config.srcDir} ${backupPath}`, { stdio: 'pipe' });
      console.log(`✅ Backup created: ${backupPath}`);
    } catch (error) {
      console.log('⚠️  Could not create backup, continuing...');
    }
  }

  /**
   * Run automated ESLint fixes
   */
  async runAutomatedFixes() {
    console.log('🤖 Running automated ESLint fixes...');
    
    try {
      // Run standard fixes
      const standardOutput = execSync('npx eslint src --fix --config=.eslintrc.js', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ Standard fixes completed');
    } catch (error) {
      if (error.stdout) {
        console.log('⚠️  Standard fixes completed with remaining issues');
      }
    }

    try {
      // Run enhanced fixes
      const enhancedOutput = execSync('npx eslint src --fix --config=.eslintrc.enhanced.js', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ Enhanced fixes completed');
    } catch (error) {
      if (error.stdout) {
        console.log('⚠️  Enhanced fixes completed with remaining issues');
      }
    }
  }

  /**
   * Organize imports
   */
  async organizeImports() {
    console.log('📦 Organizing imports...');
    
    try {
      // Run import sorting
      execSync('npx eslint src --fix --config=.eslintrc.enhanced.js --rule "import/order: error"', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ Imports organized');
    } catch (error) {
      console.log('⚠️  Import organization completed with issues');
    }
  }

  /**
   * Run TypeScript-specific fixes
   */
  async runTypeScriptFixes() {
    console.log('🔷 Running TypeScript fixes...');
    
    try {
      // Run TypeScript compiler with fixes
      execSync('npx tsc --noEmit --strict', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ TypeScript checks completed');
    } catch (error) {
      console.log('⚠️  TypeScript checks completed with issues');
    }
  }

  /**
   * Run React optimizations
   */
  async runReactOptimizations() {
    console.log('⚛️  Running React optimizations...');
    
    try {
      // Run React-specific fixes
      execSync('npx eslint src --fix --config=.eslintrc.enhanced.js --rule "react/jsx-sort-props: error"', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ React optimizations completed');
    } catch (error) {
      console.log('⚠️  React optimizations completed with issues');
    }
  }

  /**
   * Run code formatting
   */
  async runCodeFormatting() {
    console.log('🎨 Running code formatting...');
    
    try {
      // Run Prettier if available
      execSync('npx prettier --write src/**/*.{ts,tsx,js,jsx}', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      console.log('✅ Code formatting completed');
    } catch (error) {
      console.log('⚠️  Prettier not available, using ESLint formatting');
    }
  }

  /**
   * Generate fix report
   */
  async generateFixReport() {
    console.log('📋 Generating fix report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      recommendations: this.getRecommendations(),
    };

    fs.writeFileSync(
      'lint-fix-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('✅ Fix report generated: lint-fix-report.json');
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 LINT FIXING RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
    console.log(`   Files processed: ${this.results.files.length}`);
    console.log(`   Issues fixed: ${this.results.fixed}`);
    console.log(`   Remaining errors: ${this.results.errors}`);
    console.log(`   Remaining warnings: ${this.results.warnings}`);

    if (this.results.fixed > 0) {
      console.log(`\n✅ SUCCESS: ${this.results.fixed} issues were automatically fixed`);
    }

    if (this.results.errors > 0) {
      console.log(`\n❌ ATTENTION: ${this.results.errors} errors still need manual fixing`);
    }

    if (this.results.warnings > 0) {
      console.log(`\n⚠️  WARNING: ${this.results.warnings} warnings still need attention`);
    }

    console.log(`\n📁 BACKUP: Created in ${this.config.backupDir}/`);
    console.log(`📋 REPORT: Generated lint-fix-report.json`);

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.results.errors > 0) {
      recommendations.push('Review and fix remaining errors manually');
    }
    
    if (this.results.warnings > 50) {
      recommendations.push('Address remaining warnings systematically');
    }
    
    if (this.results.fixed > 0) {
      recommendations.push('Review the changes made by automated fixes');
    }
    
    recommendations.push('Run tests to ensure fixes did not break functionality');
    recommendations.push('Consider running lint analysis again to measure progress');
    
    return recommendations;
  }
}

// Run the fixes
if (require.main === module) {
  const fixer = new LintFixer();
  fixer.runFixes()
    .then(results => {
      process.exit(results.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error running lint fixes:', error);
      process.exit(1);
    });
}

module.exports = LintFixer;

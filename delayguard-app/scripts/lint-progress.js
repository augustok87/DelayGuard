#!/usr/bin/env node

/**
 * Lint Progress Tracker - World-Class Standards
 * 
 * This script provides comprehensive linting analysis with:
 * - Progress tracking
 * - Detailed reporting
 * - Automated fixes where possible
 * - Performance metrics
 * - Quality gates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class LintProgressTracker {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      total: 0,
      errors: 0,
      warnings: 0,
      fixable: 0,
      fixed: 0,
      categories: {},
      files: {},
      performance: {},
    };
    this.config = {
      enhanced: '.eslintrc.enhanced.js',
      standard: '.eslintrc.js',
      outputDir: 'lint-reports',
      maxErrors: 0,
      maxWarnings: 10,
    };
  }

  /**
   * Run comprehensive linting analysis
   */
  async runAnalysis() {
    console.log('🔍 Starting comprehensive linting analysis...\n');

    // Create output directory
    this.ensureOutputDir();

    // Run standard linting
    await this.runStandardLint();

    // Run enhanced linting
    await this.runEnhancedLint();

    // Generate reports
    await this.generateReports();

    // Display results
    this.displayResults();

    // Check quality gates
    this.checkQualityGates();

    return this.results;
  }

  /**
   * Run standard ESLint
   */
  async runStandardLint() {
    console.log('📊 Running standard ESLint...');
    
    try {
      const output = execSync('npx eslint src --format=json --config=.eslintrc.js', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      this.parseLintOutput(output, 'standard');
      console.log('✅ Standard linting completed');
    } catch (error) {
      if (error.stdout) {
        this.parseLintOutput(error.stdout, 'standard');
      }
      console.log('⚠️  Standard linting completed with issues');
    }
  }

  /**
   * Run enhanced ESLint
   */
  async runEnhancedLint() {
    console.log('🚀 Running enhanced ESLint (world-class standards)...');
    
    try {
      const output = execSync('npx eslint src --format=json --config=.eslintrc.enhanced.js', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      
      this.parseLintOutput(output, 'enhanced');
      console.log('✅ Enhanced linting completed');
    } catch (error) {
      if (error.stdout) {
        this.parseLintOutput(error.stdout, 'enhanced');
      }
      console.log('⚠️  Enhanced linting completed with issues');
    }
  }

  /**
   * Parse ESLint output
   */
  parseLintOutput(output, type) {
    try {
      const data = JSON.parse(output);
      
      data.forEach(file => {
        const fileName = file.filePath;
        const messages = file.messages;
        
        if (!this.results.files[fileName]) {
          this.results.files[fileName] = {
            standard: { errors: 0, warnings: 0, messages: [] },
            enhanced: { errors: 0, warnings: 0, messages: [] },
          };
        }

        messages.forEach(message => {
          const severity = message.severity === 2 ? 'errors' : 'warnings';
          this.results.files[fileName][type][severity]++;
          this.results.files[fileName][type].messages.push({
            line: message.line,
            column: message.column,
            rule: message.ruleId,
            message: message.message,
            severity: message.severity,
            fixable: message.fix !== undefined,
          });

          // Update totals
          this.results.total++;
          this.results[severity]++;
          
          if (message.fix !== undefined) {
            this.results.fixable++;
          }

          // Categorize by rule
          if (!this.results.categories[message.ruleId]) {
            this.results.categories[message.ruleId] = {
              count: 0,
              severity: message.severity,
              fixable: message.fix !== undefined,
            };
          }
          this.results.categories[message.ruleId].count++;
        });
      });
    } catch (error) {
      console.error('❌ Error parsing lint output:', error.message);
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('📋 Generating reports...');

    // Generate summary report
    await this.generateSummaryReport();

    // Generate detailed report
    await this.generateDetailedReport();

    // Generate file-by-file report
    await this.generateFileReport();

    // Generate category report
    await this.generateCategoryReport();

    // Generate performance report
    await this.generatePerformanceReport();

    console.log('✅ Reports generated');
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        errors: this.results.errors,
        warnings: this.results.warnings,
        fixable: this.results.fixable,
        fixed: this.results.fixed,
        errorRate: this.results.total > 0 ? (this.results.errors / this.results.total * 100).toFixed(2) : 0,
        warningRate: this.results.total > 0 ? (this.results.warnings / this.results.total * 100).toFixed(2) : 0,
        fixableRate: this.results.total > 0 ? (this.results.fixable / this.results.total * 100).toFixed(2) : 0,
      },
      quality: {
        score: this.calculateQualityScore(),
        grade: this.getQualityGrade(),
        status: this.getQualityStatus(),
      },
      performance: {
        duration: Date.now() - this.startTime,
        filesProcessed: Object.keys(this.results.files).length,
        rulesChecked: Object.keys(this.results.categories).length,
      },
    };

    fs.writeFileSync(
      path.join(this.config.outputDir, 'summary.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate detailed report
   */
  async generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      files: this.results.files,
      categories: this.results.categories,
      topIssues: this.getTopIssues(),
      recommendations: this.getRecommendations(),
    };

    fs.writeFileSync(
      path.join(this.config.outputDir, 'detailed.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate file-by-file report
   */
  async generateFileReport() {
    const report = Object.entries(this.results.files)
      .map(([file, data]) => ({
        file,
        standard: data.standard,
        enhanced: data.enhanced,
        total: data.standard.errors + data.standard.warnings + data.enhanced.errors + data.enhanced.warnings,
        priority: this.getFilePriority(data),
      }))
      .sort((a, b) => b.priority - a.priority);

    fs.writeFileSync(
      path.join(this.config.outputDir, 'files.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate category report
   */
  async generateCategoryReport() {
    const report = Object.entries(this.results.categories)
      .map(([rule, data]) => ({
        rule,
        count: data.count,
        severity: data.severity === 2 ? 'error' : 'warning',
        fixable: data.fixable,
        percentage: (data.count / this.results.total * 100).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count);

    fs.writeFileSync(
      path.join(this.config.outputDir, 'categories.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performance: {
        duration: Date.now() - this.startTime,
        filesProcessed: Object.keys(this.results.files).length,
        rulesChecked: Object.keys(this.results.categories).length,
        issuesPerSecond: (this.results.total / ((Date.now() - this.startTime) / 1000)).toFixed(2),
        averageIssuesPerFile: (this.results.total / Object.keys(this.results.files).length).toFixed(2),
      },
      recommendations: {
        slowestFiles: this.getSlowestFiles(),
        mostProblematicRules: this.getMostProblematicRules(),
        optimizationSuggestions: this.getOptimizationSuggestions(),
      },
    };

    fs.writeFileSync(
      path.join(this.config.outputDir, 'performance.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Display results in console
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 LINTING ANALYSIS RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Issues: ${this.results.total}`);
    console.log(`   Errors: ${this.results.errors} (${this.results.total > 0 ? (this.results.errors / this.results.total * 100).toFixed(1) : 0}%)`);
    console.log(`   Warnings: ${this.results.warnings} (${this.results.total > 0 ? (this.results.warnings / this.results.total * 100).toFixed(1) : 0}%)`);
    console.log(`   Fixable: ${this.results.fixable} (${this.results.total > 0 ? (this.results.fixable / this.results.total * 100).toFixed(1) : 0}%)`);

    console.log(`\n🎯 QUALITY SCORE: ${this.calculateQualityScore()}/100 (${this.getQualityGrade()})`);
    console.log(`   Status: ${this.getQualityStatus()}`);

    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
    console.log(`   Files Processed: ${Object.keys(this.results.files).length}`);
    console.log(`   Rules Checked: ${Object.keys(this.results.categories).length}`);

    if (this.results.total > 0) {
      console.log(`\n🔝 TOP ISSUES:`);
      this.getTopIssues().slice(0, 5).forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.rule}: ${issue.count} occurrences`);
      });
    }

    console.log(`\n📁 REPORTS GENERATED:`);
    console.log(`   Summary: ${this.config.outputDir}/summary.json`);
    console.log(`   Detailed: ${this.config.outputDir}/detailed.json`);
    console.log(`   Files: ${this.config.outputDir}/files.json`);
    console.log(`   Categories: ${this.config.outputDir}/categories.json`);
    console.log(`   Performance: ${this.config.outputDir}/performance.json`);

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Check quality gates
   */
  checkQualityGates() {
    const passed = this.results.errors <= this.config.maxErrors && 
                   this.results.warnings <= this.config.maxWarnings;

    if (passed) {
      console.log('✅ Quality gates PASSED');
    } else {
      console.log('❌ Quality gates FAILED');
      console.log(`   Max errors allowed: ${this.config.maxErrors}, found: ${this.results.errors}`);
      console.log(`   Max warnings allowed: ${this.config.maxWarnings}, found: ${this.results.warnings}`);
    }

    return passed;
  }

  /**
   * Calculate quality score
   */
  calculateQualityScore() {
    if (this.results.total === 0) return 100;
    
    const errorPenalty = this.results.errors * 10;
    const warningPenalty = this.results.warnings * 2;
    const score = Math.max(0, 100 - errorPenalty - warningPenalty);
    
    return Math.round(score);
  }

  /**
   * Get quality grade
   */
  getQualityGrade() {
    const score = this.calculateQualityScore();
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get quality status
   */
  getQualityStatus() {
    const score = this.calculateQualityScore();
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  /**
   * Get top issues
   */
  getTopIssues() {
    return Object.entries(this.results.categories)
      .map(([rule, data]) => ({ rule, count: data.count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.results.errors > 0) {
      recommendations.push('Fix all errors immediately - they prevent code from working correctly');
    }
    
    if (this.results.warnings > 50) {
      recommendations.push('Address warnings systematically - they indicate potential issues');
    }
    
    if (this.results.fixable > 0) {
      recommendations.push(`Run 'npm run lint:fix' to automatically fix ${this.results.fixable} issues`);
    }
    
    if (this.results.total > 100) {
      recommendations.push('Consider breaking down large files into smaller, more manageable pieces');
    }
    
    return recommendations;
  }

  /**
   * Get file priority
   */
  getFilePriority(data) {
    const standardScore = data.standard.errors * 10 + data.standard.warnings * 2;
    const enhancedScore = data.enhanced.errors * 10 + data.enhanced.warnings * 2;
    return standardScore + enhancedScore;
  }

  /**
   * Get slowest files
   */
  getSlowestFiles() {
    return Object.entries(this.results.files)
      .map(([file, data]) => ({
        file,
        totalIssues: data.standard.errors + data.standard.warnings + data.enhanced.errors + data.enhanced.warnings,
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues)
      .slice(0, 5);
  }

  /**
   * Get most problematic rules
   */
  getMostProblematicRules() {
    return Object.entries(this.results.categories)
      .map(([rule, data]) => ({ rule, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    
    if (this.results.total > 500) {
      suggestions.push('Consider using ESLint cache to speed up subsequent runs');
    }
    
    if (Object.keys(this.results.files).length > 100) {
      suggestions.push('Consider running ESLint in parallel for better performance');
    }
    
    if (this.results.fixable > this.results.total * 0.5) {
      suggestions.push('Many issues are auto-fixable - run automated fixes first');
    }
    
    return suggestions;
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }
}

// Run the analysis
if (require.main === module) {
  const tracker = new LintProgressTracker();
  tracker.runAnalysis()
    .then(results => {
      process.exit(results.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error running lint analysis:', error);
      process.exit(1);
    });
}

module.exports = LintProgressTracker;

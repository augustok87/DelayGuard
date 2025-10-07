#!/usr/bin/env node

/**
 * Documentation Validation Script for DelayGuard
 * 
 * This script validates the completeness and quality of documentation
 * for the DelayGuard project.
 * 
 * @author DelayGuard Development Team
 * @version 1.0.0
 * @since 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validating DelayGuard Documentation...\n');

// Documentation validation results
const validationResults = {
  jsdoc: { status: 'pending', issues: [] },
  api: { status: 'pending', issues: [] },
  coverage: { status: 'pending', issues: [] },
  quality: { status: 'pending', issues: [] }
};

// Check if documentation files exist
function checkDocumentationFiles() {
  const requiredFiles = [
    'jsdoc.conf.json',
    'swagger-config.js',
    'scripts/generate-docs.js',
    'DEVELOPER_DOCUMENTATION.md'
  ];

  const missingFiles = requiredFiles.filter(file => {
    const filePath = path.join(__dirname, '..', file);
    return !fs.existsSync(filePath);
  });

  if (missingFiles.length > 0) {
    console.log('❌ Missing documentation files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }

  console.log('✅ All required documentation files present');
  return true;
}

// Validate JSDoc configuration
function validateJSDocConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'jsdoc.conf.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const requiredFields = ['source', 'opts', 'plugins'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      validationResults.jsdoc.issues.push(`Missing JSDoc config fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log('✅ JSDoc configuration is valid');
    validationResults.jsdoc.status = 'passed';
    return true;
  } catch (error) {
    validationResults.jsdoc.issues.push(`JSDoc config error: ${error.message}`);
    console.log('❌ JSDoc configuration error:', error.message);
    return false;
  }
}

// Validate Swagger configuration
function validateSwaggerConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'swagger-config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for required OpenAPI fields
    const requiredFields = ['openapi', 'info', 'servers', 'components'];
    const missingFields = requiredFields.filter(field => !configContent.includes(field));
    
    if (missingFields.length > 0) {
      validationResults.api.issues.push(`Missing Swagger config fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log('✅ Swagger configuration is valid');
    validationResults.api.status = 'passed';
    return true;
  } catch (error) {
    validationResults.api.issues.push(`Swagger config error: ${error.message}`);
    console.log('❌ Swagger configuration error:', error.message);
    return false;
  }
}

// Check documentation coverage
function checkDocumentationCoverage() {
  const srcDir = path.join(__dirname, '..', 'src');
  const serviceFiles = [];
  const routeFiles = [];
  
  // Find service files
  function findFiles(dir, pattern, files) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findFiles(fullPath, pattern, files);
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }
  
  findFiles(srcDir, /service.*\.ts$/, serviceFiles);
  findFiles(srcDir, /route.*\.ts$/, routeFiles);
  
  let documentedServices = 0;
  let documentedRoutes = 0;
  
  // Check service documentation
  serviceFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('/**') && content.includes('@class')) {
      documentedServices++;
    }
  });
  
  // Check route documentation
  routeFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('@swagger') || content.includes('/**')) {
      documentedRoutes++;
    }
  });
  
  const serviceCoverage = (documentedServices / serviceFiles.length) * 100;
  const routeCoverage = (documentedRoutes / routeFiles.length) * 100;
  
  console.log(`📊 Service Documentation Coverage: ${serviceCoverage.toFixed(1)}% (${documentedServices}/${serviceFiles.length})`);
  console.log(`📊 Route Documentation Coverage: ${routeCoverage.toFixed(1)}% (${documentedRoutes}/${routeFiles.length})`);
  
  if (serviceCoverage < 80) {
    validationResults.coverage.issues.push(`Service documentation coverage too low: ${serviceCoverage.toFixed(1)}%`);
  }
  
  if (routeCoverage < 80) {
    validationResults.coverage.issues.push(`Route documentation coverage too low: ${routeCoverage.toFixed(1)}%`);
  }
  
  if (serviceCoverage >= 80 && routeCoverage >= 80) {
    console.log('✅ Documentation coverage meets standards');
    validationResults.coverage.status = 'passed';
    return true;
  } else {
    validationResults.coverage.status = 'failed';
    return false;
  }
}

// Validate documentation quality
function validateDocumentationQuality() {
  const qualityChecks = [];
  
  // Check for JSDoc examples
  const srcDir = path.join(__dirname, '..', 'src');
  function checkFilesForPattern(dir, pattern, description) {
    const files = [];
    findFiles(dir, /\.ts$/, files);
    
    let foundCount = 0;
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        foundCount++;
      }
    });
    
    const percentage = (foundCount / files.length) * 100;
    console.log(`📝 ${description}: ${percentage.toFixed(1)}% (${foundCount}/${files.length})`);
    
    if (percentage < 50) {
      qualityChecks.push(`${description} coverage too low: ${percentage.toFixed(1)}%`);
    }
  }
  
  function findFiles(dir, pattern, files) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findFiles(fullPath, pattern, files);
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }
  
  checkFilesForPattern(srcDir, /@example/, 'JSDoc Examples');
  checkFilesForPattern(srcDir, /@param/, 'Parameter Documentation');
  checkFilesForPattern(srcDir, /@returns/, 'Return Value Documentation');
  checkFilesForPattern(srcDir, /@throws/, 'Error Documentation');
  
  if (qualityChecks.length > 0) {
    validationResults.quality.issues = qualityChecks;
    validationResults.quality.status = 'failed';
    return false;
  } else {
    console.log('✅ Documentation quality meets standards');
    validationResults.quality.status = 'passed';
    return true;
  }
}

// Generate validation report
function generateReport() {
  console.log('\n📋 Documentation Validation Report');
  console.log('=====================================');
  
  const categories = ['jsdoc', 'api', 'coverage', 'quality'];
  let passedCount = 0;
  
  categories.forEach(category => {
    const result = validationResults[category];
    const status = result.status === 'passed' ? '✅' : '❌';
    console.log(`${status} ${category.toUpperCase()}: ${result.status}`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (result.status === 'passed') {
      passedCount++;
    }
  });
  
  console.log(`\n📊 Overall Score: ${passedCount}/${categories.length} categories passed`);
  
  if (passedCount === categories.length) {
    console.log('🎉 All documentation validation checks passed!');
    console.log('✅ Documentation meets world-class standards');
    return true;
  } else {
    console.log('⚠️  Some documentation validation checks failed');
    console.log('📝 Please address the issues above to improve documentation quality');
    return false;
  }
}

// Main validation function
function runValidation() {
  console.log('🔍 Starting documentation validation...\n');
  
  // Run all validation checks
  const checks = [
    checkDocumentationFiles(),
    validateJSDocConfig(),
    validateSwaggerConfig(),
    checkDocumentationCoverage(),
    validateDocumentationQuality()
  ];
  
  const allPassed = checks.every(check => check);
  
  // Generate final report
  const reportPassed = generateReport();
  
  if (allPassed && reportPassed) {
    console.log('\n🎉 Documentation validation completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Documentation validation found issues that need attention.');
    process.exit(1);
  }
}

// Run validation
runValidation();

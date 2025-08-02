#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build...');

// Set build date
process.env.BUILD_DATE = new Date().toISOString();

// Clean previous build
console.log('🧹 Cleaning previous build...');
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true, force: true });
}

// Run build with optimizations
console.log('📦 Building application...');
try {
  execSync('npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      GENERATE_SOURCEMAP: 'false',
      INLINE_RUNTIME_CHUNK: 'false'
    }
  });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Analyze bundle size
console.log('📊 Analyzing bundle size...');
try {
  execSync('npx webpack-bundle-analyzer build/static/js/*.js --mode static --report build/bundle-report.html --no-open', {
    stdio: 'inherit'
  });
  console.log('📈 Bundle analysis saved to build/bundle-report.html');
} catch (error) {
  console.warn('⚠️ Bundle analysis failed (optional):', error.message);
}

// Generate build info
const buildInfo = {
  version: process.env.npm_package_version || '1.0.0',
  buildDate: process.env.BUILD_DATE,
  nodeVersion: process.version,
  environment: 'production'
};

fs.writeFileSync(
  path.join('build', 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log('✅ Production build completed successfully!');
console.log(`📁 Build output: ${path.resolve('build')}`);
console.log(`📋 Build info: ${JSON.stringify(buildInfo, null, 2)}`);

// Display build size summary
const buildDir = path.join(__dirname, '..', 'build');
const staticDir = path.join(buildDir, 'static');

if (fs.existsSync(staticDir)) {
  const jsDir = path.join(staticDir, 'js');
  const cssDir = path.join(staticDir, 'css');
  
  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;
  
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(file => {
      const filePath = path.join(jsDir, file);
      const stats = fs.statSync(filePath);
      jsSize += stats.size;
      totalSize += stats.size;
    });
  }
  
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir).forEach(file => {
      const filePath = path.join(cssDir, file);
      const stats = fs.statSync(filePath);
      cssSize += stats.size;
      totalSize += stats.size;
    });
  }
  
  console.log('\n📊 Build Size Summary:');
  console.log(`   JavaScript: ${(jsSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   CSS: ${(cssSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Warn if bundle is too large
  if (jsSize > 2 * 1024 * 1024) { // 2MB
    console.warn('⚠️  JavaScript bundle is larger than 2MB. Consider code splitting.');
  }
}
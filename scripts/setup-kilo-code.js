#!/usr/bin/env node

/**
 * Kilo Code Setup Script
 * Initializes the project for enhanced agentic development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class KiloCodeSetup {
  constructor() {
    this.projectRoot = process.cwd();
  }

  async setup() {
    console.log('🚀 Setting up Kilo Code Enhanced Development Environment...\n');

    try {
      // 1. Check prerequisites
      await this.checkPrerequisites();

      // 2. Install dependencies
      await this.installDependencies();

      // 3. Create directory structure
      this.createDirectoryStructure();

      // 4. Setup VSCode extensions
      this.setupVSCodeExtensions();

      // 5. Create TypeScript config enhancements
      this.enhanceTypeScriptConfig();

      // 6. Setup testing framework
      this.setupTestingFramework();

      // 7. Create Git hooks for code quality
      this.setupGitHooks();

      // 8. Generate initial analysis
      await this.generateInitialAnalysis();

      console.log('✅ Kilo Code setup complete!\n');
      this.printNextSteps();

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('📋 Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error('Node.js 18 or higher is required');
    }
    
    console.log(`✅ Node.js ${nodeVersion} detected`);

    // Check npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`✅ npm ${npmVersion} detected`);
    } catch (error) {
      throw new Error('npm is required but not found');
    }

    // Check if package.json exists
    if (!fs.existsSync(path.join(this.projectRoot, 'package.json'))) {
      throw new Error('package.json not found. Please run this script from the project root.');
    }

    console.log('✅ Prerequisites check passed\n');
  }

  async installDependencies() {
    console.log('📦 Installing enhanced dependencies...');

    const enhancedDeps = [
      'vitest@^3.0.0',
      '@vitest/ui@^3.0.0', 
      '@vitest/coverage-v8@^3.0.0',
      'typedoc@^0.26.0',
      'jsdoc@^4.0.3'
    ];

    try {
      execSync(`npm install --save-dev ${enhancedDeps.join(' ')}`, {
        stdio: 'inherit',
        cwd: this.projectRoot
      });
      console.log('✅ Enhanced dependencies installed\n');
    } catch (error) {
      console.warn('⚠️ Some dependencies failed to install, continuing setup...\n');
    }
  }

  createDirectoryStructure() {
    console.log('📁 Creating enhanced directory structure...');

    const directories = [
      'tests',
      'tests/components',
      'tests/integration', 
      'tests/e2e',
      'docs/generated',
      'scripts',
      '.kilo-code',
      'coverage'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created ${dir}/`);
      }
    });

    console.log('✅ Directory structure created\n');
  }

  setupVSCodeExtensions() {
    console.log('🔧 Setting up VSCode extensions...');

    const extensionsDir = path.join(this.projectRoot, '.vscode');
    const extensionsJson = path.join(extensionsDir, 'extensions.json');

    const extensions = {
      recommendations: [
        'ms-vscode.vscode-typescript-next',
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint',
        'bradlc.vscode-tailwindcss',
        'ms-vscode.vitest',
        'humao.rest-client',
        'ms-vscode.vscode-json',
        'ms-python.python',
        'ms-vscode.vscode-npm-script'
      ]
    };

    if (!fs.existsSync(extensionsDir)) {
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    fs.writeFileSync(extensionsJson, JSON.stringify(extensions, null, 2));
    console.log('✅ VSCode extensions configured\n');
  }

  enhanceTypeScriptConfig() {
    console.log('🔧 Enhancing TypeScript configuration...');

    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    
    if (fs.existsSync(tsConfigPath)) {
      const config = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      
      // Add enhanced options
      config.compilerOptions = {
        ...config.compilerOptions,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        exactOptionalPropertyTypes: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noImplicitOverride: true,
        allowUnusedLabels: false,
        allowUnreachableCode: false
      };

      config.include = [
        ...(config.include || []),
        'tests/**/*',
        'scripts/**/*'
      ];

      fs.writeFileSync(tsConfigPath, JSON.stringify(config, null, 2));
      console.log('✅ TypeScript configuration enhanced\n');
    } else {
      console.warn('⚠️ tsconfig.json not found, skipping enhancement\n');
    }
  }

  setupTestingFramework() {
    console.log('🧪 Setting up testing framework...');

    const vitestConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'coverage/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});`;

    const vitestConfigPath = path.join(this.projectRoot, 'vitest.config.ts');
    fs.writeFileSync(vitestConfigPath, vitestConfig);

    // Create test setup file
    const setupContent = `import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
`;

    const setupPath = path.join(this.projectRoot, 'tests', 'setup.ts');
    fs.writeFileSync(setupPath, setupContent);

    console.log('✅ Testing framework configured\n');
  }

  setupGitHooks() {
    console.log('🔗 Setting up Git hooks...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    
    if (fs.existsSync(path.join(this.projectRoot, '.git'))) {
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // Pre-commit hook
      const preCommitHook = `#!/bin/sh
# Kilo Code pre-commit hook

echo "🔍 Running Kilo Code pre-commit checks..."

# Run type check
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed"
  exit 1
fi

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed"
  exit 1
fi

# Run tests
npm test -- --run
if [ $? -ne 0 ]; then
  echo "❌ Tests failed"
  exit 1
fi

echo "✅ All checks passed!"
`;

      fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook);
      
      // Make executable on Unix systems
      try {
        execSync('chmod +x .git/hooks/pre-commit', { cwd: this.projectRoot });
      } catch (error) {
        // Windows doesn't need chmod
      }

      console.log('✅ Git hooks configured\n');
    } else {
      console.warn('⚠️ .git directory not found, skipping Git hooks setup\n');
    }
  }

  async generateInitialAnalysis() {
    console.log('📊 Generating initial codebase analysis...');

    try {
      const { KiloCodeTools } = require('./kilo-code-tools.js');
      const tools = new KiloCodeTools();
      
      tools.analyzeCodebase();
      console.log('✅ Initial analysis generated\n');
    } catch (error) {
      console.warn('⚠️ Could not generate initial analysis:', error.message, '\n');
    }
  }

  printNextSteps() {
    console.log(`
🎉 Kilo Code setup completed successfully!

Next steps:
1. 📖 Read the documentation: docs/KILO-CODE-SETUP.md
2. 🔍 Run initial analysis: npm run kilo-code:analyze
3. 🧪 Generate tests: npm run kilo-code:test  
4. 📚 Generate documentation: npm run docs:generate
5. 🏃 Start development: npm run dev

Available commands:
- npm run kilo-code:analyze    - Analyze codebase
- npm run kilo-code:test       - Generate test cases  
- npm run kilo-code:refactor   - Get refactoring suggestions
- npm run type-check          - TypeScript type checking
- npm run test                - Run tests with UI
- npm run test:coverage       - Run tests with coverage

VSCode Extensions installed:
- TypeScript support
- ESLint & Prettier
- Tailwind CSS
- Vitest test runner
- And more...

Happy coding with Kilo Code! 🚀
`);
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new KiloCodeSetup();
  setup.setup().catch(console.error);
}

module.exports = KiloCodeSetup;
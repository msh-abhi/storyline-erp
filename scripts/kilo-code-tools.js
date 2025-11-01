#!/usr/bin/env node

/**
 * Kilo Code Enhanced Tools Script
 * Provides comprehensive code analysis and agentic development capabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class KiloCodeTools {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || './project';
    this.analysisResults = new Map();
  }

  /**
   * Analyze the entire codebase for dependencies and patterns
   */
  analyzeCodebase() {
    console.log('🔍 Analyzing codebase for Kilo Code enhancement...');
    
    const results = {
      components: this.findComponents(),
      dependencies: this.analyzeDependencies(),
      complexity: this.analyzeComplexity(),
      patterns: this.findPatterns(),
      suggestions: this.generateSuggestions()
    };

    this.analysisResults.set('full_analysis', results);
    this.saveAnalysis('full_analysis', results);
    
    console.log('✅ Analysis complete!');
    return results;
  }

  /**
   * Find all React components and their dependencies
   */
  findComponents() {
    const componentsDir = path.join(this.projectRoot, 'src', 'components');
    const components = [];

    if (fs.existsSync(componentsDir)) {
      const files = this.getAllFiles(componentsDir, '.tsx');
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const componentName = path.basename(file, '.tsx');
        const imports = this.extractImports(content);
        const exports = this.extractExports(content);
        
        components.push({
          name: componentName,
          path: path.relative(this.projectRoot, file),
          imports,
          exports,
          lines: content.split('\n').length,
          hasHooks: this.hasHooks(content),
          hasProps: this.hasProps(content),
          hasState: this.hasState(content)
        });
      });
    }

    return components;
  }

  /**
   * Analyze project dependencies and their usage
   */
  analyzeDependencies() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const analysis = {
      dependencies: {},
      unused: [],
      missing: [],
      usage: new Map()
    };

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Check usage of each dependency
      Object.keys(allDeps).forEach(dep => {
        const usage = this.findDependencyUsage(dep);
        analysis.usage.set(dep, usage);
        
        if (usage.length === 0) {
          analysis.unused.push(dep);
        }
        
        analysis.dependencies[dep] = {
          version: allDeps[dep],
          usage: usage.length,
          files: usage
        };
      });
    }

    return analysis;
  }

  /**
   * Analyze code complexity patterns
   */
  analyzeComplexity() {
    const complexity = {
      highComplexity: [],
      potentialIssues: [],
      refactoringOpportunities: []
    };

    const allTsFiles = this.getAllFiles(this.projectRoot, '.ts');
    const allTsxFiles = this.getAllFiles(this.projectRoot, '.tsx');

    [...allTsFiles, ...allTsxFiles].forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.projectRoot, file);
        
        // Check for complexity indicators
        const lines = content.split('\n');
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
        const fileComplexity = {
          file: relativePath,
          lines: lines.length,
          cyclomaticComplexity,
          functions: this.countFunctions(content),
          components: this.countComponents(content)
        };

        if (cyclomaticComplexity > 10) {
          complexity.highComplexity.push(fileComplexity);
        }

        // Check for common issues
        if (lines.length > 200) {
          complexity.potentialIssues.push({
            file: relativePath,
            issue: 'File too large',
            lines: lines.length,
            suggestion: 'Consider breaking into smaller files'
          });
        }

        if (content.includes('any') || content.includes(': any')) {
          complexity.potentialIssues.push({
            file: relativePath,
            issue: 'TypeScript any usage',
            suggestion: 'Consider adding proper types'
          });
        }

      } catch (error) {
        console.warn(`Error analyzing ${file}: ${error.message}`);
      }
    });

    return complexity;
  }

  /**
   * Find common code patterns
   */
  findPatterns() {
    const patterns = {
      react: [],
      typescript: [],
      common: []
    };

    const allTsxFiles = this.getAllFiles(this.projectRoot, '.tsx');
    
    allTsxFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.projectRoot, file);

        // React patterns
        if (content.includes('useState') || content.includes('useEffect')) {
          patterns.react.push({
            pattern: 'Hooks usage',
            file: relativePath,
            hooks: this.extractHooks(content)
          });
        }

        if (content.includes('React.FC') || content.includes('FunctionComponent')) {
          patterns.react.push({
            pattern: 'FC typing',
            file: relativePath
          });
        }

        // TypeScript patterns
        if (content.includes('interface') || content.includes('type ')) {
          patterns.typescript.push({
            pattern: 'Custom types',
            file: relativePath
          });
        }

      } catch (error) {
        console.warn(`Error analyzing patterns in ${file}: ${error.message}`);
      }
    });

    return patterns;
  }

  /**
   * Generate improvement suggestions
   */
  generateSuggestions() {
    const suggestions = [];
    
    const analysis = this.analysisResults.get('full_analysis');
    if (!analysis) return suggestions;

    // Component suggestions
    if (analysis.components) {
      analysis.components.forEach(comp => {
        if (!comp.hasProps && comp.name !== 'ErrorBoundary') {
          suggestions.push({
            type: 'component',
            priority: 'low',
            message: `${comp.name} might benefit from Props interface`,
            file: comp.path
          });
        }

        if (comp.lines > 100) {
          suggestions.push({
            type: 'component',
            priority: 'medium',
            message: `${comp.name} is quite large (${comp.lines} lines)`,
            file: comp.path,
            suggestion: 'Consider breaking into smaller components'
          });
        }
      });
    }

    // Dependency suggestions
    if (analysis.dependencies && analysis.dependencies.unused) {
      analysis.dependencies.unused.forEach(dep => {
        suggestions.push({
          type: 'dependency',
          priority: 'medium',
          message: `Unused dependency: ${dep}`,
          suggestion: 'Consider removing to reduce bundle size'
        });
      });
    }

    return suggestions;
  }

  /**
   * Generate test cases for components
   */
  generateTestCases() {
    console.log('🧪 Generating test cases...');
    
    const components = this.findComponents();
    const testFiles = [];

    components.forEach(comp => {
      if (!comp.name.includes('Test') && comp.name !== 'ErrorBoundary') {
        const testContent = this.generateTestFile(comp);
        const testPath = path.join(this.projectRoot, 'tests', `${comp.name}.test.tsx`);
        
        // Create tests directory if it doesn't exist
        const testsDir = path.dirname(testPath);
        if (!fs.existsSync(testsDir)) {
          fs.mkdirSync(testsDir, { recursive: true });
        }
        
        fs.writeFileSync(testPath, testContent);
        testFiles.push(testPath);
      }
    });

    console.log(`✅ Generated ${testFiles.length} test files`);
    return testFiles;
  }

  // Helper methods
  getAllFiles(dir, extension) {
    const files = [];
    
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.getAllFiles(fullPath, extension));
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      });
    }
    
    return files;
  }

  extractImports(content) {
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g;
    const exports = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  hasHooks(content) {
    return /(useState|useEffect|useContext|useReducer|useCallback|useMemo)/.test(content);
  }

  hasProps(content) {
    return /(props\s*:\s*\w+|interface.*Props|{.*})/.test(content);
  }

  hasState(content) {
    return /useState/.test(content);
  }

  extractHooks(content) {
    const hookRegex = /use(\w+)/g;
    const hooks = [];
    let match;
    
    while ((match = hookRegex.exec(content)) !== null) {
      hooks.push(match[0]);
    }
    
    return hooks;
  }

  findDependencyUsage(dependency) {
    const usage = [];
    const allFiles = [
      ...this.getAllFiles(path.join(this.projectRoot, 'src'), '.ts'),
      ...this.getAllFiles(path.join(this.projectRoot, 'src'), '.tsx'),
      ...this.getAllFiles(path.join(this.projectRoot, 'src'), '.js')
    ];

    allFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(`'${dependency}'`) || 
            content.includes(`"${dependency}"`) ||
            content.includes(`from '${dependency}'`) ||
            content.includes(`from "${dependency}"`)) {
          usage.push(path.relative(this.projectRoot, file));
        }
      } catch (error) {
        // Ignore file read errors
      }
    });

    return usage;
  }

  calculateCyclomaticComplexity(content) {
    // Simple cyclomatic complexity calculation
    const complexityKeywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 
      'case', 'catch', '&&', '||', '?', 'case'
    ];
    
    let complexity = 1; // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  countFunctions(content) {
    const functionRegex = /function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{|=>\s*\w/g;
    const matches = content.match(functionRegex);
    return matches ? matches.length : 0;
  }

  countComponents(content) {
    const componentRegex = /const\s+\w+\s*=\s*\(\s*\)\s*=>/g;
    const matches = content.match(componentRegex);
    return matches ? matches.length : 0;
  }

  generateTestFile(component) {
    return `import { render, screen } from '@testing-library/react';
import { ${component.name} } from '../src/components/${component.name}';

describe('${component.name}', () => {
  it('should render correctly', () => {
    render(<${component.name} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  // TODO: Add more specific tests based on component functionality
});
`;
  }

  saveAnalysis(type, data) {
    const analysisDir = path.join(this.projectRoot, '.kilo-code');
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
    }
    
    const filePath = path.join(analysisDir, `${type}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

// CLI Interface
if (require.main === module) {
  const tools = new KiloCodeTools();
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      tools.analyzeCodebase();
      break;
    case 'test':
      tools.generateTestCases();
      break;
    case 'refactor':
      console.log('🔧 Refactoring suggestions...');
      const analysis = tools.analyzeCodebase();
      console.log('Suggestions:', analysis.suggestions);
      break;
    default:
      console.log(`
Kilo Code Enhanced Tools

Usage:
  node kilo-code-tools.js analyze    - Analyze codebase
  node kilo-code-tools.js test       - Generate test cases
  node kilo-code-tools.js refactor   - Get refactoring suggestions
      `);
  }
}

module.exports = KiloCodeTools;
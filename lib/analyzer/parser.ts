import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';

export interface ExtractedDependency {
  specifier: string;
  type: 'IMPORTS' | 'REQUIRES' | 'DYNAMIC_IMPORTS' | 'RE_EXPORTS';
  line: number;
  column: number;
  isDynamic: boolean;
  isUnresolvedDynamicExpression?: boolean;
}

export function parseJavaScriptAST(code: string, filepath: string): {
  dependencies: ExtractedDependency[];
  warnings: string[];
} {
  const dependencies: ExtractedDependency[] = [];
  const warnings: string[] = [];

  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        'jsx',
        'dynamicImport',
        'importMeta',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'nullishCoalescingOperator',
        'optionalChaining',
        'topLevelAwait',
      ],
      errorRecovery: true,
    });
  } catch (err: any) {
    warnings.push(`AST parse error in ${filepath}: ${err.message}`);
    return { dependencies, warnings };
  }

  try {
    traverse(ast, {
      ImportDeclaration(path) {
        const specifier = path.node.source.value;
        const loc = path.node.loc?.start || { line: 1, column: 0 };
        dependencies.push({
          specifier,
          type: 'IMPORTS',
          line: loc.line,
          column: loc.column,
          isDynamic: false,
        });
      },

      ExportNamedDeclaration(path) {
        if (path.node.source) {
          const specifier = path.node.source.value;
          const loc = path.node.loc?.start || { line: 1, column: 0 };
          dependencies.push({
            specifier,
            type: 'RE_EXPORTS',
            line: loc.line,
            column: loc.column,
            isDynamic: false,
          });
        }
      },
      ExportAllDeclaration(path) {
        const specifier = path.node.source.value;
        const loc = path.node.loc?.start || { line: 1, column: 0 };
        dependencies.push({
          specifier,
          type: 'RE_EXPORTS',
          line: loc.line,
          column: loc.column,
          isDynamic: false,
        });
      },

      Import(path) {
        const parentCall = path.parentPath;
        if (parentCall.isCallExpression()) {
          const arg = parentCall.node.arguments[0];
          const loc = parentCall.node.loc?.start || { line: 1, column: 0 };
          if (arg && arg.type === 'StringLiteral') {
            dependencies.push({
              specifier: arg.value,
              type: 'DYNAMIC_IMPORTS',
              line: loc.line,
              column: loc.column,
              isDynamic: true,
            });
          } else {
            dependencies.push({
              specifier: '<dynamic_expression>',
              type: 'DYNAMIC_IMPORTS',
              line: loc.line,
              column: loc.column,
              isDynamic: true,
              isUnresolvedDynamicExpression: true,
            });
            warnings.push(`Non-static dynamic import expression at line ${loc.line} in ${filepath}`);
          }
        }
      },

      CallExpression(path) {
        const callee = path.node.callee;
        if (callee.type === 'Identifier' && callee.name === 'require') {
          const arg = path.node.arguments[0];
          const loc = path.node.loc?.start || { line: 1, column: 0 };
          if (arg && arg.type === 'StringLiteral') {
            dependencies.push({
              specifier: arg.value,
              type: 'REQUIRES',
              line: loc.line,
              column: loc.column,
              isDynamic: false,
            });
          } else if (arg) {
            dependencies.push({
              specifier: '<dynamic_require>',
              type: 'REQUIRES',
              line: loc.line,
              column: loc.column,
              isDynamic: true,
              isUnresolvedDynamicExpression: true,
            });
            warnings.push(`Non-static require expression at line ${loc.line} in ${filepath}`);
          }
        }
      },
    });
  } catch (err: any) {
    warnings.push(`AST traverse warning in ${filepath}: ${err.message}`);
  }

  return { dependencies, warnings };
}

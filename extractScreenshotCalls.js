const fs = require('fs');
const path = require('path');
const esprima = require('esprima');

// Get the current directory of the script
const rootDirectory = __dirname;

// Function to recursively traverse the directory and find JavaScript files with the specified suffix
function findJavaScriptFiles(directory, suffix) {
  const files = fs.readdirSync(directory);
  let jsFiles = [];

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      jsFiles = jsFiles.concat(findJavaScriptFiles(filePath, suffix));
    } else if (file.endsWith(suffix)) {
      jsFiles.push(filePath);
    }
  });

  return jsFiles;
}

// Function to extract calls to 'happoScreenshot' from a JavaScript file
function extractHappoScreenshots(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ast = esprima.parseScript(content, { tolerant: true, loc: true });

  const screenshots = [];

  // Traverse the AST to find function calls with 'happoScreenshot'
  function traverse(node) {
    if (
      node.type === 'CallExpression' &&
      node.callee.property &&
      node.callee.property.name === 'happoScreenshot'
    ) {
      const firstArgument = node.arguments[0];

      if (firstArgument && firstArgument.type === 'ObjectExpression') {
        const componentProperty = firstArgument.properties.find(
          (prop) => prop.key.name === 'component',
        );
        const variantProperty = firstArgument.properties.find(
          (prop) => prop.key.name === 'variant',
        );
        const targetsProperty = firstArgument.properties.find(
          (prop) => prop.key.name === 'targets',
        );

        const component = componentProperty
          ? componentProperty.value.value
          : undefined;
        const variant = variantProperty ? variantProperty.value.value : undefined;

        let targets;
        if (targetsProperty) {
          if (targetsProperty.value.type === 'ArrayExpression') {
            targets = targetsProperty.value.elements.map((element) => {
              if (element.type === 'Literal') {
                return element.value;
              } else if (element.type === 'ObjectExpression') {
                const nameProperty = element.properties.find(
                  (prop) => prop.key.name === 'name',
                );
                return nameProperty ? nameProperty.value.value : undefined;
              }
            });
          }
        }

        screenshots.push({ filePath, loc: node.loc, component, variant, targets });
      }
    }

    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        traverse(node[key]);
      }
    }
  }

  traverse(ast);

  return screenshots;
}

// Main script
const jsFiles = findJavaScriptFiles(rootDirectory, '_spec.js');
const allScreenshots = [];

jsFiles.forEach((file) => {
  const screenshots = extractHappoScreenshots(file);
  allScreenshots.push(...screenshots);
});

// Output the results
allScreenshots.forEach((screenshot) => {
  console.log(`File: ${screenshot.filePath}`);
  console.log(
    `Location: Line ${screenshot.loc.start.line}:${screenshot.loc.start.column}`,
  );
  console.log(`Component: ${screenshot.component}`);
  console.log(`Variant: ${screenshot.variant}`);
  console.log(
    `Targets: ${screenshot.targets ? JSON.stringify(screenshot.targets) : 'undefined'}`,
  );
  console.log('\n');
});

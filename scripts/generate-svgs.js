#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Try to require js-yaml from website/node_modules when run from website/
let yaml;
try {
  yaml = require('js-yaml');
} catch (error) {
  // If not found, try from website/node_modules (when run from root)
  const yamlPath = path.join(__dirname, '..', 'website', 'node_modules', 'js-yaml');
  yaml = require(yamlPath);
}

/**
 * Recursively find all layout.yaml files in keyboards/ directory
 */
function findLayoutYamls(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findLayoutYamls(fullPath));
    } else if (entry.name === 'layout.yaml' || entry.name === 'keymap.yaml') {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extract keyboard/keymap identifier from path
 * Example: keyboards/ferris/sweep/keymaps/qwerty/layout.yaml
 * Returns: ferris-sweep-qwerty
 */
function extractKeymapId(layoutPath) {
  const parts = layoutPath.split(path.sep);
  const keyboardsIdx = parts.indexOf('keyboards');

  if (keyboardsIdx === -1) {
    throw new Error(`Invalid path: ${layoutPath} (no 'keyboards' directory found)`);
  }

  // Find 'keymaps' directory
  const keymapsIdx = parts.indexOf('keymaps');
  if (keymapsIdx === -1) {
    throw new Error(`Invalid path: ${layoutPath} (no 'keymaps' directory found)`);
  }

  // Extract keyboard parts (between keyboards/ and keymaps/)
  const keyboardParts = parts.slice(keyboardsIdx + 1, keymapsIdx);

  // Extract keymap name
  const keymapName = parts[keymapsIdx + 1];

  // Create ID: keyboard-keymap
  return [...keyboardParts, keymapName].join('-');
}

/**
 * Extract layer names from layout.yaml
 */
function getLayerNames(layoutPath) {
  try {
    const fileContents = fs.readFileSync(layoutPath, 'utf8');
    const data = yaml.load(fileContents);

    if (!data.layers) {
      return [];
    }

    return Object.keys(data.layers);
  } catch (error) {
    console.error(`Error parsing ${layoutPath}: ${error.message}`);
    return [];
  }
}

/**
 * Generate SVGs for a layout.yaml file using keymap-drawer
 */
function generateSvgs(layoutPath, outputDir) {
  const keymapId = extractKeymapId(layoutPath);
  const svgOutputDir = path.join(outputDir, keymapId);

  // Create output directory
  if (!fs.existsSync(svgOutputDir)) {
    fs.mkdirSync(svgOutputDir, { recursive: true });
  }

  console.log(`Generating SVGs for: ${keymapId}`);
  console.log(`  Input:  ${layoutPath}`);
  console.log(`  Output: ${svgOutputDir}`);

  // Get layer names from layout.yaml
  const layerNames = getLayerNames(layoutPath);

  if (layerNames.length === 0) {
    console.error(`  ✗ No layers found in ${layoutPath}\n`);
    throw new Error('No layers found');
  }

  console.log(`  Layers: ${layerNames.join(', ')}`);

  // Generate SVG for each layer
  let generatedCount = 0;
  for (const layerName of layerNames) {
    const outputFile = path.join(svgOutputDir, `${layerName.toLowerCase()}.svg`);

    try {
      // Run keymap draw command for this layer
      const cmd = `keymap draw "${layoutPath}" -s ${layerName} -o "${outputFile}"`;
      execSync(cmd, { stdio: 'pipe' });
      generatedCount++;
    } catch (error) {
      console.error(`  ✗ Error generating ${layerName}: ${error.message}`);
      throw error;
    }
  }

  console.log(`  ✓ Generated ${generatedCount} SVG(s) successfully\n`);
}

/**
 * Main function
 */
function main() {
  const rootDir = path.join(__dirname, '..');
  const keyboardsDir = path.join(rootDir, 'keyboards');
  const outputDir = path.join(rootDir, 'website', 'public', 'generated');

  console.log('=== Keymap SVG Generator ===\n');

  // Check if keymap is installed (from keymap-drawer package)
  try {
    execSync('keymap --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('ERROR: keymap (from keymap-drawer) is not installed!');
    console.error('Install it with: pip install keymap-drawer');
    console.error('Or with pipx: pipx install keymap-drawer\n');
    process.exit(1);
  }

  // Find all layout.yaml files
  console.log(`Searching for layout.yaml files in: ${keyboardsDir}\n`);
  const layoutFiles = findLayoutYamls(keyboardsDir);

  if (layoutFiles.length === 0) {
    console.log('No layout.yaml files found.');
    return;
  }

  console.log(`Found ${layoutFiles.length} layout file(s):\n`);

  // Generate SVGs for each layout
  let successCount = 0;
  let errorCount = 0;

  for (const layoutPath of layoutFiles) {
    try {
      generateSvgs(layoutPath, outputDir);
      successCount++;
    } catch (error) {
      errorCount++;
    }
  }

  console.log('=== Summary ===');
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors:  ${errorCount}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { findLayoutYamls, extractKeymapId, generateSvgs };

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively find all layout.yaml files in a directory
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
 * Returns: { id: 'ferris-sweep-qwerty', keyboard: 'ferris/sweep', keymap: 'qwerty' }
 */
function parseKeymapPath(layoutPath) {
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
  const keyboard = keyboardParts.join('/');

  // Extract keymap name
  const keymapName = parts[keymapsIdx + 1];

  // Create ID: keyboard-keymap (with dashes)
  const id = [...keyboardParts, keymapName].join('-');

  return {
    id,
    keyboard,
    keymap: keymapName,
    path: layoutPath
  };
}

/**
 * Discover all keymaps in the keyboards directory
 */
function discoverKeymaps(keyboardsDir) {
  const layoutFiles = findLayoutYamls(keyboardsDir);
  return layoutFiles.map(parseKeymapPath);
}

// Run if executed directly
if (require.main === module) {
  const rootDir = path.join(__dirname, '..');
  const keyboardsDir = path.join(rootDir, 'keyboards');

  console.log('Discovering keymaps...\n');
  const keymaps = discoverKeymaps(keyboardsDir);

  console.log(`Found ${keymaps.length} keymap(s):\n`);
  keymaps.forEach(km => {
    console.log(`  ${km.id}`);
    console.log(`    Keyboard: ${km.keyboard}`);
    console.log(`    Keymap:   ${km.keymap}`);
    console.log(`    Path:     ${km.path}\n`);
  });
}

module.exports = { findLayoutYamls, parseKeymapPath, discoverKeymaps };

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import discovery utilities
const discoverPath = path.join(__dirname, '../../../scripts/discover-keymaps.js');
const { discoverKeymaps } = require(discoverPath);

// Load symbol mapping
const symbolMapping = require('./symbolMapping.json');

// Position-to-coordinate mapping for LAYOUT_split_3x5_2 (Ferris Sweep)
// Layout is stored as rows: [L L L L L R R R R R] × 3 rows + [thumb thumb thumb thumb]
// 34 keys total: 3 rows × 10 keys (5L + 5R) + 4 thumb keys (2L + 2R)
const POSITION_TO_COORDINATE = [
  // Row 1 (top): positions 0-9
  'LPT', 'LRT', 'LMT', 'LIT', 'LET',  // Left hand (0-4): q w e r t
  'RET', 'RIT', 'RMT', 'RRT', 'RPT',  // Right hand (5-9): y u i o p

  // Row 2 (home): positions 10-19
  'LPH', 'LRH', 'LMH', 'LIH', 'LEH',  // Left hand (10-14): a s d f g
  'REH', 'RIH', 'RMH', 'RRH', 'RPH',  // Right hand (15-19): h j k l ;

  // Row 3 (bottom): positions 20-29
  'LPB', 'LRB', 'LMB', 'LIB', 'LEB',  // Left hand (20-24): z x c v b
  'REB', 'RIB', 'RMB', 'RRB', 'RPB',  // Right hand (25-29): n m Repeat . /

  // Thumbs: positions 30-33
  'LTO', 'LTI',                       // Left thumbs (30-31): TO(NAV), OSM Shift
  'RTI', 'RTO'                        // Right thumbs (32-33): OSM Alt, Space
];

// Layer type classification
const LAYER_TYPES = {
  real: ['BASE', 'NAV', 'ALT_NAV', 'SYMBOL', 'SHIFT_SYMBOL'],  // Physical layers accessed via layer-switch keys
  ghost: ['BASE_SHIFT', 'BASE_ALT', 'BASE_SHIFT_ALT']  // Virtual layers accessed via modifiers
};

/**
 * Parse a key definition from layout.yaml
 * Handles: simple keys, labeled keys, mod-tap, one-shot mods, layer switches
 */
function parseKeyDefinition(keyDef) {
  if (keyDef === null) {
    return { type: 'empty', keycode: null, label: '—' };
  }

  // Handle string definitions
  if (typeof keyDef === 'string') {
    // Custom label (quoted in YAML)
    if (keyDef.includes('+') || keyDef.includes(' ')) {
      return { type: 'labeled', keycode: null, label: keyDef };
    }

    // Map common key names to keycodes (check this first, before pattern matching)
    const keycodeMap = {
      'Space': 'KC_SPACE',
      'Esc': 'KC_ESC',
      'Tab': 'KC_TAB',
      'Enter': 'KC_ENTER',
      'BSpace': 'KC_BSPC',
      'Repeat': 'QK_REPEAT_KEY',
      'Trans': 'KC_TRNS',
      'Left': 'KC_LEFT',
      'Right': 'KC_RIGHT',
      'Up': 'KC_UP',
      'Down': 'KC_DOWN'
    };

    if (keycodeMap[keyDef]) {
      return { type: 'keycode', keycode: keycodeMap[keyDef], label: keyDef };
    }

    // Check if it's a known keycode pattern (all uppercase)
    if (keyDef.match(/^[A-Z_]+$/)) {
      const mappedKeycode = `KC_${keyDef.toUpperCase()}`;
      return { type: 'keycode', keycode: mappedKeycode, label: keyDef };
    }

    // Single character
    if (keyDef.length === 1) {
      const keycode = `KC_${keyDef.toUpperCase()}`;
      return { type: 'char', keycode, label: keyDef };
    }

    // Fallback: treat as label
    return { type: 'labeled', keycode: null, label: keyDef };
  }

  // Handle object definitions (mod-tap, one-shot, layer switches, held keys)
  if (typeof keyDef === 'object') {
    // Check for "held" type (modifier keys that enable the current layer)
    if (keyDef.type === 'held') {
      return {
        type: 'held',
        keycode: null,
        label: '(held)'
      };
    }

    // Handle tap behavior (t: value)
    if (keyDef.t !== undefined) {
      const tapValue = keyDef.t;

      // Mod-tap with hold modifier
      if (keyDef.h !== undefined) {
        const holdMod = keyDef.h;
        const tapKey = parseKeyDefinition(tapValue);
        return {
          type: 'mod-tap',
          holdMod,
          tapKey,
          label: `${tapValue} (${holdMod} hold)`
        };
      }

      // One-shot modifier or layer switch (just tap behavior)
      if (tapValue.startsWith('OSM ')) {
        const modifier = tapValue.substring(4);
        return {
          type: 'one-shot-mod',
          modifier,
          keycode: `OSM(MOD_L${modifier.toUpperCase()})`,
          label: `OSM ${modifier}`
        };
      }

      if (tapValue.startsWith('TO(')) {
        const layerName = tapValue.substring(3, tapValue.length - 1);
        return {
          type: 'layer-switch',
          targetLayer: layerName,
          keycode: tapValue,
          label: `→ ${layerName}`
        };
      }

      // Simple tap value
      return parseKeyDefinition(tapValue);
    }
  }

  return { type: 'unknown', keycode: null, label: String(keyDef) };
}

/**
 * Get human-readable description for a shifted symbol
 */
function getShiftedDescription(symbol, originalDescription) {
  // For uppercase letters, use "Uppercase X" instead of "Shifted Lowercase x"
  if (symbol && symbol.length === 1 && symbol >= 'A' && symbol <= 'Z') {
    return `Uppercase ${symbol}`;
  }
  // For other symbols, use the symbol itself as description
  return symbol;
}

/**
 * Get the modifier needed to access a layer
 */
function getLayerModifier(layerName) {
  if (layerName === 'BASE_SHIFT') return 'LTI';  // OSM Shift on left thumb inside
  if (layerName === 'BASE_ALT') return 'RTI';     // OSM Alt on right thumb inside
  if (layerName === 'BASE_SHIFT_ALT') return 'LTI+RTI';  // Both modifiers
  if (layerName === 'SHIFT_SYMBOL') return 'LTI';  // Shift on SYMBOL layer
  if (layerName === 'ALT_NAV') return 'RTI';  // Alt on NAV layer
  return null;
}

/**
 * Categorize a labeled symbol that doesn't have a keycode mapping
 */
function categorizeLabeledSymbol(label, layerName) {
  // Symbol descriptions map
  const symbolDescriptions = {
    '`': 'Backtick',
    '@': 'At sign',
    '#': 'Hash',
    '$': 'Dollar sign',
    '%': 'Percent sign',
    '^': 'Caret',
    '&': 'Ampersand',
    '*': 'Asterisk',
    '-': 'Hyphen',
    '+': 'Plus sign',
    '=': 'Equals sign',
    '_': 'Underscore',
    '~': 'Tilde',
    "'": 'Single quote',
    '"': 'Double quote',
    '(': 'Left parenthesis',
    ')': 'Right parenthesis',
    '[': 'Left bracket',
    ']': 'Right bracket',
    '{': 'Left brace',
    '}': 'Right brace',
    '<': 'Less than',
    '>': 'Greater than',
    '/': 'Forward slash',
    '\\': 'Backslash',
    '|': 'Pipe',
    ',': 'Comma',
    '.': 'Period',
    ':': 'Colon',
    ';': 'Semicolon',
    '?': 'Question mark',
    '!': 'Exclamation mark',
    '€': 'Euro sign',
    '£': 'Pound sterling',
    '\u201C': 'Opening double quote',
    '\u201D': 'Closing double quote',
    '\u2018': 'Opening single quote',
    '\u2019': 'Closing single quote',
    // macOS Alt+letter symbols (SYMBOL layer)
    'œ': 'Latin ligature oe',
    '∑': 'Summation',
    '´': 'Acute accent',
    '®': 'Registered trademark',
    '†': 'Dagger',
    '¥': 'Yen sign',
    '¨': 'Diaeresis',
    'ˆ': 'Circumflex',
    'ø': 'O with stroke',
    'π': 'Pi',
    'å': 'A with ring',
    'ß': 'Sharp S (eszett)',
    '∂': 'Partial derivative',
    'ƒ': 'Function (florin)',
    '©': 'Copyright',
    '˙': 'Dot above',
    '∆': 'Delta',
    '˚': 'Ring above',
    '¬': 'Not sign',
    '…': 'Ellipsis',
    'Ω': 'Omega',
    '≈': 'Approximately equal',
    'ç': 'C cedilla',
    '√': 'Square root',
    '∫': 'Integral',
    '˜': 'Small tilde',
    '~': 'Tilde',
    'µ': 'Micro sign',
    '≤': 'Less than or equal',
    '≥': 'Greater than or equal',
    '÷': 'Division sign',
    // macOS Shift+Alt+letter symbols (SHIFT_SYMBOL layer)
    'Œ': 'Latin ligature OE',
    '„': 'Double low quote',
    '‰': 'Per mille',
    '‡': 'Double dagger',
    'ˇ': 'Caron',
    'Á': 'A acute',
    'Â': 'A circumflex',
    'Ê': 'E circumflex',
    'Ë': 'E diaeresis',
    '¯': 'Macron',
    'ˆ': 'Circumflex',
    'Ø': 'O with stroke',
    '∏': 'Product',
    'Å': 'A with ring',
    'Í': 'I acute',
    'Î': 'I circumflex',
    'Ï': 'I diaeresis',
    'Ì': 'I grave',
    '˝': 'Double acute',
    'Ó': 'O acute',
    'Ô': 'O circumflex',
    'Ò': 'O grave',
    'Ú': 'U acute',
    'Û': 'U circumflex',
    'Ù': 'U grave',
    'Æ': 'Latin ligature AE',
    '¸': 'Cedilla',
    '⁄': 'Fraction slash',
    'Ç': 'C cedilla',
    '◊': 'Lozenge',
    'ı': 'Dotless i',
    '˘': 'Breve',
    '¿': 'Inverted question mark'
  };

  // Keypad numbers (already formatted as "KP_X")
  if (/^KP_\d+$/.test(label)) {
    return { category: 'numbers', priority: 1, description: `Keypad ${label.substring(3)}` };
  }

  // Function keys
  if (/^F\d+$/.test(label)) {
    return { category: 'non-printing', priority: 3, description: `Function key ${label}` };
  }

  // Command combinations
  if (label.includes('Cmd+') || label.includes('Ctrl+') || label.includes('Alt+') || label.includes('Shift+')) {
    return { category: 'commands', priority: 4, description: label };
  }

  // Special words/labels
  if (label === 'Repeat') {
    return { category: 'special', priority: 3, description: 'Repeat last key' };
  }
  if (label === 'Alt Repeat') {
    return { category: 'special', priority: 3, description: 'Alternate repeat' };
  }
  if (label.includes('Word')) {
    return { category: 'special', priority: 3, description: label };
  }

  // Symbols from SYMBOL and SHIFT_SYMBOL layers are always rare
  if (layerName === 'SYMBOL' || layerName === 'SHIFT_SYMBOL') {
    const description = symbolDescriptions[label] || label;
    return { category: 'rare', priority: 4, description };
  }

  // £ and € from BASE_ALT or BASE_SHIFT_ALT layers are common (not rare)
  const baseLayerSymbols = ['€', '£'];
  const isBaseLayer = layerName === 'BASE_ALT' || layerName === 'BASE_SHIFT_ALT' || layerName === 'BASE' || layerName === 'BASE_SHIFT';
  const isCurlyQuote = ['\u201C', '\u201D', '\u2018', '\u2019'].includes(label);

  // Check if we have a description for this symbol
  if (symbolDescriptions[label]) {
    let category = 'common';
    let priority = 2;

    // Curly quotes are always rare
    if (isCurlyQuote) {
      category = 'rare';
      priority = 4;
    }
    // If £ or € are on base layers (BASE_ALT/BASE_SHIFT_ALT), they're common
    // Otherwise (like if they appear on SYMBOL layer), they're rare
    else if (baseLayerSymbols.includes(label) && !isBaseLayer) {
      category = 'rare';
      priority = 4;
    }

    return { category, priority, description: symbolDescriptions[label] };
  }

  // Default to common with the label as description
  return { category: 'common', priority: 2, description: label };
}

/**
 * Extract all symbols that can be typed from a parsed key
 */
function extractSymbolsFromKey(parsedKey, layerName, position) {
  const symbols = [];

  // Don't extract symbols from empty keys or held modifier keys
  if (parsedKey.type === 'empty' || parsedKey.type === 'held') {
    return symbols;
  }

  // For mod-tap keys, extract symbols from the tap behavior
  if (parsedKey.type === 'mod-tap' && parsedKey.tapKey) {
    return extractSymbolsFromKey(parsedKey.tapKey, layerName, position);
  }

  // Get position coordinate
  const coordinate = POSITION_TO_COORDINATE[position] || `pos${position}`;

  // Get layer modifier (for ghost layers)
  const layerModifier = getLayerModifier(layerName);

  // Get symbol mapping if available
  const mapping = parsedKey.keycode ? symbolMapping[parsedKey.keycode] : null;

  if (mapping) {
    // Determine which symbol to extract based on the key label
    // If label is uppercase (e.g., 'A'), extract only the shifted symbol
    // If label is lowercase (e.g., 'a'), extract only the unshifted symbol
    const isUppercase = parsedKey.label && parsedKey.label.length === 1 &&
                        parsedKey.label === parsedKey.label.toUpperCase() &&
                        parsedKey.label !== parsedKey.label.toLowerCase();

    if (isUppercase && mapping.shiftedSymbol) {
      // Extract shifted symbol (uppercase letter)
      const shiftedDescription = getShiftedDescription(mapping.shiftedSymbol, mapping.description);
      const notation = layerModifier ? `${layerModifier}+${coordinate}` : coordinate;

      symbols.push({
        symbol: mapping.shiftedSymbol,
        description: shiftedDescription,
        category: mapping.category,
        priority: mapping.priority,
        layer: layerName,
        position,
        coordinate,
        notation,
        method: layerModifier ? 'modifier' : 'direct',
        keyLabel: parsedKey.label
      });
    } else if (!isUppercase && mapping.symbol) {
      // Extract unshifted symbol (lowercase letter or other)
      const notation = layerModifier ? `${layerModifier}+${coordinate}` : coordinate;

      symbols.push({
        symbol: mapping.symbol,
        description: mapping.description,
        category: mapping.category,
        priority: mapping.priority,
        layer: layerName,
        position,
        coordinate,
        notation,
        method: layerModifier ? 'modifier' : 'direct',
        keyLabel: parsedKey.label
      });
    }
  } else if ((parsedKey.type === 'labeled' || parsedKey.type === 'char') && parsedKey.label && parsedKey.label !== '—') {
    // For labeled keys or char keys without keycode mapping, use the label itself
    const notation = layerModifier ? `${layerModifier}+${coordinate}` : coordinate;
    const { category, priority, description } = categorizeLabeledSymbol(parsedKey.label, layerName);

    symbols.push({
      symbol: parsedKey.label,
      description,
      category,
      priority,
      layer: layerName,
      position,
      coordinate,
      notation,
      method: layerModifier ? 'modifier' : 'direct',
      keyLabel: parsedKey.label
    });
  }

  return symbols;
}

/**
 * Parse layer data from layout.yaml
 */
function parseLayerData(layoutData) {
  const layers = [];

  for (const [layerName, layerKeys] of Object.entries(layoutData.layers || {})) {
    const keys = [];
    const allSymbols = [];
    let position = 0;

    // Flatten the layer key array (it's a 2D array representing rows)
    for (const row of layerKeys) {
      for (const keyDef of row) {
        const parsedKey = parseKeyDefinition(keyDef);
        keys.push(parsedKey);

        // Extract symbols from this key
        const symbols = extractSymbolsFromKey(parsedKey, layerName, position);
        allSymbols.push(...symbols);

        position++;
      }
    }

    layers.push({
      name: layerName,
      keys,
      symbols: allSymbols
    });
  }

  return layers;
}

/**
 * Get the real layer that a ghost layer belongs to
 */
function getRealLayer(layerName) {
  if (LAYER_TYPES.ghost.includes(layerName)) {
    return 'Layer 0 (Base)';  // Ghost layers belong to Layer 0
  }
  if (layerName === 'BASE') return 'Layer 0 (Base)';
  if (layerName === 'NAV') return 'Layer 1 (Nav)';
  if (layerName === 'ALT_NAV') return 'Layer 1 (Nav)';  // Alt on NAV layer
  if (layerName === 'SYMBOL') return 'Layer 2 (Symbol)';
  if (layerName === 'SHIFT_SYMBOL') return 'Layer 2 (Symbol)';  // Shift on SYMBOL layer
  return layerName;
}

/**
 * Build keymap data structure
 */
function buildKeymapData(keymapInfo) {
  try {
    // Read and parse layout.yaml
    const fileContents = fs.readFileSync(keymapInfo.path, 'utf8');
    const layoutData = yaml.load(fileContents);

    // Parse layers
    const layers = parseLayerData(layoutData);

    // Collect all unique symbols grouped by real layers
    const allSymbolsMap = new Map();

    for (const layer of layers) {
      for (const symbol of layer.symbols) {
        const key = `${symbol.symbol}|${symbol.description}`;
        if (!allSymbolsMap.has(key)) {
          allSymbolsMap.set(key, {
            symbol: symbol.symbol,
            description: symbol.description,
            category: symbol.category,
            priority: symbol.priority,
            accessMethods: {}  // Keyed by real layer name
          });
        }

        const symbolData = allSymbolsMap.get(key);
        const realLayer = getRealLayer(symbol.layer);

        // Initialize array for this real layer if needed
        if (!symbolData.accessMethods[realLayer]) {
          symbolData.accessMethods[realLayer] = [];
        }

        // Add this access method
        symbolData.accessMethods[realLayer].push({
          layer: symbol.layer,
          position: symbol.position,
          coordinate: symbol.coordinate,
          notation: symbol.notation,
          method: symbol.method,
          keyLabel: symbol.keyLabel
        });
      }
    }

    // Convert map to sorted array
    const allSymbols = Array.from(allSymbolsMap.values()).sort((a, b) => {
      // Sort by: priority, then category, then symbol
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return (a.symbol || '').localeCompare(b.symbol || '');
    });

    // Define available real layers
    const realLayers = [
      { id: 'layer0', name: 'Layer 0 (Base)' },
      { id: 'layer1', name: 'Layer 1 (Nav)' },
      { id: 'layer2', name: 'Layer 2 (Symbol)' }
    ];

    return {
      id: keymapInfo.id,
      keyboard: keymapInfo.keyboard,
      keymapName: keymapInfo.keymap,
      layoutFile: keymapInfo.path,
      layers,
      allSymbols,
      realLayers,
      svgPaths: layers.map(layer => ({
        name: layer.name,
        path: `/public/generated/${keymapInfo.id}/${layer.name.toLowerCase()}.svg`
      }))
    };
  } catch (error) {
    console.error(`Error parsing keymap ${keymapInfo.id}:`, error.message);
    return null;
  }
}

/**
 * Main data export for Eleventy
 */
module.exports = function() {
  const rootDir = path.join(__dirname, '../../..');
  const keyboardsDir = path.join(rootDir, 'keyboards');

  console.log('\n[Eleventy Data] Discovering keymaps...');

  // Discover all keymaps
  const keymapInfos = discoverKeymaps(keyboardsDir);
  console.log(`[Eleventy Data] Found ${keymapInfos.length} keymap(s)`);

  // Build data for each keymap
  const keymaps = keymapInfos
    .map(buildKeymapData)
    .filter(km => km !== null);

  console.log(`[Eleventy Data] Processed ${keymaps.length} keymap(s)`);

  // Log some stats
  keymaps.forEach(km => {
    console.log(`  ${km.id}: ${km.layers.length} layers, ${km.allSymbols.length} unique symbols`);
  });

  return keymaps;
};

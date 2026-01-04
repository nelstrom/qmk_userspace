module.exports = function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("public");

  // Watch for changes in keyboard configuration files during dev
  eleventyConfig.addWatchTarget("../keyboards/**/*.yaml");

  // Custom filter: Get keycode description from symbol mapping
  eleventyConfig.addFilter("keycodeDesc", function(keycode) {
    const mapping = this.ctx.symbolMapping || {};
    return mapping[keycode] || {
      symbol: null,
      description: keycode,
      category: 'unknown'
    };
  });

  // Custom filter: Find item in array by property
  eleventyConfig.addFilter("find", function(array, property, value) {
    if (!Array.isArray(array)) return null;
    return array.find(item => item[property] === value);
  });

  // Custom filter: Format key combination for display
  eleventyConfig.addFilter("formatKeyCombination", function(combo) {
    if (!combo) return '—';

    let parts = [];

    // Add modifiers
    if (combo.mods && combo.mods.length > 0) {
      parts.push(...combo.mods);
    }

    // Add base key
    if (combo.baseKey) {
      parts.push(combo.baseKey);
    }

    // Handle special cases
    if (combo.modTapHold) {
      return `Hold ${combo.modTapHold}${combo.withKey ? ' + ' + combo.withKey : ''}`;
    }

    if (combo.layerSwitch) {
      return `Layer ${combo.layerSwitch}${combo.baseKey ? ' → ' + combo.baseKey : ''}`;
    }

    return parts.join(' + ') || '—';
  });

  // Custom filter: Replace text
  eleventyConfig.addFilter("replace", function(str, search, replace) {
    if (typeof str !== 'string') return str;
    return str.replace(new RegExp(search, 'g'), replace);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};

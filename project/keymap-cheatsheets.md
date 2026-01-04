# Keymap cheetsheets

Create a website containing visualisations of my keymaps. The website should be able to run locally with a webserver, and should also be able to be published to Github pages. The website should have an index page, containing links to each keymap, grouped by keyboard. Initially, there will only be a single keymap, that being qwerty for my Ferris Sweep. Later, I may add a variation for Colemak.

The webpage for a keymap should feature:

* SVG diagrams for each layer
* index tables showing all symbols that can be typed, and where on the keyboard they can be found

Note that some symbols may appear multiple times.

## Creating SVG diagrams

The keymap-drawer app can create SVG diagrams from a layout.yaml file. This is a good starting point. We shall define one layout.yaml file for each keymap. There should be a build step that generates all SVG files. The layout.yaml source files should be co-located with the actual source code for the keymap itself. The generated SVG files should appear in the source directory for the website.

## Creating index tables

The index tables should be grouped by category. For example, we'll start with the most common symbols (lowercase letters, uppercase letters, punctuation, numbers), we'll also include non-printing characters (including function keys F1-F12, command+{symbol} combos, and so on), and finally we'll include the rare symbols, such as those accessed on os x with the alt key.

The index table should include several columns:

1. Showing the character (where possible)
2. Describing the symbol (e.g. "Lowercase a", "Tab", "Function key 1")
3. Layer 0: which keys to press to produce that symbol
4. Layer 1: which keys to press to produce that symbol
5. Layer 2: which keys to press to produce that symbol

The purpose of these index tables is to make it easy to look up a symbol/character, and figure out how to type it.

## Theming

The site should support both light mode and dark mode. By default it should follow the user's system preferences.

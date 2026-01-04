# QWERTY Keymap for Ferris Sweep

A personal QWERTY keymap optimized for programming and macOS usage.

## Layers

### Layer 0: Base (QWERTY)

Standard QWERTY layout with:
- Homerow mods (D, F, J, K)
- One-shot modifiers on thumbs (Shift, Alt)
- Layer toggle to Nav layer
- Repeat key

### Layer 1: Numbers and Navigation

- Keypad numbers (0-9)
- Arrow keys (Left, Down, Up, Right)
- Browser navigation (Cmd+[, Ctrl+Shift+Tab, Ctrl+Tab, Cmd+])
- Period key for decimal input
- Backspace, Tab, Enter, Esc

### Layer 2: Alt-Symbols

Special macOS symbols accessed via Alt+key combinations (rarely used as a layer).

## Key Configuration Notes

### Chordal Hold Behavior

Chordal Hold prevents same-hand chords from activating modifiers:
- D (left) + F (left) = "df" (no Cmd)
- K (right) + F (left) = Cmd+F (opposite hands)

Note: Chordal Hold only affects fast typing. Holding a homerow mod past the tapping term (200ms) without pressing another key will activate the modifier.

### Cmd+Alt+Key "Melody" Behavior

Due to one-shot modifier timing, Cmd+Alt+key combinations require a specific order:
1. Press and hold homerow mod (Cmd)
2. Press and hold Alt thumb key
3. Press the target key

Reversing the order (Alt first, then Cmd) may not work as expected.

## Build

To compile the keymap:

```bash
qmk compile -kb ferris/sweep -km qwerty
```

And to flash it:

```bash
qmk flash -kb ferris/sweep -km qwerty
```


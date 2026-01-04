# Keymap Notation System

## Overview

This notation system provides a clear, concise way to describe which physical keys to press on a split keyboard, avoiding tautological descriptions like "press the 'a' key to type 'a'".

The notation describes the **physical position** of keys using a coordinate system based on:
- Which hand (left or right)
- Which finger is used
- Which row the key is on

## Coordinate Format

### Regular Keys (Non-Thumb)

Format: `[L|R][p|r|m|i|e][h|t|b]`

**Hand:**
- `L` = Left hand
- `R` = Right hand

**Finger:**
- `p` = Pinky
- `r` = Ring finger
- `m` = Middle finger
- `i` = Index finger
- `e` = Empty column (index finger reach - the 5th column)

**Row:**
- `h` = Home row
- `t` = Top row
- `b` = Bottom row

### Thumb Keys

Format: `[L|R]t[i|o]`

**Hand:**
- `L` = Left hand
- `R` = Right hand

**Finger:**
- `t` = Thumb

**Position:**
- `i` = Inside (thumb key closer to center/index finger)
- `o` = Outside (thumb key further from center)

## Examples

### Single Key Press

| Symbol | Notation | Description |
|--------|----------|-------------|
| a | `LPH` | Left pinky, home row |
| A | `LPH` (with shift) | Left pinky, home row + modifier |
| s | `LRH` | Left ring, home row |
| d | `LMH` | Left middle, home row |
| f | `LIH` | Left index, home row |
| g | `LEH` | Left index reach (empty column), home row |
| q | `LPT` | Left pinky, top row |
| z | `LPB` | Left pinky, bottom row |
| ; | `RPH` | Right pinky, home row |
| Space | `LTO` | Left thumb, outside |
| Nav layer | `RTO` | Right thumb, outside (TO(NAV)) |

### Key Combinations (Modifiers + Key)

Format: `MODIFIER+KEY`

| Symbol | Notation | Description |
|--------|----------|-------------|
| * | `RTI+RMT` | Right thumb inside (Alt) + Right middle top (i key) |
| @ | `RTI+LRT` | Right thumb inside (Alt) + Left ring top (w key) |
| % | `RTI+RRT` | Right thumb inside (Alt) + Right ring top (t key) |
| Backspace (Alt+P) | `RTI+RPT` | Right thumb inside (Alt) + Right pinky top |

## Physical Keyboard Layout (Ferris Sweep)

### Left Hand

```
Row:    Top (t)    Home (h)   Bottom (b)
Pinky:     q          a           z        (p)
Ring:      w          s           x        (r)
Middle:    e          d           c        (m)
Index:     r          f           v        (i)
Reach:     t          g           b        (e)

Thumbs: Space (o)  OSM Shift (i)
```

### Right Hand

```
Row:    Top (t)    Home (h)   Bottom (b)
Reach:     y          h           n        (e)
Index:     u          j           m        (i)
Middle:    i          k       Repeat       (m)
Ring:      o          l           .        (r)
Pinky:     p          ;           /        (p)

Thumbs: OSM Alt (i)  TO(NAV) (o)
```

## Layer Types

### Real Layers
Accessed with layer-switch keys (e.g., `TO(NAV)`). No modifier keys need to be held.

- **Layer 0**: Base layer (default)
- **Layer 1**: Nav layer (navigation and numbers)
- **Layer 2**: Alt-symbol layer (future/TBD)

### Ghost Layers
Virtual layers accessed by holding modifier keys. Not separate physical layers.

- **SHIFT**: Accessed by holding Shift modifier
- **ALT**: Accessed by holding Alt modifier
- **SHIFT_ALT**: Accessed by holding both Shift and Alt modifiers

## Usage in Documentation

When documenting symbol access methods in the index tables:

1. **Symbol column**: The character itself (e.g., `a`, `*`, `@`)
2. **Description column**: Human-readable name (e.g., "Lowercase a", "Asterisk", "At sign")
3. **Layer columns**: One column per **real layer** (Layer 0, Layer 1, Layer 2)
   - Shows all ways to access the symbol from that layer
   - Includes both direct key presses and modifier combinations
   - Uses coordinate notation for clarity

### Example Table Entries

| Symbol | Description | Layer 0 (Base) | Layer 1 (Nav) | Layer 2 (Alt-Sym) |
|--------|-------------|----------------|---------------|-------------------|
| a | Lowercase a | `LPH` | — | — |
| A | Uppercase A | `LTI+LPH` | — | — |
| * | Asterisk | `RTI+RMT` | — | — |
| Space | Space | `LTO` | — | — |
| ↵ | Enter | `RTI+RPH` | `RPH` | — |

## Notes

- This notation describes **physical key positions**, not the symbols printed on keycaps
- The same physical key may produce different symbols depending on:
  - The active layer
  - Which modifiers are held
- Modifier combinations are shown with `+` (e.g., `LTI+LPH` = left thumb inside + left pinky home)
- The notation is independent of the keymap layout (QWERTY, Colemak, etc.)
- `—` indicates the symbol is not accessible from that layer

## Benefits

1. **Language-independent**: Describes physical positions, not key labels
2. **Layout-agnostic**: Works with any keymap (QWERTY, Colemak, Dvorak, etc.)
3. **Muscle memory focused**: Emphasizes finger positions rather than abstract key names
4. **Concise**: Short notation (3-4 characters per key)
5. **Unambiguous**: Each physical key has exactly one notation
6. **Avoids tautology**: Describes *how* to type a symbol, not just "press the X key"

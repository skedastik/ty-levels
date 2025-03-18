# Changelog

All notable changes to this project (and related repos) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2025.03.18]

### Added

- [Auto-edit annotations](./README.md#b-auto-edit-annotations)
    - Support arguments for auto-edit annotations.
    - Support translation.

## [2025.03.15]

### Added

- [Auto-edit annotations](./README.md#b-auto-edit-annotations)
    - Bulk transformation commands are nice, but why apply them by hand when you can just annotate your ALF and let the build process do it for you!

## [2025.03.13]

### Added

- Avara editor-tools [fork](https://github.com/skedastik/Avara/tree/editor-tools) and [ty-levels](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels) VS Code extension
    - New TUI [commands](./README.md#in-game-commands)
        - `/pick`
        - `/set`

## [2025.03.10]

### Added

- [ty-levels](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels) VS Code extension
    - `Set Param` command
    - Configurable auto-tagging

## [2025.03.09]

### Changed

- Adopt the convention of capitalizing all macros that create actors. For example, "ramp" is now "Ramp".

## [2025.03.07]

### Added

- [ty-levels](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels) VS Code extension
    - Transform your elements en masse with new Translate and Mirror commands.

## [2025.03.06]

### Added

- This changelog. I wish I started it sooner. 🤷‍♂️

## [2025.03.03]

### Added

- [ty-levels](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels) VS Code extension
    - Automatically tag your solids. Tagging is effortless now.
- [Editor tools](https://github.com/skedastik/Avara/tree/editor-tools) commands:
    - `/find` Immediately reveal a tagged target in VS Code if you have [live reloading](README.md#live-reloading-) enabled.
    - `/tele` Teleport to the top of your target or target ground location.

## [2025.03.02]

### Added

- [src/lib/standard.alf](src/lib/standard.alf)
    - New `Wall` and `Ramp` macros support bounding-box definitions as well as the old center-dimensions definitions. Use whichever you prefer or whatever the situation calls for. The parameters are flexible. Mix and match as you please.
    - The `Ramp` macro creates seamless ramps, regardless of thickness. No more visible gaps! (Gaps are still an option, of course. We love gaps too.)
    - The `Ramp` macro allows ramps of arbitrary size. Goodbye 20x20 restriction, hello gigantic ramps.

## [2025.02.25]

### Added

- [src/lib/rulesets/tdm.alf](src/lib/rulesets/tdm.alf)
    - Team deathmatch, evolved. Apply the ruleset to any level.
- [src/sets/tantalus/alf/tantalus.alf](src/sets/tantalus/alf/tantalus.alf)
    - Wow, my first level in decades. It uses the TDM ruleset. I wonder how it plays...

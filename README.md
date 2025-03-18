# ty-levels

Get the latest release [here](https://github.com/skedastik/ty-levels/releases/latest).

## Development

⚠️ This repo's workflow only supports macOS (and potentially Linux with some small adjustments).

Install Python dependencies:

    $ virtualenv venv
    $ source venv/bin/activate
    $ pip install -r requirements.txt

Install Node.js dependencies:

    $ npm install

Build distributable level files:

    $ make

Level files are created in `dist`.

To playtest these levels you'll need to create symbolic links to their containing folders in your Avara app's `levels` folder (e.g. `/Applications/Avara.app/Contents/Resources/levels`). The Makefile can help with that:

    $ make symlinks APP_LEVELS_PATH=/path/to/app/levels

### Automatic `make`

Install `fswatch`:

    $ brew install fswatch

 Then:

    $ ./watch

Now `make` will automatically run in response to source file changes.

#### Options

    --no-trim
            Disable automatic trimming of unnecessary whitespace and comments from ALF files.
    --debug
            Set `DEBUG` global to `True` across all ALF templates.

### Publishing

Push your changes, then:

    $ make release

## Editing tools 🛠️

Editing levels without additional tooling is painful. Build [this](https://github.com/skedastik/Avara/tree/editor-tools) Avara fork and install the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels). Now you have access to...

### Live reloading 🎥

Launch the app and start a private server. Load a level from this repo.

Then start the watch script, supplying the `-l` option:

    $ ./watch -l

Avara will now automatically reload the level in response to source file changes. Note that while your position and orientation are preserved, all level state is reset.

⚠️ Make sure your server is private, i.e. not registered with the tracker. Things will catch fire in a hurry if other clients are connected.

### Editing HUD 🥽

The above fork also features an editing HUD that has proven to be indispensable. Activate it by issuing the `/ehud` command. Now you're a surveyor.

### Etags 🏷️

The fork supports "etags" or editing tags. An etag is a string attribute that can be applied to any element in your ALF file. Etags are surfaced in the editing HUD when you look at a tagged actor. No more hunting for that damn wall. Just tag your geometry!

[VS Code](https://code.visualstudio.com) is recommended to take full advantage of etags, including the ability to instantly reveal tagged objects in your code. See [Appendix A](#a-etags).

### In-game commands

    /ehud
            Toggle the editing HUD on and off.
            
    /tele
            Teleport to top of target object, or target ground location.

    /f /find
            Reveal the target actor in VS Code. Live reload must be enabled.

    /pick
            PICK an actor to apply edits to.

    /set param1=value1,param2=value2,...,paramN=valueN
            Reveal the PICKED actor in VS Code and set its specified parameters to their respective values. Example: "/set w=1,d=1".
            

### Bulk transformations 📐

Let's say you're designing a symmetrical level. You finished half of it. Now you have to duplicate everything and manually update all the coordinates. It would be really nice if everything was centered around the origin at (0,0) too. Ugh, what a pain, right?

No longer. With the VS Code extension's bulk transformations feature you can translate, mirror, and rotate elements en masse with a single command.

### Auto-edit ✨

Bulk transformation commands are nice, but why apply them by hand when you can just annotate your ALF and let the build process do it for you! See [Appendix B](#b-auto-edit-annotations).

## Appendix

### A. Etags

This repo is configured to recommend the [ty-levels](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels) VS Code extension which was purpose-built to make tagging effortless. After installing the extension you will have access to the following features:

#### `Toggle Auto Tag`

Hit **Cmd-Shift-P** and begin typing "autotag". Hit **Enter** when the command appears. Now all your untagged solids (Walls, Ramps, WallDoors etc.) are automatically tagged on save.

Copying and pasting tagged elements? No problem. Any pasted etags will be retagged automatically ensuring they are always unique.

#### `Find Etag` 🔎

If you have live reload enabled, you can use `/f` in-game to reveal your target in VS Code. You will be prompted to allow the "ty-levels" extension to open relevant URIs. Check "do not ask me again" and click **Open**.

#### Other commands

For a full list of commands and configuration options see the extension [README](https://marketplace.visualstudio.com/items?itemName=skedastik.ty-levels).

### B. Auto-edit annotations

Most Avara levels have symmetry, either rotational or reflected. The bulk transformation VS Code commands can help with that, but you still have to apply them manually. At least, you did before. Now you can just annotate your ALF files and have the build process do it for you. Combined with macro composition, auto-edits makes symmetrical level design a breeze.

Annotations are applied using a pair of comment tags:

    <!--auto: edit1, edit2, edit3, ..., editN-->
        <Wall />
        <Ramp />
        ...
    <--/auto-->

The following edits (and their shortened aliases) are currently supported:

- mirrorX / mx
- mirrorZ / mz
- mirrorY / my
- rotate90Clockwise / rc
- rotate90Counterclockwise / rcc

Edits can be infinitely chained and nested. They are applied from innermost to outermost, left to right. Take the following example:

    <!--auto: rotate90Clockwise, rotate90Clockwise-->
        <Wall ... />
        <!--auto: mirrorX-->
            <Ramp >
        <--/auto-->
    <--/auto-->

The order of operations above is:

1. Mirror **Ramp** across X axis.
2. Rotate **Wall and Ramp** 90 degrees clockwise twice.

The true power of auto-edits emerge when combined with Jinja macro composition.You could, for instance, design one quadrant of your level, place it in a macro, then call the macro four times in your layout, applying rotation each time. Now you have rotational symmetry with changes to the original quadrant being instantly reflected in the others.

See [architecture-001a.alf](./src/sets/architecture/alf/architecture-001a.alf) for a concrete example.

### C. File structure

.alf source files are found in `src`. These aren't pure ALF files, but [Jinja](https://jinja.palletsprojects.com) templates that render to ALF via the build process.

- Main .alf file for each level: `src/sets/{set-name}/alf/{level-name}.alf`
- Components specific to each level: `src/sets/{set-name}/alf/{level-name}/`
- Reusable components common to each set: `src/sets/{set-name}/common/`
- Reusable components common to all sets: `src/lib/`
- alf_globals.py
    - These globals are exposed to all .alf Jinja templates.
- Resources specific to each set...
    - BSPs: `src/sets/{set-name}/bsps/`
    - Sounds: `src/sets/{set-name}/ogg/`
- Resources required by components in `src/lib/`...
    - BSPs: `src/lib/bsps/`

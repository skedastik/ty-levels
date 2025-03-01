# ty-levels

Get the latest release [here](https://github.com/skedastik/ty-levels/releases/latest).

## Development

Install Python dependencies:

    $ virtualenv venv
    $ source venv/bin/activate
    $ pip install -r requirements.txt

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

Editing levels without in-game tooling is painful. Build [this](https://github.com/skedastik/Avara/tree/editor-tools) Avara fork. Now you have access to...

### Live reloading 🎥

Launch the app and start a private server. Load a level from this repo.

Then start the watch script, supplying the `-l` option:

    $ ./watch -l

Avara will now automatically reload the level in response to source file changes. Note that while your position and orientation are preserved, all level state is reset.

⚠️ Make sure your server is private, i.e. not registered with the tracker. Things will catch fire in a hurry if other clients are connected.

### Editing HUD 🥽

The above fork also features an editing HUD that has proven to be indispensable. Activate it by issuing the `/ehud` command. Now you're a surveyor.

#### Etags 🏷️

The fork supports "etags" or editing tags. An etag is a string attribute that can be applied to any element in your ALF file. Etags are surfaced in the editing HUD when you look at a tagged actor. No more hunting for that damn wall. Just tag your geometry!

## File structure

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

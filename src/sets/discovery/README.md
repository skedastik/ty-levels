# Rediscovering Avara level design in 2025

What fresh hell is this?

## ALF

No, not the alien.

I spent an afternoon looking at the `.alf` format. I tried building a very basic level with pure XML. It was, unsurprisingly, very painful. Placing objects and maintaining their spatial relationships through pure XML is a recipe for personal ruin.

But does it need to be this hard?

Maybe not. Utilizing a templating engine like Jinja might help.

## Creating custom BSPs with Blender

Download `https://github.com/avaraline/blender-avarabsp`.

Zip the folder containing `__init__.py` and accompanying scripts.

Install in Blender via `Edit > Preferences > Add-ons tab > Drop down menu in top-right > Install from Disk...`. Select the zip file created above.

Now you can export Avara BSP JSON files via `File > Export > Avarabsp (json)`.

BSP files should be placed in a `bsps` folder in the same folder as your set's `set.json` folder. They **must** have numerical names, e.g. `3700.json`. Use the numerical portion when setting the `shape` attribute of an object in your .alf file.

### A note on coordinate systems

A unit cube in Blender matches a unit wall in Avara (i.e. side lengths of 1). Keep in mind that positive Y is **up** (towards the sky) in Avara.

⚠️ The exporter does NOT apply Blender's mesh transformations. This means any scaling/rotation/translation will not affect the exported mesh. Remember to select `Object > Apply > All Transforms` before exporting.

### Viewing normals (i.e. inside/outside faces)

Expand the `Viewport Overlays` menu (3rd dropdown menu in the top right of the view window). Select `Face Orientation`.

### Applying colors

To apply colors to your mesh you'll need to first break up your mesh into separate objects for each different color. Then, for each object:

- Select the object.
- Press `tab` to enter `Edit Mode`.
- Activate face selection mode (third button to the right of the `Edit Mode` menu at the top-left of the screen).
- Press `A` to select all faces.
- From the `Edit Mode` menu, select `Vertex Paint`.
- Activate face masking by clicking the first button to the right of the `Vertex Paint` menu.
- Choose the desired color from color picker. Make sure you are using the primary color picker (the one on the left). 
- Select `Paint > Set Vertex Colors` to apply the chosen color to the object.

Once you have colored each section, select all objects and join them into a single mesh (cmd-J).

The mesh is now ready for export.

⚠️ **NOTE:** You may need to restart Avara for changes to BSP files to be reflected.

⚠️ **UPDATE 2025.02.11:** The Avara BSP exporter Blender plugin seems to apply colors very unreliably. I've gotten it to work as expected once and it isn't clear why.

#### Dynamic marker colors

What if you want to color the mesh using dynamic marker colors? Using a text editor, open the BSP JSON file and replace the desired elements of the `colors` property to `"marker(X)"` where X is 0 or 1. In your ALF file, apply marker colors using `color="{color}"` or `color.1="{color}"`.

## Importing custom sounds

Ogg files must have a sample rate around 11KHz. Anything higher will cause distortion and/or crashing.

Also, the file must have a metadata header or Avara will crash. This means you must supply some metadata such as a track title when exporting from Audacity for example.

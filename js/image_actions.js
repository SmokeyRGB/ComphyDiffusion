// image_actions.js

// Import the proper modules (matching main.js)
const photoshop = require("photoshop");
const app = photoshop.app;
const batchPlay = photoshop.action.batchPlay;
const fs = require("uxp").storage.localFileSystem;
const prompt_handeling = require('./prompt_handeling');
const utils = require('./utils');

// ────────────────────────────────────────────────────────────────
// Create a temporary selection channel (using a rectangle then duplicating it)
const createSelectionChannel = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: {
                        _obj: "rectangle",
                        top: { _unit: "pixelsUnit", _value: 0 },
                        left: { _unit: "pixelsUnit", _value: 0 },
                        bottom: { _unit: "pixelsUnit", _value: 33 },
                        right: { _unit: "pixelsUnit", _value: 31 }
                    },
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "duplicate",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    name: "tmp_selection",
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: {
                        _enum: "ordinal",
                        _value: "none"
                    },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst saving Selection: " + e);
        }
    }, { commandName: "Save Selection" });
};

// ────────────────────────────────────────────────────────────────
// Save the current selection into the temporary channel
const saveSelection = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _name: "tmp_selection" }
                    ],
                    to: { _ref: "channel", _property: "selection" },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst saving Selection: " + e);
        }
    }, { commandName: "Save Selection" });
};

// ────────────────────────────────────────────────────────────────
// Reload the temporary selection into the active selection
const loadSelection = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: { _ref: "channel", _name: "tmp_selection" },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst loading Selection: " + e);
        }
    }, { commandName: "Load Selection" });
};

// ────────────────────────────────────────────────────────────────
// Paste the temporary image file (temp_image_preview.png) as a layer
const pasteLayer = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            const tempFolderPath = await fs.getTemporaryFolder();
            // Retrieve the temporary file (creating or overwriting it as needed)
            const tempFile = await tempFolderPath.getEntry("temp_image_preview.png", { overwrite: true });
            const token = fs.createSessionToken(tempFile);
            await batchPlay([
                {
                    _obj: "placeEvent",
                    ID: 90,
                    null: { _path: token, _kind: "local" },
                    freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
                    offset: {
                        _obj: "offset",
                        horizontal: { _unit: "pixelsUnit", _value: 0 },
                        vertical: { _unit: "pixelsUnit", _value: 0 }
                    },
                    replaceLayer: { _obj: "placeEvent", to: { _ref: "layer", _id: 90 } },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst pasting Image as Layer: " + e);
        }
    }, { commandName: "Paste Image as Layer" });
};

// ────────────────────────────────────────────────────────────────
// Center the active layer on the canvas
const centerImage = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: { _enum: "ordinal", _value: "allEnum" },
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "align",
                    _target: [
                        { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    using: { _enum: "alignDistributeSelector", _value: "ADSCentersH" },
                    alignToCanvas: false,
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "align",
                    _target: [
                        { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    using: { _enum: "alignDistributeSelector", _value: "ADSCentersV" },
                    alignToCanvas: false,
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: { _enum: "ordinal", _value: "none" },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst centering pasted layer: " + e);
        }
    }, { commandName: "Center Layer" });
};

// ────────────────────────────────────────────────────────────────
// Apply the active selection as a layer mask
const applyImageMask = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "make",
                    new: { _class: "channel" },
                    at: { _ref: "channel", _enum: "channel", _value: "mask" },
                    using: { _enum: "userMaskEnabled", _value: "revealSelection" },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error applying image mask: " + e);
        }
    }, { commandName: "Apply Image Mask" });
};

// ────────────────────────────────────────────────────────────────
// Convert the current layer into a Smart Object
const makeSmartObject = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                { _obj: "newPlacedLayer", _options: { dialogOptions: "dontDisplay" } }
            ], {});
        } catch (e) {
            console.log("Error whilst making smart-object: " + e);
        }
    }, { commandName: "Make Smart Object" });
};

// ────────────────────────────────────────────────────────────────
// Copy the active layer to the clipboard then delete it
const copyImageToClipboard = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "channel", _property: "selection" }
                    ],
                    to: { _enum: "ordinal", _value: "allEnum" },
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "copyEvent",
                    copyHint: "pixels",
                    _options: { dialogOptions: "dontDisplay" }
                },
                {
                    _obj: "delete",
                    _target: [
                        { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    layerID: [66],
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst copying layer to clipboard: " + e);
        }
    }, { commandName: "Copy Layer" });
};

// ────────────────────────────────────────────────────────────────
// Rename the active layer with the given name
const renameLayer = async (layername) => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                {
                    _obj: "set",
                    _target: [
                        { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    to: { _obj: "layer", name: layername },
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst renaming layer: " + e);
        }
    }, { commandName: "Rename Layer" });
};

// ────────────────────────────────────────────────────────────────
// Run a series of commands to “stamp remove” (generate inpaint/RGB images)
const runStampRemove = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            const tempFolder = await fs.getTemporaryFolder();
            const tempFileAlpha = await tempFolder.createFile("temp_image_inpaint.png", { overwrite: true });
            const tempFileRGB = await tempFolder.createFile("temp_image_rgb.png", { overwrite: true });
            console.log("Temporary files created for inpaint and RGB images.");
            const token = fs.createSessionToken(tempFileAlpha);
            const rgbtoken = fs.createSessionToken(tempFileRGB);
            
            await batchPlay([
                // MAKE BLANK LAYER
                {
                    _obj: "make",
                    _target: [{ _ref: "layer" }],
                    layerID: 18,
                    _options: { dialogOptions: "dontDisplay" }
                },
                // MERGE
                {
                    _obj: "mergeVisible",
                    duplicate: true,
                    _isCommand: true
                },
                // SAVE WITH RGB
                {
                    _obj: "save",
                    as: {
                        _obj: "JPEG",
                        extendedQuality: 12,
                        scans: 3,
                        matteColor: { _enum: "matteColor", _value: "none" }
                    },
                    in: { _path: rgbtoken, _kind: "local" },
                    documentID: 59,
                    copy: true,
                    lowerCase: true,
                    saveStage: { _enum: "saveStageType", _value: "saveBegin" },
                    _isCommand: true
                },
                // DELETE SELECTION
                {
                    _obj: "delete",
                    _options: { dialogOptions: "dontDisplay" }
                },
                // HIDE LAYERS
                {
                    _obj: "show",
                    null: [
                        { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    toggleOptionsPalette: true,
                    _options: { dialogOptions: "dontDisplay" }
                },
                // SAVE (as PNG with alpha disabled)
                {
                    _obj: "save",
                    as: {
                        _obj: "PNGFormat",
                        method: { _enum: "PNGMethod", _value: "quick" },
                        PNGInterlaceType: { _enum: "PNGInterlaceType", _value: "PNGInterlaceNone" },
                        PNGFilter: { _enum: "PNGFilter", _value: "PNGFilterAdaptive" },
                        compression: 6,
                        embedIccProfileLastState: { _enum: "embedOff", _value: "embedOff" }
                    },
                    in: { _path: token, _kind: "local" },
                    documentID: 10836,
                    copy: true,
                    lowerCase: true,
                    alphaChannels: false,
                    embedProfiles: false,
                    saveStage: { _enum: "saveStageType", _value: "saveSucceeded" },
                    _options: { dialogOptions: "dontDisplay" }
                },
                // ROLLBACK (select an earlier history state)
                {
                    _obj: "select",
                    _target: [
                        { _ref: "historyState", _offset: -6 }
                    ],
                    _isCommand: true
                }
            ], {});
            console.log("BatchPlay for stamp removal completed successfully.");
            console.log("Saved at: " + token);
        } catch (e) {
            console.log("Error whilst extracting Mask: " + e);
        }
    }, { commandName: "Run Stamp Remove" });
};

// ────────────────────────────────────────────────────────────────
// Run a “fast queue” by clearing the quick mask only
const fastQueue = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                // ACTIVATE QUICKMASK
                {
                    _obj: "set",
                    _target: [
                        { _ref: "property", _property: "quickMask" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    _options: { dialogOptions: "dontDisplay" }
                },
                // CLEAR QUICKMASK
                {
                    _obj: "clearEvent",
                    _target: [
                        { _ref: "property", _property: "quickMask" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" }
                    ],
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst executing fast queue: " + e);
        }
    }, { commandName: "Fast Queue" });
};

// ────────────────────────────────────────────────────────────────
// Add a noise layer (and then convert it to a smart object)
const addNoiseLayer = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            await batchPlay([
                // Make a neutral (grey) layer with overlay blend mode
                {
                    _obj: "make",
                    _target: [{ _ref: "layer" }],
                    using: {
                        _obj: "layer",
                        mode: { _enum: "blendMode", _value: "overlay" },
                        fillNeutral: true
                    },
                    layerID: 13,
                    _options: { dialogOptions: "dontDisplay" }
                },
                // Convert the layer to a placed layer (smart object)
                {
                    _obj: "newPlacedLayer",
                    _options: { dialogOptions: "dontDisplay" }
                },
                // Add noise
                {
                    _obj: "addNoise",
                    distort: { _enum: "distort", _value: "gaussianDistribution" },
                    noise: { _unit: "percentUnit", _value: 3 },
                    monochromatic: true,
                    $FlRs: 11088511,
                    _options: { dialogOptions: "dontDisplay" }
                },
                // Apply a small gaussian blur
                {
                    _obj: "gaussianBlur",
                    radius: { _unit: "pixelsUnit", _value: 0.5 },
                    _options: { dialogOptions: "dontDisplay" }
                },
                // Group the layer (for example, to create a layer mask)
                {
                    _obj: "groupEvent",
                    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], {});
        } catch (e) {
            console.log("Error whilst adding noise layer: " + e);
        }
    }, { commandName: "Add Noise Layer" });
};

const insertAsLayer = async (insertAs, tempFolderPath) => {
    //console.log((insertToClipboard ? "Copying to Clipboard: " : "Inserting as Layer: ") + insertAs);
    let prompt = await prompt_handeling.loadPrompt(tempFolderPath);
    let hadSelection = await utils.selectionActive();

    let layerName = prompt['seed'] + "~" + prompt['positive'] + "~" + prompt['negative'] + "~" + prompt['steps'] + "~" + prompt['cfg'];

    console.log("Inserting as Layer: " + layerName);
    // Save the user selection
    await saveSelection();
    await pasteLayer();
    await centerImage();

    // Embed generation info in layer name
    await renameLayer(layerName);
    await makeSmartObject();

    // WIP: Embed metadata
    // await embedMetadata(prompt['positive'])

    await loadSelection();

    // WIP: Handle selection
    if (hadSelection) {
        console.log("User has selection. (WIP: Saving.)");
        // await saveSelection();
        hadSelection = true;
    } else {
        console.log("User has no selection. Continuing.");
        hadSelection = false;
    }

    switch (insertAs) {
        case 'whole':
            break;
        case 'onlyChanges':
            await applyImageMask();
            await makeSmartObject();
            break;
        case 'maskedLayer':
            await applyImageMask();
            break;
        case 'clipboard':
            break;
    }

    // if (insertToClipboard) {
    //     console.log("Copying...");
    //     await copyImageToClipboard();
    // } else {
    //     await renameLayer("✨ ComfyPhotoshop Layer");
    // }

    // WIP: Reload selection if it existed
    if (hadSelection) {
        await loadSelection();
    }

    documentChanged = true;
};

const openSmartObject = async (id) => {
    return window.require("photoshop").core.executeAsModal(
        async () => {
            try {
                await batchPlay([
                    {
                        _obj: "placedLayerEditContents",
                        documentID: id,
                        layerID: id,
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ], {})
            }
            catch (e) {
                console.log("Error whilst opening smart object: " + e)
            }
        },
        {
            commandName: "Open Smart Object",
        }
    );
}

/**
 * Prompts the user to pick two colors in the document:
 * - First click: The reference (skin tone) color.
 * - Second click: The target color to match.
 *
 * This implementation assumes the user uses the Eyedropper tool to set the
 * foreground color. After each color is picked, a simple prompt (or modal)
 * instructs the user to click “OK” to continue.
 *
 * @returns {Promise<Object>} An object with two properties:
 *    - reference: { r, g, b } (the reference color)
 *    - target: { r, g, b } (the target color)
 */
const matchSkinTones = async () => {
    // Note: Replace these simple prompts with your own modal UI if desired.
    // For demonstration, we're using a helper function from utils (assumed to exist)
    // that shows a message and returns a promise which resolves when the user clicks OK.
    // Read the current foreground color (assumes the user has set it via Eyedropper)
    let refColor = app.backgroundColor.rgb;  // returns an object with red, green, blue values

    let targetColor = app.foregroundColor.rgb;

    console.log("Matching skin tones with colors:", refColor, targetColor);
    autoColorMatchSkinTones(refColor, targetColor);

    // Return the colors in a consistent format
    return {
        reference: { r: refColor.red, g: refColor.green, b: refColor.blue },
        target: { r: targetColor.red, g: targetColor.green, b: targetColor.blue }
    };
};


/**
 * Automatically color match skin tones by creating a curves adjustment layer.
 * @param {object} refColor - The reference skin tone, e.g. { r: 220, g: 170, b: 150 }
 * @param {object} targetColor - The average skin tone from the target layer, e.g. { r: 200, g: 150, b: 130 }
 */
const autoColorMatchSkinTones = async (refColorObj, targetColorObj) => {
    // Extract the actual numeric values from the color objects:
    const refColor = refColorObj.desc
      ? { r: refColorObj.desc.red, g: refColorObj.desc.green, b: refColorObj.desc.blue }
      : refColorObj;
    const targetColor = targetColorObj.desc
      ? { r: targetColorObj.desc.red, g: targetColorObj.desc.green, b: targetColorObj.desc.blue }
      : targetColorObj;
    
    // Calculate the per-channel differences
    const deltaR = refColor.r - targetColor.r;
    const deltaG = refColor.g - targetColor.g;
    const deltaB = refColor.b - targetColor.b;
    
    // A helper to clamp values between 0 and 255
    const clamp = (val) => Math.max(0, Math.min(255, Math.round(val)));
    
    // For each channel, shift the midtone (input 128) by the difference
    const redMid = clamp(128 + deltaR);
    const greenMid = clamp(128 + deltaG);
    const blueMid = clamp(128 + deltaB);
    
    console.log(`Creating curves adjustment:
      Red: 128 -> ${redMid}
      Green: 128 -> ${greenMid}
      Blue: 128 -> ${blueMid}`);
    
    // Create a curves adjustment layer with the computed values
    await photoshop.core.executeAsModal(async () => {
        await batchPlay([
          {
            _obj: "make",
            _target: [
              { _ref: "adjustmentLayer" }
            ],
            using: {
              _obj: "adjustmentLayer",
              type: {
                _obj: "curves",
                presetKind: {
                  _enum: "presetKindType",
                  _value: "presetKindCustom"
                },
                curves: [
                  {
                    _obj: "curveChannel",
                    channel: { _enum: "channel", _value: "red" },
                    curve: [
                      { input: 0, output: 0 },
                      { input: 128, output: redMid },
                      { input: 255, output: 255 }
                    ]
                  },
                  {
                    _obj: "curveChannel",
                    channel: { _enum: "channel", _value: "green" },
                    curve: [
                      { input: 0, output: 0 },
                      { input: 128, output: greenMid  },
                      { input: 255, output: 255 }
                    ]
                  },
                  {
                    _obj: "curveChannel",
                    channel: { _enum: "channel", _value: "blue" },
                    curve: [
                      { input: 0, output: 0 },
                      { input: 128, output: blueMid  },
                      { input: 255, output: 255 }
                    ]
                  }
                ]
              }
            },
            _isCommand: true,
            _options: { dialogOptions: "dontDisplay" }
          }
        ], {});
      }, { commandName: "Custom Curves Adjustment" });
      
};



// ────────────────────────────────────────────────────────────────
// Export all functions so that they can be used elsewhere
module.exports = {
    createSelectionChannel,
    saveSelection,
    loadSelection,
    pasteLayer,
    centerImage,
    applyImageMask,
    makeSmartObject,
    copyImageToClipboard,
    renameLayer,
    runStampRemove,
    fastQueue,
    addNoiseLayer,
    insertAsLayer,
    openSmartObject,
    matchSkinTones,
};

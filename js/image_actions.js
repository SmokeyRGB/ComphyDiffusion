// image_actions.js

// Import the proper modules (matching main.js)
const photoshop = require("photoshop");
const app = photoshop.app;
const batchPlay = photoshop.action.batchPlay;
const imaging = require("photoshop").imaging;
const fs = require("uxp").storage.localFileSystem;
const prompt_handeling = require('./prompt_handeling');
const utils = require('./utils');
const pngModule = require("../dist/bundle.js");

// Log to verify correct structure
console.log("Checking module export:", pngModule);

let lastDocumentPixels = null;

// Correctly access encodeToPNG_UPNG from Plugin
const encodeToPNG_UPNG = pngModule.Plugin.encodeToPNG_UPNG;
if (typeof encodeToPNG_UPNG !== "function") {
    throw new Error("encodeToPNG_UPNG is not properly imported!");
}

/* Create a temporary selection channel (using a rectangle then duplicating it) */
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

/* Save the current selection into the temporary channel */
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

/* Reload the temporary selection into the active selection */
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

/* Paste the temporary image file (temp_image_preview.png) as a layer */
const pasteLayer = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            
            // Retrieve the temporary file (creating or overwriting it as needed)
            const tempFile = await dataFolderPath.getEntry("temp_image_preview.png", { overwrite: true });
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

/* Center the active layer on the canvas */
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

/* Apply the active selection as a layer mask */
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

/* Convert the current layer into a Smart Object */
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

/* Copy the active layer to the clipboard then delete it */
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

/* Rename the active layer with the given name */
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

/* Run a series of commands to “stamp remove” (generate inpaint/RGB images) */
const runStampRemove = async () => {
    return photoshop.core.executeAsModal(async () => {
        try {
            const tempFileAlpha = await dataFolderPath.createFile("temp_image_inpaint.png", { overwrite: true });
            const tempFileRGB = await dataFolderPath.createFile("temp_image_rgb.png", { overwrite: true });
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
                        { _ref: "historyState", _offset: -5 }
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

/* Add a noise layer (and then convert it to a smart object) */
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

/* Insert current generated image as... */
const insertAsLayer = async (insertAs, dataFolderPath) => {
    //console.log((insertToClipboard ? "Copying to Clipboard: " : "Inserting as Layer: ") + insertAs);
    let prompt = await prompt_handeling.loadPrompt(dataFolderPath);
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

    // load JSON workflow from workflow_path
    let workflowData = await utils.loadWorkflow(workflow_path);

    // WIP: Embed metadata
    prompt_handeling.setLayerPromptData(app.activeDocument.activeLayers[0].id, prompt, workflowData);

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
    //     
    // }
    await renameLayer("✨ ComfyPhotoshop Layer");


    // WIP: Reload selection if it existed
    if (hadSelection) {
        await loadSelection();
    }

    documentChanged = true;
    console.log("Insertion completed.");
    metadata = prompt_handeling.getLayerPromptData(app.activeDocument.activeLayers[0].id);
    console.log("Metadata for layerID: " + app.activeDocument.activeLayers[0].id + " is: " + metadata);
    console.log(metadata.prompt)
};

/* Open Selected Smart Object*/
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



/**
 * Extracts pixel data from the active Photoshop document.
 *
 * This function runs within a modal execution context to ensure that the
 * operation is performed safely and without interruption. It retrieves the
 * pixel data as a PhotoshopImageData instance.
 *
 * @async
 * @function extractDocumentPixels
 * @returns {Promise<PhotoshopImageData|null>} A promise that resolves to the pixel data of the active document, or null if an error occurs.
 * @throws Will throw an error if the pixel extraction fails.
 */
const extractDocumentPixels = async () => {
    let pixelData = null;
    await photoshop.core.executeAsModal(async () => {
        try {
            // Retrieve pixel data from the active document as a PhotoshopImageData instance.
            pixelData = await imaging.getPixels({});
        } catch (error) {
            console.error("Error extracting document pixels:", error);
            throw error;
        }
    });
    return pixelData;
};


/**
 * Asynchronously retrieves the selection mask of the active document in Photoshop.
 * 
 * This function executes within a modal context to ensure it runs safely within Photoshop's environment.
 * It initializes a mask array with zeros (fully transparent) and then populates it with the grayscale 
 * values of the selection (0–255), where 0 represents no selection and 255 represents fully selected.
 * 
 * @async
 * @function getSelectionMask
 * @returns {Promise<number[][] | null>} A 2D array representing the selection mask with grayscale values (0–255),
 *                                       or null if an error occurs.
 * 
 * @example
 * getSelectionMask().then(mask => {
 *     if (mask) {
 *         console.log("Selection mask retrieved:", mask);
 *     } else {
 *         console.log("Failed to retrieve selection mask.");
 *     }
 * });
 */
const getSelectionMask = async () => {
    let mask = null;
    await photoshop.core.executeAsModal(async () => {
        try {
            const selectionObj = await imaging.getSelection({});
            console.log("Selection object:", selectionObj);
            
            const docWidth = app.activeDocument.width;
            const docHeight = app.activeDocument.height;

            // Initialize mask with zeros (fully transparent)
            mask = new Array(docHeight);
            for (let i = 0; i < docHeight; i++) {
                mask[i] = new Array(docWidth).fill(0);
            }

            // Get selection bounds
            const bounds = selectionObj.sourceBounds; // { left, top, right, bottom }
            const selWidth = bounds.right - bounds.left;
            const selHeight = bounds.bottom - bounds.top;
            console.log("Selection bounds:", bounds);

            // Retrieve selection grayscale data (0–255)
            const data = await selectionObj.imageData.getData({ chunky: true });
            console.log("Selection mask data length:", data.length);

            // Store grayscale values in the mask array
            for (let y = 0; y < selHeight; y++) {
                for (let x = 0; x < selWidth; x++) {
                    const idx = y * selWidth + x;
                    const alphaValue = data[idx]; // 0 (no selection) → 255 (fully selected)
                    
                    const docX = bounds.left + x;
                    const docY = bounds.top + y;

                    if (docX < docWidth && docY < docHeight) {
                        mask[docY][docX] = alphaValue; // Store alpha (0–255)
                    }
                }
            }
        } catch (error) {
            console.error("Error getting selection mask:", error);
            mask = null;
        }
    }, { commandName: "Get Selection Mask" });
    return mask;
};



/**
 * Applies a selection mask to the given pixel data.
 *
 * @param {Uint8Array} pixels - The pixel data of the image in RGBA format.
 * @param {number[][]} mask - A 2D array representing the selection mask with grayscale alpha values (0–255).
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @returns {Uint8Array} The pixel data with the selection mask applied.
 * @throws {Error} If the pixel data is invalid or does not match the expected size.
 */
const applySelectionMask = (pixels, mask, width, height) => {
    if (!pixels || pixels.length !== width * height * 4) {
        throw new Error(`Invalid pixel data. Expected ${width * height * 4}, got ${pixels ? pixels.length : 0}`);
    }

    console.log("Applying selection mask to image:", mask);
    
    // Create a copy for the masked image
    const maskedPixels = new Uint8Array(pixels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4; // RGBA format (4 bytes per pixel)

            // Get the grayscale alpha value (0–255)
            const alphaMaskValue = mask[y]?.[x] ?? 0;

            if (alphaMaskValue > 0) {
                // Blend the selection mask with the existing alpha channel
                const originalAlpha = maskedPixels[index + 3]; // Existing alpha value (0–255)
                const newAlpha = Math.round((originalAlpha * (1 - alphaMaskValue / 255))); // Scale alpha
                
                maskedPixels[index + 3] = newAlpha; // Apply blended alpha
            }
        }
    }

    console.log("Selection mask applied successfully.");
    return maskedPixels;
};




/**
 * Removes the alpha channel from the given pixel buffer and converts it from RGBA to RGB format for further processing down the pipeline.
 *
 * @param {Object} psImageData - The image data object containing the pixel buffer.
 * @returns {Promise<Object>} A promise that resolves to an object containing the width, height, and RGB pixel data.
 * @throws {Error} If the pixel buffer size does not match the expected size.
 */
const removeAlphaFromPixelBuffer = async (psImageData) => {
    const width = psImageData.imageData.width;
    const height = psImageData.imageData.height;

    // Retrieve RGBA data
    const data = await psImageData.imageData.getData({ chunky: true });

    console.log(`Original pixel data length: ${data.length}, expected: ${width * height * 4}`);

    if (data.length !== width * height * 4) {
        throw new Error("Pixel buffer size mismatch. Possible corruption or invalid extraction.");
    }

    // Convert RGBA → RGB
    const rgbData = new Uint8Array(width * height * 3);

    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgbData[j] = data[i];     // Red
        rgbData[j + 1] = data[i + 1]; // Green
        rgbData[j + 2] = data[i + 2]; // Blue
    }

    console.log(`Converted to RGB buffer length: ${rgbData.length}, expected: ${width * height * 3}`);

    return { width, height, rgbData };
};

/**
 * Asynchronously checks if the pixels of the current document have changed.
 *
 * This function retrieves the pixel data of the current document with specified options,
 * encodes the image data to a PNG format with a specified color profile, and compares it
 * with the previously stored pixel data to determine if the document has changed.
 *
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the document pixels have changed.
 */
const documentPixelsChanged = async () => {
    const kSRGBProfile = "sRGB IEC61966-2.1";
    let options = {
        "targetSize": {"height": 100, "width": 100},
        "componentSize": 8,
        "applyAlpha": true,
        "colorProfile": kSRGBProfile};
    
    pixels = await imaging.getPixels(options);
    currentDocumentPixels = await imaging.encodeImageData({
        imageData: pixels.imageData,
        format: "png",
        quality: 1.0,
        colorProfile: kSRGBProfile,
        base64: true
    });

    //console.log(currentDocumentPixels, lastDocumentPixels)
    documentChanged = lastDocumentPixels !== currentDocumentPixels;
    lastDocumentPixels = currentDocumentPixels;

    return documentChanged;
}



/**
 * Extracts the RGBA data from a Photoshop image data object.
 *
 * @param {Object} psImageData - The Photoshop image data object.
 * @returns {Promise<Object>} A promise that resolves to an object containing the width, height, and RGBA data buffer.
 * @throws {Error} Throws an error if the extracted data length does not match the expected size.
 */
const extractRGBAfromPSImageData = async (psImageData) => {
    const width = psImageData.imageData.width;
    const height = psImageData.imageData.height;

    // Retrieve full RGBA data
    const data = await psImageData.imageData.getData({ chunky: true });

    console.log(`Extracted RGBA buffer length: ${data.length}, expected: ${width * height * 4}`);

    if (data.length !== width * height * 4) {
        throw new Error("Pixel buffer size mismatch. Possible corruption or invalid extraction.");
    }

    return { width, height, rgbaData: data };
};



/**
 * Encodes rgbaData to a JPEG format.
 *
 * This function removes the alpha channel from the image data, converts it to RGB,
 * and then encodes it to a JPEG format. The resulting JPEG data is returned as a Uint8Array.
 *
 * @param {Object} rgbaData - The Photoshop image data object to be encoded.
 * @returns {Promise<Uint8Array>} A promise that resolves to the JPEG encoded image data as a Uint8Array.
 * @throws Will throw an error if the encoding process fails.
 */
const encodeToJPEG = async (rgbaData) => {
    try {
        // Convert to RGB (JPEG does not support alpha)
        const { width, height, rgbData } = await removeAlphaFromPixelBuffer(rgbaData);

        // Create valid PhotoshopImageData from the new buffer
        const imageDataNoAlpha = await imaging.createImageDataFromBuffer(rgbData, {
            width: width,
            height: height,
            components: 3, // RGB
            colorSpace: "RGB",
            colorProfile: rgbaData.colorProfile || "sRGB IEC61966-2.1", 
            chunky: true
        });

        console.log("Encoding JPEG with valid image data:", imageDataNoAlpha);

        // Encode to JPEG
        const jpegBase64 = await imaging.encodeImageData({
            imageData: imageDataNoAlpha,
            base64: true
        });

        // Convert base64 to Uint8Array
        const binaryStr = atob(jpegBase64);
        const binaryData = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            binaryData[i] = binaryStr.charCodeAt(i);
        }
        return binaryData;
    } catch (error) {
        console.error("Error encoding JPEG:", error);
        throw error;
    }
};




/**
 * Encodes RGBA data to JPEG format and saves it to the specified file path.
 *
 * @param {Uint8Array} rgbaData - The RGBA data to be encoded to JPEG.
 * @param {string} filePath - The path where the JPEG file will be saved.
 * @returns {Promise<void>} A promise that resolves when the JPEG file has been successfully saved.
 * @throws {Error} Throws an error if there is an issue with encoding or saving the JPEG file.
 */
const encodeAndSaveJPEG = async (rgbaData, filePath) => {
    try {
        const jpegData = await encodeToJPEG(rgbaData);
        console.log("Saving JPEG to:", filePath);
        const file = await dataFolderPath.createFile(filePath, { overwrite: true });
        await file.write(jpegData, { append: false });
        console.log("JPEG saved: " + file.nativePath);
    } catch (error) {
        console.error("Error saving JPEG:", error);
    }
};


/**
 * Encodes an RGBA buffer to a PNG format and saves it to the specified file path.
 *
 * @param {Uint8Array} rgbaBuffer - The RGBA buffer containing image data.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {string} filePath - The file path where the PNG will be saved.
 * @returns {Promise<void>} - A promise that resolves when the PNG is successfully saved.
 * @throws {Error} - Throws an error if encoding or saving the PNG fails.
 */
const encodeAndSavePNG = async (rgbaBuffer, width, height, filePath) => {
    try {
        console.log("Encoding PNG with UPNG.js...", { width, height, bufferLength: rgbaBuffer.length });

        start = performance.now();

        // Encode PNG using bundled UPNG.js
        const pngData = await encodeToPNG_UPNG(rgbaBuffer, width, height);

        console.log("PNG encoded in", performance.now() - start, "ms");

        // Get UXP local filesystem
        const uxp = require("uxp").storage.localFileSystem;

        // Create PNG file in the designated folder
        start = performance.now();
        console.log("Saving PNG to:", dataFolderPath.nativePath);
        const saveFile = await fs.createEntryWithUrl(dataFolderPath.nativePath + "/"+filePath, { overwrite: true });

        // Write the encoded PNG data to the file
        await saveFile.write(pngData, { append: false });

        console.log("PNG saved successfully in", performance.now() - start, "ms:", saveFile.nativePath);

        console.log("PNG saved successfully:", saveFile.nativePath);
    } catch (error) {
        console.error("Error saving PNG:", error);
    }
};

/**
 * Encodes RGBA data to PNG format using Imaging API and temporary document
 *
 * @param {Uint8Array} rgbaBuffer - The RGBA buffer containing masked image data
 * @param {number} width - The width of the image
 * @param {number} height - The height of the image
 * @param {string} filePath - The file path where the PNG will be saved
 * @returns {Promise<void>}
 */
const encodeAndSavePNG_WIP = async (rgbaBuffer, width, height, filePath) => {
    let tempDocId = null;
    let imageData = null;
    const initialDocs = app.documents.map(doc => ({ id: doc._id, doc }));
    
    try {
        const start = performance.now();
        const storage = require("uxp").storage;
        
        // Create image data from buffer
        imageData = await imaging.createImageDataFromBuffer(rgbaBuffer, {
            width,
            height,
            components: 4, // RGBA
            colorSpace: "RGB", // Lowercase
            colorProfile: "sRGB IEC61966-2.1",
            chunky: true
        });

        // Create temporary document (no parameters needed)
        tempDocId = await photoshop.core.createTemporaryDocument({documentID: app.activeDocument.id});
        console.log("Created Temporary Document")
        const newDocs = app.documents.map(doc => ({ id: doc._id, doc }));
        const tempDoc = newDocs.find(d => !initialDocs.map(doc => doc.id).includes(d.id)).doc;
        console.log("Got Temporary Document Reference: ", tempDoc);
        console.log("Layers in Temporary Document: ", tempDoc.layers);


        // Put pixels into temporary document
        try {
            await imaging.putPixels({
                documentID: tempDocId,
                layerID: tempDoc.layers[0].id,
                imageData: imageData,
                replace: true
            });
            console.log("Put Pixels into Temporary Document")
        }
        catch (error) {
            console.error("Error putting pixels into temporary document:", error);
            throw error;
        }
        

        // Create file reference
        const saveFile = await storage.localFileSystem.getFileForSaving(filePath);
        
        // Save as PNG with correct options
        await tempDoc.saveAs(saveFile, {
            format: storage.formats.png,
            pngOptions: {
                compression: 6, // 0-9 (Photoshop standard)
                interlaced: false
            }
        }, false); // asCopy = false

        console.log(`PNG saved in ${performance.now() - start}ms: ${filePath}`);
    } catch (error) {
        console.error("Error saving PNG:", error);
        throw error; // Re-throw for caller handling
    } finally {
        // Clean up resources
        imageData?.dispose();
        if (tempDocId) {
            await photoshop.core.closeDocument(tempDocId, { saving: false });
        }
    }
};

/**
 * Saves an RGBA buffer as a PNG file.
 *
 * @param {Uint8Array} rgbaBuffer - The RGBA buffer containing image data.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {string} filePath - The file path where the PNG will be saved.
 * @returns {Promise<void>} A promise that resolves when the image is saved.
 * @throws {Error} If there is an error during the save process.
 */
const fastSavePng = async (rgbaBuffer, width, height, filePath) => {
    try {
        const saveFile = await dataFolderPath.createFile(filePath, { overwrite: true });
        // const saveToken = fs.createSessionToken(saveFile);
        // const savePath = saveFile.nativePath;
        app.activeDocument.saveAs.png(saveFile, {compression: 6}, false);
    } catch (error) {
        console.error("Error saving PNG:", error);
    }
}


const runNewExport = async (dataFolderPath) => {
    await photoshop.core.executeAsModal(async () => {
        try {
            // 1. Get the selection mask (if any)
            let start = performance.now();
            let mask = await getSelectionMask();
            console.log("Selection mask retrieved in", performance.now() - start, "ms");

            // 2. Extract document pixel data (PhotoshopImageData)
            start = performance.now();
            const imageData = await extractDocumentPixels();
            console.log("Extracted document pixels in", performance.now() - start, "ms");


            // 3. Retrieve raw pixel buffer
            start = performance.now();
            const { width, height, rgbaData } = await extractRGBAfromPSImageData(imageData);
            console.log("Extracted RGBA buffer in", performance.now() - start, "ms");

            //console.log("Extracted RGBA buffer:", rgbaData);

            // 4. Apply selection mask if a valid selection exists.
            start = performance.now();
            let maskedBuffer = null;
            if (mask == null)   {
                //create a mask with all pixels selected
                mask = new Array(height);
                for (let i = 0; i < height; i++) {
                    mask[i] = new Array(width).fill(255);
                }
            }
            if (mask) {
                maskedBuffer = applySelectionMask(rgbaData, mask, width, height);
            }
            console.log("Applied selection mask in", performance.now() - start, "ms");

            // 5. Encode and save images.
            start = performance.now();
            await encodeAndSaveJPEG(imageData, 'temp_image_rgb.jpg');
            console.log("JPEG Export completed in", performance.now() - start, "ms");

            start = performance.now();
            if (maskedBuffer) {
                await encodeAndSavePNG(maskedBuffer, width, height, 'temp_image_inpaint.png');
            }
            else {

                await fastSavePng(rgbaData, width, height, 'temp_image_inpaint.png');
            }
            console.log("PNG Export completed in", performance.now() - start, "ms");

            console.log("New export completed successfully.");
        } catch (error) {
            console.error("Error during new export:", error);
        }
    });
};


/* Export all functions so that they can be used elsewhere */
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
    // Deprecated: runStampRemove,
    addNoiseLayer,
    insertAsLayer,
    openSmartObject,
    matchSkinTones,
    documentPixelsChanged,
	extractDocumentPixels,
	getSelectionMask,
	applySelectionMask,
	encodeAndSaveJPEG,
	encodeAndSavePNG,
	runNewExport
};

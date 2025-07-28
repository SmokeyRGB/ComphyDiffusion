const { localFileSystem: fs } = require('uxp').storage;
const { XMPMeta, XMPConst } = require('uxp').xmp;
const bp = require("photoshop").action.batchPlay;
const psCore = require("photoshop").core;

// Custom XMP namespace for our plugin (keeping original name)
const NS_COMPHYDIFFUSION = "http://ns.comphydiffusion.com/xmp/1.0/";
let namespaceRegistered = false;

// GETTER for document XMP
const getDocumentXMP = () => {
    return bp(
        [
            {
                _obj: "get",
                _target: {
                    _ref: [
                        { _property: "XMPMetadataAsUTF8" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                    ],
                },
            },
        ],
        { synchronousExecution: true }
    )[0].XMPMetadataAsUTF8;
};

// SETTER for document XMP
const setDocumentXMP = async (xmpString) => {
    try {
        await psCore.executeAsModal(
            async () =>
                await bp(
                    [
                        {
                            _obj: "set",
                            _target: [
                                { _property: "XMPMetadataAsUTF8" },
                                { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                            ],
                            to: {
                                _obj: "XMPMetadataAsUTF8",
                                XMPMetadataAsUTF8: xmpString,
                            },
                        },
                    ],
                    { synchronousExecution: false }
                ),
            { commandName: "Setting XMP..." }
        );
    } catch (error) {
        console.error(error);
    }
};

/**
 * Stores prompt and workflow data for a specific layer in document XMP
 * @param {string} layerId - The ID of the layer
 * @param {object} promptData - Prompt data to store
 * @param {object} workflowData - Workflow data to store
 */
async function setLayerPromptData(layerId, promptData, workflowData) {
    try {
        // Check and register namespace once
        if (!namespaceRegistered) {
            const existingURI = XMPMeta.getNamespaceURI("pd");
            if (!existingURI) {
                XMPMeta.registerNamespace(NS_COMPHYDIFFUSION, "pd");
            }
            namespaceRegistered = true;
        }

        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);

        // Store prompt and workflow as JSON strings
        if (promptData) {
            meta.setProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`, JSON.stringify(promptData));
        }
        if (workflowData) {
            meta.setProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`, JSON.stringify(workflowData));
        }

        await setDocumentXMP(meta.serialize());
        return true;
    } catch (error) {
        console.error("Error saving layer prompt data to XMP:", error);
        return false;
    }
}

/**
 * Retrieves prompt and workflow data for a specific layer from document XMP
 * @param {string} layerId - The ID of the layer
 * @returns {object} Object containing prompt and workflow data or null if not found
 */
function getLayerPromptData(layerId) {
    try {
        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);
        
        const result = {};
        const promptJson = meta.getProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`);
        const workflowJson = meta.getProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`);

        if (promptJson) {
            result.prompt = JSON.parse(promptJson);
        }
        if (workflowJson) {
            result.workflow = JSON.parse(workflowJson);
        }

        return Object.keys(result).length ? result : null;
    } catch (error) {
        console.error("Error reading layer prompt data from XMP:", error);
        return null;
    }
}

/**
 * Removes prompt and workflow data for a specific layer from document XMP
 * @param {string} layerId - The ID of the layer
 */
async function removeLayerPromptData(layerId) {
    try {
        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);
        
        meta.deleteProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`);
        meta.deleteProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`);

        await setDocumentXMP(meta.serialize());
        return true;
    } catch (error) {
        console.error("Error removing layer prompt data from XMP:", error);
        return false;
    }
}

// Maintain existing file-based functions exactly as they were
async function readPromptFile() {
    try {
        let promptFile = await dataFolderPath.getEntry('prompt.json');
        let data = await promptFile.read();
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.log("Error parsing JSON, attempting to fix: " + e);
            data = data.replace(/}\s*$/, '');
            try {
                data = JSON.parse(data);
                console.log("Fixed JSON: " + JSON.stringify(data));
            } catch (e) {
                console.log("Error whilst fixing JSON: " + e);
            }
        }
        return promptFile;
    } catch (e) {
        console.log("Error whilst loading prompt File: " + e);
        let promptFile = await dataFolderPath.createFile('prompt.json');
        let data = {
            "positive": "",
            "negative": "bad quality, worst quality, blurry",
            "seed": "16932230013661987000",
            "steps": "15",
            "cfg": "6"
        };
        await promptFile.write(JSON.stringify(data), { append: false });
        console.log("Created new prompt file");
        return promptFile;
    }
}

async function savePrompt() {
    const positive_prompt = document.getElementById('positivePrompt').value;
    const negative_prompt = document.getElementById('negativePrompt').value;
    const seed = document.getElementById('seed').value;
    let steps = document.getElementById('steps').value;
    let cfg = document.getElementById('cfg').value;
    const denoise = Math.round(document.getElementById('denoiseSlider').value * 100) / 100;

    if (steps == '') {
        steps = 20;
    }
    if (cfg == '') {
        cfg = 6;
    }

    try {
        const promptFile = await readPromptFile();
        let prompt = {
            'positive': positive_prompt,
            'negative': negative_prompt,
            'seed': seed,
            'steps': steps,
            'cfg': cfg,
            'denoise': denoise,
        };

        console.log('Prompt saved: ' + JSON.stringify(prompt));
        return await promptFile.write(JSON.stringify(prompt), { append: false, overwrite: true });
    } catch (e) {
        console.log('Prompt could not be saved: ' + e);
    }
}

async function loadPrompt() {
    try {
        const promptFile = await readPromptFile();
        let prompt = JSON.parse(await promptFile.read());
        console.log('Prompt loaded: ' + JSON.stringify(prompt));
        document.getElementById('positivePrompt').value = prompt['positive'];
        document.getElementById('negativePrompt').value = prompt['negative'];
        document.getElementById('seed').value = prompt['seed'];
        document.getElementById('cfg').value = prompt['cfg'];
        document.getElementById('steps').value = prompt['steps'];
        document.getElementById('denoiseSlider').value = prompt['denoise'];
        document.getElementById('denoiseSlider').dispatchEvent(new Event('input'));
        return prompt;
    } catch (e) {
        console.log('Prompt could not be loaded: ' + e);
    }
}

module.exports = {
    readPromptFile,
    savePrompt,
    loadPrompt,
    setLayerPromptData,
    getLayerPromptData,
    removeLayerPromptData
};

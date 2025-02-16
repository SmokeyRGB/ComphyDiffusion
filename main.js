const photoshop = require("photoshop");
const app = photoshop.app;
const storage = require('uxp').storage;
const fs = require('uxp').storage.localFileSystem;
const core = photoshop.core;
const PhotoshopAction = require('photoshop').action;
const { entrypoints } = require('uxp');
const batchPlay = require("photoshop").action.batchPlay;
const seedControl = require('./js/seed_control.js');
const ui = require('./js/ui.js');
const imageActions = require('./js/image_actions.js');
const promptHandling = require('./js/prompt_handeling.js');
const websocketModule = require('./js/websocket.js'); // Import websocket module
const utils = require('./js/utils.js'); // Import utils module

const shell = require("uxp").shell;

let tempFolderPath;
let dataFolderPath;
let pluginFolderPath;

let workflow_path;
let inpaintImagePath

let advancedPrompting = false;

let genCompleted = true;

let updateLivePreview = true;
let animation_state = 0;
let qButtonHoverState = false;

let insertAs = 'whole';
let insertToClipboard = false;

let websocket = null;
let websocket_url = 'ws://127.0.0.1:6789'
let receivedMessages = [];
let cancelInProgress = false;

// NEW: Global document change flag
let documentChanged = false;

//const client = new ComfyUIClient(serverAddress, clientId);

//ONLOAD STUFF
document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOM Loaded. Initializing...")

    tempFolderPath = await fs.getTemporaryFolder()
    dataFolderPath = await fs.getDataFolder();
    pluginFolderPath = await fs.getPluginFolder();
    inpaintImagePath = tempFolderPath.nativePath + '/temp_image_inpaint.png';
    workflow_path = pluginFolderPath.nativePath + '/python_server/workflows/inpaint_sdxl_fast.json';
    console.log("Temporary Folder: " + tempFolderPath.nativePath);
    console.log("Data Folder: " + dataFolderPath.nativePath);
    console.log("Plugin Folder: " + pluginFolderPath.nativePath);

    await promptHandling.loadPrompt(tempFolderPath); // Load prompt first
    seedControl.getRandomInt();
    await ui.updatePreview(center = true);
    //await getGenerationState();
    await websocketModule.connectComfyUIWebsocket(pluginFolderPath);

    console.log("Done.")
}, false);

// NEW: Listen for document change events and set the global flag.
photoshop.action.addNotificationListener([
    { event: "hide" },
    { event: "set" },
    { event: "addTo" },
    { event: "select" },
    { event: "copyToLayer" },
    { event: "delete" },
    { event: "make" },
    { event: "move" }
], (eventName, descriptor) => {
    documentChanged = true;
});

// Reset flag when a new document opens.
photoshop.action.addNotificationListener([{ event: "newDocument" }], () => {
    console.log("New document opened. Creating temporary selection channel.")
    documentChanged = false;
    imageActions.createSelectionChannel();
});

// Make savePrompt available to seed_control.js
window.savePrompt = () => promptHandling.savePrompt(tempFolderPath);

// FUNCTIONS

// Modified helper function to update the status file with a string.


const getEmbeddedPrompt = async () => {

    let selectedLayer = app.activeDocument.activeLayers[0];

    let layerType = selectedLayer.name.split(" | ");
    let prompt;



    let layerTree = await core.getLayerTree({ documentID: app.activeDocument.id })

    try {
        let contents = await core.getLayerGroupContents({ "documentID": app.activeDocument.id, "layerID": selectedLayer.id })
    }
    catch (e) {
        console.log(e)
    }

    console.log("LayerTree: " + layerTree);
    //console.log("Content: " + contents)

    if (selectedLayer != undefined && layerType[0] == "✨ ComfyPhotoshop Layer") {

        await imageActions.openSmartObject(selectedLayer.id)

        let embeddedLayer = app.activeDocument.activeLayers[0];
        let layerName = embeddedLayer.name;
        let prompt_arr = layerName.split("~");

        prompt = {
            'positive': prompt_arr[1],
            'negative': prompt_arr[2],
            'seed': prompt_arr[0],
            'steps': prompt_arr[3],
            'cfg': prompt_arr[4]
        }

        let id = app.activeDocument.id;
        console.log("Got Prompt: " + JSON.stringify(prompt))

        utils.closeDoc(id);

        // Enable Recycle/Copy Buttons
        let buttons = document.getElementsByClassName("promptInfoButtons")
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].disabled = false;
        }

    }
    else {
        console.log("No Layer or no ComfyPhotoshop Layer selected. Couldn't get Prompt Info")

        prompt = {
            'positive': "",
            'negative': "",
            'seed': "",
            'steps': "",
            'cfg': ""
        }

        // Disable Recycle/Copy Buttons
        let buttons = document.getElementsByClassName("promptInfoButtons")
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].disabled = true;
        }
    }


    document.getElementById("posPromptInfo").value = prompt['positive'];
    document.getElementById("negPromptInfo").value = prompt['negative'];
    document.getElementById("seedPromptInfo").value = prompt['seed'];
    document.getElementById("stepsPromptInfo").value = prompt['steps'];
    document.getElementById("cfgPromptInfo").value = prompt['cfg'];

    return prompt
}

// UI MANIPULATION

let generationState = "idle"; // Add a state logger



const run_queue = async () => {
    if (generationState === "running") {
        await cancel_queue();
        return;
    }
    const prompt = await promptHandling.loadPrompt(tempFolderPath);
    if (await utils.selectionActive()) {
        try {
            await imageActions.saveSelection();
            console.log("Selection saved.")
            // NEW: Only proceed if document has been modified.
            if (documentChanged && !app.activeDocument.saved) {
                console.log("Document has been modified. Running stamp remove.")
                await imageActions.runStampRemove();
            }
            
            // Reset flag after processing.
            documentChanged = false;

            // Send image-to-image request to Python server
            const data = {
                command: 'image_to_image',
                input_path: inpaintImagePath,
                positive_prompt: prompt.positive,
                negative_prompt: prompt.negative,
                save_previews: true,
                workflow_path: workflow_path,
            };

            if (websocketModule.getWebsocket() && websocketModule.getWebsocket().readyState === WebSocket.OPEN) {
                try {
                    websocketModule.sendMessage(data);
                    generationState = "running";
                    document.getElementById('queueButton').innerText = "⏳";
                    await ui.updateGenerationStatus("running");
                } catch (e) {
                    console.error("Error sending request to Python server:", e);
                }
            } else {
                console.error("WebSocket not connected");
            }
        } catch (e) {
            console.error("Error during full queue execution:", e);
        }
    } else {
        document.getElementById('selectionErrorDialog').setAttribute('open');
    }
}

const cancel_queue = async () => {
    if (generationState === "running") {
        if (websocketModule.getWebsocket() && websocketModule.getWebsocket().readyState === WebSocket.OPEN) {
            console.log("Canceling");
            websocketModule.sendCancelCommand();
        } else {
            console.log("Error Canceling: Python Server not connected yet. Connect first");
        }
    } else {
        console.log("No generation running.");
    }
}

//####### EVENT TRIGGERS ########

// DOCUMENT

photoshop.action.addNotificationListener([{
    event: "newDocument"
}], () => {
    console.log("New document opened. Creating temporary selection channel.")
    imageActions.createSelectionChannel();
});


// QUEUE
document.getElementById("queueButton").addEventListener('click', run_queue);

document.getElementById("queueButton").addEventListener('mouseover', (event) => {
    qButtonHoverState = true;

    if (generationState === "running") {
        document.getElementById('queueButton').innerText = "❌";
        document.getElementById('queueButton').style.backgroundColor = "#ff4d4d";
    } else {
        document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    }
});

document.getElementById("queueButton").addEventListener('mouseout', (event) => {
    qButtonHoverState = false;

    if (generationState === "running") {
        document.getElementById('queueButton').innerText = "⏳";
        document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    } else {
        document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
});

// PLUGIN UI ///////////////////////////////////

// ENTRYPOINT SETUP
entrypoints.setup({
    panels: {
        vanilla: {
            show(body) {
                let content = document.getElementById('MainPanel')
                body.appendChild(content)
                // put any initialization code for your plugin here.
            },
            invokeMenu(id) {
                const { menuItems } = entrypoints.getPanel("vanilla");
                console.log("Clicked flyout menu: " + id)

                switch (id) {
                    case "about":
                        showAbout();
                        break;
                    case "pluginReload":
                        window.location.reload();
                        break;
                    case "createSelectionChannel":
                        imageActions.createSelectionChannel();
                        break;
                    case "pickWorkflow":
                        fs.getFileForOpening({ types: ["json"] }).then(file => {
                            workflow_path = file.nativePath;
                            console.log("Selected workflow: " + workflow_path);
                        });
                        break;
                    case "addNoiseLayer":
                        imageActions.addNoiseLayer();
                        break;
                    case "matchSkinTones":
                        imageActions.matchSkinTones();
                        break;
                    case "connectComfyUIWebsocket":
                        websocketModule.connectComfyUIWebsocket(pluginFolderPath);
                        break;

                }
                //handleFlyout(id);
            },
            menuItems: [
                { id: "about", label: "About this plugin ❤" },

                { id: "spacer1", label: "-" },
                { id: "pickWorkflow", label: "Select a workflow to run (experimental)" },
                { id: "addNoiseLayer", label: "Add layer to match image noise" },
                { id: "matchSkinTones", label: "Use foreground and background color to match skin tones" },
                { id: "spacer2", label: "-" },
                {
                    label: "Debug options:", submenu:
                        [
                            { id: "pluginReload", label: "Reload plugin" },
                            { id: "createSelectionChannel", label: "Fix not-saving selection" },
                            { id: "connectComfyUIWebsocket", label: "Connect to ComfyUIWebsocket" },
                        ]
                },
            ],
        },
        popout: {
            show(body) {
                let content = document.getElementById('miniQueuePanel')
                body.appendChild(content)
            },
            invokeMenu(id) {

            },
            menuItems: [
                { id: "TestObjectMiniQueue", label: "Just for testing, ignore." },
            ]
        },

        promptInfo: {
            show(body) {
                let content = document.getElementById('promptInfoPanel')
                body.appendChild(content)
            },
            invokeMenu(id) {

            },
            menuItems: [
                { id: "TestObjectPromptInfo", label: "Just for testing, ignore." },
            ]
        },

    }
});

window.require('photoshop').core.suppressResizeGripper(
    {
        "type": "panel",
        "target": "vanilla",
        "value": true
    })


// HIDE 'ABOUT' DIALOG
document.getElementById('hideAbout').addEventListener('click', () => {
    document.getElementById('aboutDialog').removeAttribute('open');
})

//HIDE 'SELECTION ERROR' DIALOG
document.getElementById('hideSelectionError').addEventListener('click', () => {
    document.getElementById('selectionErrorDialog').removeAttribute('open');
})

// HIDE 'PYTHON SERVER ERROR' DIALOG
document.getElementById('hidePythonHookError').addEventListener('click', () => {
    document.getElementById('pythonHookErrorDialog').removeAttribute('open');
})

// INTERVALS ////////////////////////////////////

const generationStateInterval = setInterval(ui.getGenerationState, 2000);

const animationInterval = setInterval(ui.animateObjects, 10)

// GENERATION PREVIEW HANDELING /////////////////

// HIDE / SHOW CHECKBOXES
document.getElementById("advPromptingButton").addEventListener('click', ui.hideAdvPrompts);

// INSERT PREVIEW HANDELING

document.getElementById("insertAsLayer").addEventListener('click', () => {
    console.log("Inserting as Layer");
    imageActions.insertAsLayer(insertAs, tempFolderPath);
});

document.getElementById("copyOrInsert").addEventListener("change", evt => {
    let index = evt.target.selectedIndex;
    switch (index) {
        case 0:
            insertToClipboard = false;
            document.getElementById("maskedLayerOption").style.display = "unset"
            break
        case 1:
            insertToClipboard = true;
            document.getElementById("insertSettings").selectedIndex = 0;
            document.getElementById("maskedLayerOption").style.display = "none"
            break
    }
})

document.getElementById("insertSettings").addEventListener("change", evt => {
    console.log(`Selected item: ${evt.target.selectedIndex}`);
    let index = evt.target.selectedIndex;
    switch (index) {
        case 0:
            insertAs = 'whole'
            break
        case 1:
            insertAs = 'onlyChanges'
            break
        case 2:
            insertAs = 'maskedLayer'
            break
        case 3:
            insertAs = 'clipboard'
            break
        default:
            insertAs = 'whole'
    }
})

// PREVIEW SIZE SLIDER
//document.getElementById("previewSizeSlider").addEventListener('input', ui.changePreviewSize)

// Remove old zoom preview code since we're using the new zoom implementation

// PROMPT HANDELING ///////////////////////////////

// SEED WIDGETS
document.getElementById("randomizeSeed").addEventListener('click', seedControl.getRandomInt);
document.getElementById("seed").addEventListener('load', seedControl.getRandomInt);

// PROMPT WIDGETS
document.getElementById("positivePrompt").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));
document.getElementById("negativePrompt").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));
document.getElementById("steps").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));
document.getElementById("cfg").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));

// SETTINGS 
document.getElementById("steps").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));
document.getElementById("cfg").addEventListener('input', () => promptHandling.savePrompt(tempFolderPath));

// HIDE / SHOW ADVANCED PROMPTS
document.getElementById("advPromptingButton").addEventListener('click', ui.hideAdvPrompts);

// PROMPT INFORMATION WINDOW /////////////////////////

document.getElementById("getEmbeddedPromptInfoButton").addEventListener('click', getEmbeddedPrompt);

// Copy Buttons
document.getElementById("promptInfoCopyPositiveButton").addEventListener('click', function (event) {
    let value = document.getElementById('posPromptInfo').value;
    utils.copyToClipboard(value)
});
document.getElementById("promptInfoCopyNegativeButton").addEventListener('click', function (event) {
    let value = document.getElementById('negPromptInfo').value;
    utils.copyToClipboard(value)
});
document.getElementById("promptInfoCopySeedButton").addEventListener('click', function (event) {
    let value = document.getElementById('seedPromptInfo').value;
    utils.copyToClipboard(value)
});
document.getElementById("promptInfoCopyStepsButton").addEventListener('click', function (event) {
    let value = document.getElementById('stepsPromptInfo').value;
    utils.copyToClipboard(value)
});
document.getElementById("promptInfoCopyCfgButton").addEventListener('click', function (event) {
    let value = document.getElementById('cfgPromptInfo').value;
    utils.copyToClipboard(value)
});

// Recycle Buttons
document.getElementById("promptInfoRecyclePositiveButton").addEventListener('click', function (event) {
    let value = document.getElementById('posPromptInfo').value;
    document.getElementById("positivePrompt").value = value
    promptHandling.savePrompt(tempFolderPath);
});
document.getElementById("promptInfoRecycleNegativeButton").addEventListener('click', function (event) {
    let value = document.getElementById('negPromptInfo').value;
    document.getElementById("negative").value = value
    promptHandling.savePrompt(tempFolderPath);
});
document.getElementById("promptInfoRecycleSeedButton").addEventListener('click', function (event) {
    let value = document.getElementById('seedPromptInfo').value;
    document.getElementById("seed").value = value
    promptHandling.savePrompt(tempFolderPath);
});
document.getElementById("promptInfoRecycleStepsButton").addEventListener('click', function (event) {
    let value = document.getElementById('stepsPromptInfo').value;
    document.getElementById("steps").value = value
    promptHandling.savePrompt(tempFolderPath);
});
document.getElementById("promptInfoRecycleCfgButton").addEventListener('click', function (event) {
    let value = document.getElementById('cfgPromptInfo').value;
    document.getElementById("cfg").value = value
    promptHandling.savePrompt(tempFolderPath);
});

document.getElementById("useAllExtractedPromptInfo").addEventListener('click', function (event) {
    let negative = document.getElementById('negPromptInfo').value;
    let positive = document.getElementById('posPromptInfo').value;
    let seed = document.getElementById('seedPromptInfo').value;
    let steps = document.getElementById('stepsPromptInfo').value;
    let cfg = document.getElementById('cfgPromptInfo').value;

    document.getElementById("positivePrompt").value = positive
    document.getElementById("negativePrompt").value = negative
    document.getElementById("seed").value = seed
    document.getElementById("steps").value = steps
    document.getElementById("cfg").value = cfg

    promptHandling.savePrompt(tempFolderPath);
});


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
const comfyuiWebview = require('./js/webview.js'); // Import comfyuiWebview module
const workflowEditor = require('./js/workflowEditor.js'); // Import workflow editor module

// Import animatePanel from the gsap webpack bundle
const bundle = require('./dist/bundle.js');
const animatePanel = bundle.Plugin.animatePanel;
if (typeof animatePanel !== "function") {
    throw new Error("animatePanel is not properly imported!");
}




const shell = require("uxp").shell;

let tempFolderPath;
let dataFolderPath;
let pluginFolderPath;

let workflow_path = "";
let advancedPrompting = false;
let genCompleted = true;
let autoQueue = false;
let autoRandomizeSeed = false;
let qButtonHoverState = false;
let animation_state = 0;
let updateLivePreview = true;

let insertAs = 'whole';
let insertToClipboard = false;

let websocket = null;
let websocket_url = 'ws://127.0.0.1:6789'
let receivedMessages = [];
let cancelInProgress = false;

// NEW: Global document change flag
let documentChanged = false;

//ONLOAD STUFF
document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOM Loaded. Initializing...")


    tempFolderPath = await fs.getTemporaryFolder()
    dataFolderPath = await fs.getDataFolder();
    pluginFolderPath = await fs.getPluginFolder();
    inpaintImagePath = dataFolderPath.nativePath + '/temp_image_inpaint.png';
    workflow_path = pluginFolderPath.nativePath + '/python_server/workflows/inpaint_sdxl_fast.json';
    console.log("Temporary Folder: " + tempFolderPath.nativePath);
    console.log("Data Folder: " + dataFolderPath.nativePath);
    console.log("Plugin Folder: " + pluginFolderPath.nativePath);

    await promptHandling.loadPrompt(); // Load prompt first
    await ui.updatePreview(center = true);
    await websocketModule.connectComfyUIWebsocket(pluginFolderPath);

    // Load and display saved settings
    const settings = await utils.loadSettings();
    websocket_url = settings.websocketUrl;
    insertAs = settings.insertAs;
    workflowEditor.initPanel();
    await pickWorkflow(settings.workflowPath);

    if (settings.comfyUIPath) {
        await utils.verifyComfyUI(settings.comfyUIPath, dataFolderPath.nativePath + '/Previews');
    }
    

    document.getElementById("insertSettings").selectedIndex = settings.insertAs === 'whole' ? 0 : settings.insertAs === 'onlyChanges' ? 1 : settings.insertAs === 'maskedLayer' ? 2 : 3;

    document.getElementById('comfyUIFolderPath').textContent =
        settings.comfyUIPath || 'No folder selected';
    document.getElementById('comfyUIFolderPath').style.color =
        settings.comfyUIPath ? '#11c711' : '#c71111';

    document.getElementById("websocketUrl").value = websocket_url;

    console.log("Done.")
}, false);

// ON UNLOAD: CLEANUP
photoshop.action.addNotificationListener([{ event: "close" }], (eventName, descriptor) => {
    console.log("Document closed. Cleaning up.")
    utils.pluginCleanup();
    console.log("Cleaned up.")
});

// NEW: Listen for document change events and set the global flag.
photoshop.action.addNotificationListener([
    { event: "hide" },
    { event: "set" },
    { event: "addTo" },
    { event: "select" },
    { event: "copyToLayer" },
    { event: "delete" },
    { event: "make" },
    { event: "move" },
    { event: "newDoc" },
], (eventName, descriptor) => {
    documentChanged = true;
});

photoshop.action.addNotificationListener([
    { event: "historyStateChanged" }
], (eventName, descriptor) => {
    if (autoQueue) {
        documentChanged = true;
        console.log("History state changed. Running autoQueue check.")
        autoQueueCheck().catch(console.error);
    }
}
);

// Reset flag when a new document opens.
photoshop.action.addNotificationListener([{ event: "newDocument" }], () => {
    console.log("New document opened. Creating temporary selection channel.")
    documentChanged = false;
    imageActions.createSelectionChannel();
});

// Make savePrompt available to seed_control.js
window.savePrompt = () => promptHandling.savePrompt();

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

const pickWorkflow = async (override_path = undefined) => {
    if (override_path != undefined && override_path != "") {
        workflow_path = override_path;
        document.getElementById("workflowName").innerText = workflow_path.replace(/^.*[\\\/]/, '');
        document.getElementById("pickWorkflow").style.stroke = "#177fff";
        await workflowEditor.refresh(workflow_path);
        return;
    }
    else {
        fs.getFileForOpening({ types: ["json"] }).then(async file => {
            workflow_path = file.nativePath;
            if (workflow_path != undefined) {
                console.log("Workflow selected: " + workflow_path);
                document.getElementById("pickWorkflow").style.stroke = "#177fff";
                document.getElementById("workflowName").innerText = workflow_path.replace(/^.*[\\\/]/, '');
                utils.saveSettings({ workflowPath: workflow_path });
                await workflowEditor.refresh(workflow_path);
                return;
            }
        });
    }
    
}



document.getElementById("pickWorkflow").addEventListener('click', () => {
    pickWorkflow();
});

// SETTINGS EVENTS

document.getElementById("settingsButton").addEventListener('click', () => {
    document.getElementById("settingsDialog").setAttribute('open');
});
document.getElementById("hideSettings").addEventListener('click', () => {
    document.getElementById("settingsDialog").removeAttribute('open');
});

// ComfyUI Folder Selection
document.getElementById("selectComfyUIFolderButton").addEventListener('click', async () => {
    try {
        const folder = await fs.getFolder();
        if (folder) {
            settings.comfyUIPath = folder.nativePath;
            await utils.saveSettings({comfyUIPath: folder.nativePath});
            document.getElementById('comfyUIFolderPath').textContent = folder.nativePath;
            document.getElementById('comfyUIFolderPath').style.color = '#11c711';
            await utils.verifyComfyUI(folder.nativePath, dataFolderPath.nativePath + '/Previews');
        }
    } catch (error) {
        console.error('Error selecting ComfyUI folder:', error);
        document.getElementById('comfyUIFolderPath').textContent = 'Error: ' + error.message;
        document.getElementById('comfyUIFolderPath').style.color = '#c71111';
    }
});

// WebSocket URL
document.getElementById("connectPythonWebsocketURL").addEventListener('input', (event) => {
    websocket_url = event.target.value;
    console.log("WebSocket URL changed to: " + websocket_url);
}
);
document.getElementById("connectPythonWebsocketButton").addEventListener('click', async () => {
    settings.websocketUrl = websocket_url;
    await utils.saveSettings({websocketUrl: websocket_url});
    console.log("WebSocket URL saved: " + websocket_url);
    websocketModule.connectComfyUIWebsocket(pluginFolderPath);
}
);

// Insert Mode Selection
document.getElementById('fitModeDropdown').addEventListener('change', async (e) => {
    const mode = e.target.value;
    await require('./js/utils').saveSettings({ fitMode: mode });
    ui.applyFitMode(mode);
});







// UI MANIPULATION

let generationState = "idle"; // Add a state logger



const run_queue = async () => {
    const prompt = await promptHandling.loadPrompt();
    if (autoRandomizeSeed) {
        seedControl.getRandomInt();
    }

    if (generationState === "running") {
        await cancel_queue();
        return;
    }

    if (await utils.selectionActive() || autoQueue) {
        try {
            if (workflow_path == "") {
                document.getElementById('queueButton').innerHTML = "Pick Workflow!";
                return; 
            }
            if (await utils.selectionActive()){
                await imageActions.saveSelection();
                console.log("Selection saved.")
            }
            

            // NEW: Only proceed if document has been modified.
            if (documentChanged && !app.activeDocument.saved) {
                console.log("Document has been modified. Running stamp remove.")
                try {
                    // New export routine using Imaging API instead of batchPlay
                    await imageActions.runNewExport(dataFolderPath);
                    
                } catch (error) {
                    console.error("Error during export:", error);
                }
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

};

const cancel_queue = async () => {
    if (!websocketModule.getWebsocket() || websocketModule.getWebsocket().readyState !== WebSocket.OPEN) {
        console.log("Error Canceling: Python Server not connected yet. Connect first");
        return;
    }

    console.log("Canceling");
    websocketModule.sendCancelCommand();
}

//####### EVENT TRIGGERS ########


// QUEUE
const queueButtonClick = async (event) => {
    if (event.shiftKey) {
        autoQueue = !autoQueue;
        console.log("Shift + Click detected. Auto-Queue: " + autoQueue);
        ui.updateAutoQueue(autoQueue);
        
        if (autoQueue) {
            document.getElementById('queueButton').style.backgroundColor = ' rgba(116, 255, 127, 0.21)';
            //document.getElementById('queueButton').disabled = true;
            document.getElementById('queueButton').innerHTML= '<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1" d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6Z"/><path stroke="currentColor" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
        }
        else {
            document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            //document.getElementById('queueButton').disabled = false;
            document.getElementById('queueButton').innerText = 'Queue';
        }
        // activate autoqueue
    }
    else {
        run_queue();
    }
}
document.getElementById("queueButton").addEventListener('click', queueButtonClick);



document.getElementById("queueButton").addEventListener('mouseover', (event) => {
    qButtonHoverState = true;

    if (generationState === "running") {
        document.getElementById('queueButton').innerText = "❌";
        document.getElementById('queueButton').style.backgroundColor = "#ff4d4d";
    } else {
        if(!autoQueue) {
            document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        }
    }
});

document.getElementById("queueButton").addEventListener('mouseout', (event) => {
    qButtonHoverState = false;

    if (generationState === "running") {
        document.getElementById('queueButton').innerText = "⏳";
        document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    } else {
        if(!autoQueue) {
            document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        }
    }
});

// PLUGIN UI ///////////////////////////////////

// ENTRYPOINT SETUP
entrypoints.setup({
    panels: {
        genPreviewPanel: {
            show(body) {
                let content = document.getElementById('MainPanel')
                body.appendChild(content)
                // put any initialization code for your plugin here.
            },
            invokeMenu(id) {
                const { menuItems } = entrypoints.getPanel("genPreviewPanel");
                console.log("Clicked flyout menu: " + id)

                switch (id) {
                    case "about":
                        ui.showAbout();
                        break;
                    case "pluginReload":
                        window.location.reload();
                        break;
                    case "createSelectionChannel":
                        imageActions.createSelectionChannel();
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
                    case "getLayerXMP":
                        let promptData = promptHandling.getLayerPromptData(app.activeDocument.activeLayers[0].id);
                        console.log("Prompt Data: ", promptData);
                        break;
                    case "openPluginDataDir":
                        shell.openPath(dataFolderPath.nativePath);
                        break;

                }
                //handleFlyout(id);
            },
            menuItems: [
                { id: "about", label: "About this plugin ❤" },

                { id: "spacer1", label: "-" },

                { id: "addNoiseLayer", label: "Add layer to match image noise" },
                { id: "matchSkinTones", label: "Use foreground and background color to match skin tones" },
                { id: "spacer2", label: "-" },
                {
                    label: "Debug options:", submenu:
                        [
                            { id: "pluginReload", label: "Reload plugin" },
                            { id: "createSelectionChannel", label: "Fix not-saving selection" },
                            { id: "connectComfyUIWebsocket", label: "Connect to ComfyUIWebsocket" },
                            { id: "getLayerXMP", label: "Get Layers XMP information" },
                            { id: "openPluginDataDir", label: "Open the plugins data directory" },
                        ]
                },
            ],
        },
        promptPanel: {
            show(body) {
                let content = document.getElementById('miniQueuePanel')
                body.appendChild(content)
            },
            async invokeMenu(id) {
                switch (id) {
                    case "cancelQueue":
                        cancel_queue();
                        break;
                    case "setGenCompleted":
                        await ui.updateGenerationStatus("completed");
                        break;
                }
            },
            menuItems: [
                { id: "cancelQueue", label: "Cancel Queue 🚫" },
                { id: "setGenCompleted", label: "Set Generation Completed" }
            ]
        },

        comfyuiWebview: {
            show(body) {
                let content = document.getElementById('comfyuiWebView')
                body.appendChild(content)
            },
            invokeMenu(id) {
                switch (id) {
                    case "placeholder":
                        console.log("Placeholder clicked")
                        break;
                }
            },
            menuItems: [
                { id: "placeholder", label: "Placeholder" },

            ]
        },

        workflowEditor: {
            show(body) {
                body.insertAdjacentHTML('beforeend', `
                    <div id="workflowEditorHeaderBar" style="  display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 8px;
                    background: #2a2a2a;
                    border-radius: 0 0 6px 6px;">
                        <sp-action-button id="toggleAllBtnWrkflw" size="s" quiet>Uncollapse</sp-action-button>
                        <sp-button id="Restore" size="s" style="font-size: 10px;" variant="accent">Use All</sp-button>
                    </div>
                    <div id="workflowEditorRoot"style="padding:10px"></div>
                    `);
                workflowEditor.initPanel();
            },
            invokeMenu(id) {
                switch (id) {
                case 'reload': workflowEditor.refresh(workflow_path); break;
                case 'save':   workflowEditor.closeEditor(); break;
                }
            },
            menuItems: [
                { id: 'reload', label: 'Reload workflow.json' },
                { id: 'save',   label: 'Save & Close' }
            ],
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
        "target": "genPreviewPanel",
        "value": true
    })
window.require('photoshop').core.suppressResizeGripper(
    {
        "type": "panel",
        "target": "comfyuiWebview",
        "value": true
    })
window.require('photoshop').core.suppressResizeGripper(
    {
        "type": "panel",
        "target": "promptPanel",
        "value": true
    })
window.require('photoshop').core.suppressResizeGripper(
    {
        "type": "panel",
        "target": "workflowEditor",
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

const autoQueueCheck = async () => {
    if (autoQueue && generationState === "idle") {
        await run_queue();
    }
    else if (autoQueue && generationState === "running") {
            cancel_queue().then(() => run_queue());
    }
}


// GENERATION PREVIEW HANDELING /////////////////

// INSERT PREVIEW HANDELING

document.getElementById("MainPanel").addEventListener('mouseenter', () => {
    animatePanel(document.getElementById("insertionOptions"), "top", -50, -5, 300)
    animatePanel(document.getElementById("lowerThird"), "bottom", -50, -10, 300)
}
)

document.getElementById("MainPanel").addEventListener('mouseleave', () => {
    animatePanel(document.getElementById("insertionOptions"), "top", -5, -50, 300)
    animatePanel(document.getElementById("lowerThird"), "bottom", -10, -50, 300)
}
)

document.getElementById("insertAsLayer").addEventListener('click', () => {
    console.log("Inserting as Layer");
    imageActions.insertAsLayer(insertAs, dataFolderPath);
});

document.getElementById("denoiseSlider").addEventListener('input', () => {
    document.getElementById("denoiseAmount").innerText = "Denoise: " + Math.round(document.getElementById("denoiseSlider").value * 100) + "%";
    promptHandling.savePrompt();
});


document.getElementById("insertSettings").addEventListener("change", evt => {
    console.log(`Selected insert mode: (${evt.target.selectedIndex}) ${evt.target.value}`);
    let index = evt.target.selectedIndex;
    switch (index) {
        case 0:
            insertAs = 'whole'
            utils.saveSettings({ insertAs: 'whole' });
            break
        case 1:
            insertAs = 'onlyChanges'
            utils.saveSettings({ insertAs: 'onlyChanges' });
            break
        case 2:
            insertAs = 'maskedLayer'
            utils.saveSettings({ insertAs: 'maskedLayer' });
            break
        case 3:
            insertAs = 'clipboard'
            break
        default:
            insertAs = 'whole'
    }
})



// PREVIEW SIZE SLIDER

// PROMPT HANDELING ///////////////////////////////

// SEED WIDGETS
const randomizeSeedClick = async (event) => {
    if (event.shiftKey) {
        autoRandomizeSeed = !autoRandomizeSeed;

        console.log("Shift + Click detected. Auto-Randomize Seed: " + autoRandomizeSeed);
        if (autoRandomizeSeed) {
            document.getElementById('randomizeSeed').style.backgroundColor = ' rgba(116, 255, 127, 0.21)';
        }
        else {
            document.getElementById('randomizeSeed').style.backgroundColor = '';
        }
        return
    }
    else {
        seedControl.getRandomInt();

        const shinyStart = "radial-gradient( rgba(255, 255, 255, 0) 0%, rgba(255,255,255,0.0) 100%)";
        const shinyEnd = "radial-gradient( rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.6) 100%)";

        animatePanel(
            document.getElementById("randomizeSeed"),
            "background",
            shinyStart,
            shinyEnd,
            1000
        );
    }

}

document.getElementById("randomizeSeed").addEventListener('click', randomizeSeedClick);
document.getElementById("seed").addEventListener('load', randomizeSeedClick);

// PROMPT WIDGETS
document.getElementById("positivePrompt").addEventListener('input', () => promptHandling.savePrompt());
document.getElementById("negativePrompt").addEventListener('input', () => promptHandling.savePrompt());
document.getElementById("steps").addEventListener('input', () => promptHandling.savePrompt());
document.getElementById("cfg").addEventListener('input', () => promptHandling.savePrompt());

// SETTINGS 
document.getElementById("steps").addEventListener('input', () => promptHandling.savePrompt());
document.getElementById("cfg").addEventListener('input', () => promptHandling.savePrompt());

// HIDE / SHOW ADVANCED PROMPTS
document.getElementById("advPromptingButton").addEventListener('click', ui.hideAdvPrompts);

// ------- PROMPT INFO PANEL WIRING -------

const promptHandeling = require('./js/prompt_handeling.js');
const refreshPromptPanel = async () => {
  const data = await promptHandling.getCurrentLayerData();
  promptHandeling.renderPromptTiles(data);
};

require('photoshop').action.addNotificationListener([{ event: 'select' }], refreshPromptPanel);
refreshPromptPanel();   // initial paint


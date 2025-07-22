const photoshop = require("photoshop");
const app = photoshop.app;
const websocketModule = require("./websocket");
const ui = require("./ui");

const DEFAULT_SETTINGS = {
    comfyUIPath: '',
    websocketUrl: 'ws://127.0.0.1:6789',
    workflowPath: '',
    insertAs: 'whole',
    fitMode: 'fit-height',
};



const pluginCleanup = async () => { 
    console.log("Cleaning up plugin resources.")
    // TODO: Restore ComfyUI default graph
    //await websocketModule.closeWebsocket();
}

const loadWorkflow = async (workflow_path) => {
    try {
        const workflowFile = await fs.getEntryWithUrl(workflow_path);
        //parse the workflow file as JSON data
        const workflowData = await workflowFile.read();
        return JSON.parse(workflowData);
    } catch (error) {
        console.error('Error loading workflow:', error);
        return {};
    }
}



const loadSettings = async () => {
    try {
        const settingsFilePath = dataFolderPath.nativePath + '\\' + 'pluginSettings.json';
        console.log('Loading settings from:', settingsFilePath);
        const settingsFile = await fs.getEntryWithUrl(settingsFilePath);
        const settingsData = await settingsFile.read();
        const settings = settingsData ? JSON.parse(settingsData) : {};
        console.log('Settings loaded:', settings);
        document.getElementById('fitModeDropdown').value = settings.fitMode || DEFAULT_SETTINGS.fitMode;
        ui.applyFitMode(settings.fitMode || DEFAULT_SETTINGS.fitMode);
        return {...DEFAULT_SETTINGS, ...settings};
    } catch (error) {
        console.error('Error loading settings:', error);
        document.getElementById('fitModeDropdown').value = settings.fitMode || DEFAULT_SETTINGS.fitMode;
        ui.applyFitMode(settings.fitMode || DEFAULT_SETTINGS.fitMode);
        return DEFAULT_SETTINGS;
    }

}

const saveSettings = async (updates) => {
    try {
        // Load current settings
        const currentSettings = await loadSettings();
        
        // Merge updates with current settings
        const mergedSettings = {...currentSettings, ...updates};
        
        // Save merged settings
        const settingsFile = await dataFolderPath.createFile('pluginSettings.json', { overwrite: true });
        await settingsFile.write(JSON.stringify(mergedSettings));
        console.log('Settings updated:', mergedSettings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

const closeDoc = (id) => {
    console.log("Attempting to close documentID: " + id)

    return window.require("photoshop").core.executeAsModal(
        async () => {
            try {
                await batchPlay([
                    {
                        _obj: 'save'
                    },

                    {
                        _obj: "close",
                        documentID: id,
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ], {})
            }
            catch (e) {
                console.log("Error whilst closing document: " + e)
            }
        },
        {
            commandName: "Renamed Layer",
        }
    );
}


const getActiveSelection = async () => {
    selection = app.activeDocument.selection;
    bounds = selection.bounds;
    return selection
}

const selectionActive = async () => {
    let activeSelection;
    try {
        activeSelection = await getActiveSelection();
        if (Number.isInteger(activeSelection.bounds['top'])) {
            activeSelection = true;
        }
    }
    catch (e) {
        console.log("No active selection: " + e)
        activeSelection = false;
    }
    console.log("Selection: " + activeSelection);

    return activeSelection
}

module.exports = {
    pluginCleanup,
    loadWorkflow,
    loadSettings,
    saveSettings,
    getActiveSelection,
    selectionActive,
    closeDoc,
};
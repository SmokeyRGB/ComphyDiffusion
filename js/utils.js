const photoshop = require("photoshop");
const app = photoshop.app;

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.write({ 'text/plain': text });
        console.log("Copied to clipboard:", text);
    } catch (error) {
        console.error("Clipboard error:", error);
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
    copyToClipboard,
    getActiveSelection,
    selectionActive,
    closeDoc,
};
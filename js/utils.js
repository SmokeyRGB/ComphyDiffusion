const photoshop = require("photoshop");
const app = photoshop.app;

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.setContent({ 'text/plain': text });
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

function getRandomInt(min = 0, max = 9999999999) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const activeSelectionBounds = async () => {
    const idDoc = app.activeDocument._id;
    const result = await require("photoshop").action.batchPlay(
        [
            {
                "_obj": "get",
                "_target": [
                    {
                        "_property": "selection"
                    },
                    {
                        "_ref": "document",
                        "_enum": "ordinal",
                        "_value": "targetEnum"
                    }
                ],
                "_options": {
                    "dialogOptions": "dontDisplay"
                }
            }
        ], {
        "synchronousExecution": false,
        "modalBehavior": "fail"
    });
    return result[0].selection.left._value
}

const selectionActive = async () => {
    let activeSelection;
    try {
        activeSelection = await activeSelectionBounds();
        if (Number.isInteger(activeSelection)) {
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
    getRandomInt,
    activeSelectionBounds,
    selectionActive,
    closeDoc,
};
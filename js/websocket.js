const { storage } = require("uxp");
const photoshop = require("photoshop");
const shell = require("uxp").shell;
const fs = require("uxp").storage.localFileSystem;
const ui = require("./ui");
const utils = require("./utils");

let websocket = null;
const websocket_url = 'ws://127.0.0.1:6789';
let reconnectInterval = 5000; // 5 seconds

async function connectComfyUIWebsocket(pluginFolderPath) {
    // If already open or in process of connecting, do not create a new connection.
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket already connected or connecting. State:", websocket.readyState);
        return;
    }

    console.log("Attempting to connect to WebSocket at:", websocket_url);
    websocket = new WebSocket(websocket_url);

    websocket.onopen = evt => {
        console.log("Connected to python server hook");
    };

    websocket.onclose = evt => {
        console.log("WebSocket closed. State:", evt.code, evt.reason);
        websocket = null;
        setTimeout(() => {
            console.log("Reconnecting to WebSocket...");
            connectComfyUIWebsocket(pluginFolderPath);
        }, reconnectInterval);
    };

    websocket.onerror = evt => {
        console.log("WebSocket error encountered:", evt.message || evt);
        document.getElementById('pythonHookErrorDialog').setAttribute('open');
        startPythonServer(pluginFolderPath);
        // Delay reconnection attempt to allow server startup
        setTimeout(() => {
            console.log("Retrying WebSocket connection after error...");
            connectComfyUIWebsocket(pluginFolderPath);
        }, reconnectInterval);
    };

    websocket.onmessage = handleWebsocketMessage;
}

async function handleWebsocketMessage(evt) {
    try {
        const response = JSON.parse(evt.data);
        console.log("Received message from WebSocket:", response);

        if (response.type === 'progress') {
            ui.display_progress(response.progress);
        }
        else if (response.status === 'success') {
            console.log("Image generation completed successfully");
            // Extract the base64 image data from the first image object in the array
            const finalImageData = response.images[0].image_data;
            // Save the image to temporary folder
            await saveImageToTempFolder(finalImageData);
            // Call the new UI function to update the final preview using the image data
            await ui.updateFinalPreviewFromData(finalImageData);
            
            // Save the original image dimensions for later use
            const img = document.querySelector("#generationPreview img");
            img.dataset.originalWidth = img.style.width || img.getBoundingClientRect().width + "px";
            img.dataset.originalHeight = img.style.height || img.getBoundingClientRect().height + "px";

            await ui.updateGenerationStatus("completed");
        } else if (response.status === 'preview') {
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(response.image)));
            await ui.updateTempPreview(base64Image);
        }
        else if (response.status === 'cancelled') {
            ui.resetQueueButton();
            await ui.updateGenerationStatus("completed");
        }
    } catch (e) {
        console.log("Error parsing websocket message:", e);
    }
}

async function saveImageToTempFolder(base64Data) {
    try {
        const tempFolder = await fs.getTemporaryFolder();
        const file = await tempFolder.createFile("temp_image_preview.png", { overwrite: true });
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        await file.write(binaryData);
        console.log("Response image saved to temporary folder:", file.nativePath);
    } catch (error) {
        console.error("Error saving response image:", error);
    }
}

async function startPythonServer(pluginFolderPath) {
    console.log("Starting Python server...");
    shell.openPath(`${pluginFolderPath.nativePath}/python_server/Start Python Server/`);
}

function sendMessage(data) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log("Sending message to WebSocket:", data);
        websocket.send(JSON.stringify(data));
    } else {
        console.error("WebSocket is not open. Cannot send message.");
    }
}

function sendCancelCommand() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log("Sending cancel command to WebSocket");
        websocket.send(JSON.stringify({ command: "cancel" }));
    } else {
        console.error("WebSocket is not open. Cannot send cancel command.");
    }
}

module.exports = {
    connectComfyUIWebsocket,
    startPythonServer,
    getWebsocket: () => websocket,
    sendMessage,
    sendCancelCommand
};
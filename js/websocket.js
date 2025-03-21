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

// Add a helper to convert Uint8Array to base64 string
function uint8ToBase64(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

async function handleWebsocketMessage(evt) {
    let response;
    try {
        // Ensure evt.data is a string
        const dataStr = typeof evt.data === "string" ? evt.data : String(evt.data);
        response = JSON.parse(dataStr);
    } catch (e) {
        console.error("Failed to parse websocket message:", e);
        return;
    }
    console.log("Received message from WebSocket:", response);

    try {
        if (response.type === 'progress') {
            ui.display_progress(response.progress);
        } else if (response.status === 'success') {
            // ...existing success code...
            if (!response.images || response.images.length === 0) {
                console.log("No image data found in response:", response);
                await ui.updateGenerationStatus("completed");
                return;
            }
            const finalImageData = response.images[0].image_data;
            await saveImageToTempFolder(finalImageData);
            await ui.updateFinalPreviewFromData(finalImageData);
            const img = document.querySelector("#generationPreview img");
            img.dataset.originalWidth = img.style.width || img.getBoundingClientRect().width + "px";
            img.dataset.originalHeight = img.style.height || img.getBoundingClientRect().height + "px";
            await ui.updateGenerationStatus("completed");
        } else if (response.status === 'preview') {
            let base64Image;
            // Check if response.image is already a string or an array
            if (typeof response.image === "string") {
                base64Image = response.image;
            } else if (Array.isArray(response.image)) {
                base64Image = uint8ToBase64(new Uint8Array(response.image));
            } else {
                throw new Error("Unexpected image format in preview response");
            }
            await ui.updateTempPreview(base64Image);
        } else if (response.status === 'cancelled') {
            if (response.reason === 'cancelled') {
                document.getElementById('queueButton').disabled = true;
            }
            else if (response.reason === 'completed') {
                document.getElementById('queueButton').disabled = false;
                ui.resetQueueButton();
                await ui.updateGenerationStatus("completed");
            }
            

        }
        else if (response.status === 'error') {
            console.error("Error response from WebSocket:", response);
            await ui.updateGenerationStatus("completed");
        }
    } catch (err) {
        console.error("Error processing websocket response:", err);
    }
}

async function saveImageToTempFolder(base64Data) {
    try {
        const tempFolderPath = await fs.getTemporaryFolder();
        const dataFolderPath = await fs.getDataFolder();
        const file = await dataFolderPath.createFile("temp_image_preview.png", { overwrite: true });
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
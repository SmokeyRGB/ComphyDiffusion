 // Track the panel's current state
 let panelVisible = false;
 let webview;
 let saveFolder = null;

 // Create and configure the webview element
 function createWebview() {
   // Get the panel container element
   const container = document.getElementById("app");
   if (!container) {
     console.error("Panel container not found");
     return;
   }
   
   // Create the webview element
   webview = document.createElement("webview");
   // Set the URL to point to your local ComfyUI web interface
   webview.setAttribute("src", "http://127.0.0.1:8888");
   // Apply full-size styling so it occupies the entire panel
   webview.style.width = "100%";
   webview.style.height = "100%";
   webview.style.border = "none";
   // Append the webview to the container
   container.appendChild(webview);
   console.log("Webview created, configured, and appended to the panel container.");

   // Instead of relying on the "load" event (which may not fire), use polling
   pollForWebviewContent();

   // Add event listener for download events
   webview.addEventListener('will-download', async (event) => {
      event.preventDefault();                   // stop the built-in save dialog

      const { url, filename, mime } = event;

      try {
        const folder = await pickCustomFolder();
        if (!folder) return;                    // user cancelled picker

        // Create or overwrite the file
        const file = await folder.createFile(filename, { overwrite: true });

        // Fetch the file from the server
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();
        await file.write(buffer, { format: fs.formats.binary });

        console.log(`Saved ${filename} to ${folder.nativePath}`);
      } catch (err) {
        console.error('Download failed:', err);
      }
    });
    // Add event listeners for webview load events
   webview.addEventListener("loadstart", console.log("Webview content started loading"));
   webview.addEventListener("loadstop", console.log("Webview content loaded via event listener."));
   webview.addEventListener("loaderror", (e) => {
    console.log(`webview.loaderror ${e.url}, code:${e.code}, message:${e.message}`);
});

 }
 

   // Poll until the webview's contentDocument is available and fully loaded
   function pollForWebviewContent() {
    const maxAttempts = 50; // timeout after ~5 seconds (50 x 100ms)
    let attempts = 0;

    const pollInterval = setInterval(() => {
      attempts++;
      // Check if contentDocument exists and is complete
      if (webview.contentDocument && webview.contentDocument.readyState === "complete") {
        clearInterval(pollInterval);
        console.log("Webview content loaded via polling.");
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.warn("Webview did not finish loading within expected time.");
      }
    }, 100);
  }

 // Function to show the panel
 function showPanel() {
   if (!panelVisible) {
     if (!webview) {
       createWebview();
     }
     // Make sure the webview is visible
     webview.style.display = "block";
     panelVisible = true;
     console.log("ComfyWebPanel is now visible");
   }
 }

 // Function to hide the panel
 function hidePanel() {
   if (panelVisible && webview) {
     webview.style.display = "none";
     panelVisible = false;
     console.log("ComfyWebPanel is now hidden");
   }
 }

 function togglePanel(){
    if (panelVisible){
        hidePanel();
    } else {
        showPanel();
    }
 }

 async function pickCustomFolder() {
  if (saveFolder) return saveFolder;                 // already chosen
  saveFolder = await fs.getFolder();                 // shows folder picker
  return saveFolder;
}


 // UXP lifecycle: initialize the panel when the document is ready.
 document.addEventListener("DOMContentLoaded", () => {
   // For this example, we start with the panel shown.
   showPanel();
 });

 // Expose the panel control functions for other modules if needed.

 module.exports = {
    togglePanel,
};

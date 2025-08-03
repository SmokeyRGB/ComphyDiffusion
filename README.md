# ComPHy

**ComPHy** is a Photoshop plugin that seamlessly connects Adobe Photoshop with a running ComfyUI server. It lets you generate images from text prompts, modify them using inpainting and perform image-to-image processing directly inside Photoshop—making AI-assisted creative workflows faster and more intuitive.

![image](images/ComphyDiffusion.gif)
---

## Features

**Implemented:**  
- **Image Inpainting:** Create a selection and add generated content directly to Photoshop.
- **Real-Time Progress Updates:** A live WebSocket connection provides immediate progress feedback during image generation.
- **Workflow Support:** Use your own workflow to fit your style. Full customization.
- **Fast Workflow Editing:** Use the built-in workflow editor to quickly change node values without accessing the webview.
- **ComfyUI Webview:** Manage your ComfyUI-Backend live inside Photoshop.
- **Prompt/Workflow Recovery:** Forgot what prompt/workflow you used to generate an asset? No worries - you can recover all information used from the Layer.

**Planned:**
- **Batch support:**  Generate multiple assets in one run and choose the one you like best.
---

## Installation

### 1. Clone the Repository

Clone the project repository to your local machine:

```sh
git clone https://github.com/SmokeyRGB/ComphyDiffusion.git
```

### 2. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/en/download) installed, if you haven't already.

Afterwards run `install.bat` in the plugins folder.
This will install all python and javascript dependancies.

### 3. Set Up the ComfyUI Server

Ensure that a ComfyUI server is running and has its ```--listen 8888``` flag set.
The plugin will confirm this automatically when you finished setting it up. (Refer to [Usage](#usage))


### 4. Install the Plugin in Photoshop

1. **Install UXP Developer Tools:**  
   If you haven’t already, install and open the UXP Developer Tools from the Adobe Creative Cloud app (see [Adobe UXP Developer Tool documentation](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/) for details).

2. **Launch Photoshop:**  
   Open Adobe Photoshop.

3. **Add Your Plugin:**
   - Open the UXP Developer Tools.
   - Click **Add Plugin**.
   - Navigate to the folder where you cloned ComPHy to and select `mainfest.json`.
   - Click **Load** next to the newly appeared plugin.
   
**Important:** The plugin needs to be loaded from the UXP Developer Tools every time Photoshop is restarted. This is due to the limitations of Adobe.
---

## Usage
- **Set-Up the Plugin:**  
  You have loaded the plugin into Photoshop, congrats! Now you will probably get an alert that the python server is not running. The plugin will open a folder path for you to start the server. Afterwards, it should connect automatically.
  Click the settings icon in the main panel. Make sure both the ComfyUI path is set and the plugin is connected to the python server.
  After you set the ComfyUI path the first time, the plugin will verify your ComfyUI is listening for commands and the preview files are being correctly saved. You will probably be asked if changes should be made automatically.

- **Queue Generation:**  
  Make a selection in your document and type in a prompt in the Queue panel.
  Now, click the **Queue** button within the plugin UI to start image generation. The plugin will connect to the ComfyUI API via a WebSocket and display live progress updates.

- **Use your own Workflow:**  
  Hover over the main panel (showing the Preview). On the top left a Workflow-Button appears. Click the button and navigate to your .JSON file. 

  **⚠ Workflows MUST be exported using [Workflow]->[Export (API)] inside ComfyUI to work! If you're unsure read more [here](#faq)**

- **Output:**  
  Once the generation completes, you can choose between three different options to insert the result.
  Hover over the main panel (showing the Preview). On the top


---

## FAQ
### I don't get any preview during generation  
  It seems the `latent_preview.py` file in your ComfyUI home directory does not save out preview files.
  Usually, the plugin should correct this itself if you have set the ComfyUI path in the settings.

  First, check in the plugin settings if the ComfyUI path is set. If not, pick the path where you installed your ComfyUI.

  If that does not work, we need to first find your plugins data directory. Click the flyout menu in the preview panel, and click `[Debug Options]->[Open the plugins data directory]`. You will be prompted if you want to open the folder.

  Copy its path.

  Then, open up `.../ComfyUI/latent_preview.py` and search for the line `preview_image = preview_bytes[1]`.

  Below this line, paste the following code, replacing {PluginDataPath} with the path you just copied.
  ```py
  import os
  preview_path = "{PluginDataPath}/Previews/", f"preview.{preview_format.lower()}"
  os.makedirs("{PluginDataPath}/Previews/", exist_ok=True)
  preview_image.save(preview_path)
  ```

  It should work now.


### Why does the workflow I created not work with the plugin?  
  You’ll need the API version of your ComfyUI workflow. This is different to the commonly shared JSON version, it does not included visual information about nodes, etc.
  To get your API JSON:
  1. Turn on the "Enable Dev mode Options" from the ComfyUI settings (via the settings icon)
  2. Load your workflow into ComfyUI
  3. Export your API JSON using the "Save (API format)" button

## Known Bugs
- When changing prompt information before inserting, the changed prompt info is saved, not the prompt you used to generate the asset in the first place

## Contributing

I welcome your feedback, bug reports, and pull requests. Feel free to open an issue or submit a pull request if you have suggestions or improvements.

---

## License

This project is licensed under the [Apache-2.0 License](LICENSE).

---
Happy creating!


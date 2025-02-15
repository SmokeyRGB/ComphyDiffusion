Below is an improved, clear, and updated version of your README that reflects best practices—especially for installation via the UXP Developer Tools.

---

# PhotoshopDiffusion

**PhotoshopDiffusion** is a Photoshop plugin that seamlessly connects Adobe Photoshop with a running ComfyUI server. It lets you generate images from text prompts and perform image-to-image processing directly inside Photoshop—making AI-assisted creative workflows faster and more intuitive.

---

## Features
- **Image Inpainting:** Create a selection and add generated content directly to Photoshop.
- **Image-to-Image Processing:** Enhance or transform images by uploading them along with an associated prompt.
- **Real-Time Progress Updates:** A live WebSocket connection provides immediate progress feedback during image generation.
- **Preview Integration:** Generated image previews are displayed in the plugin UI making it easy to monitor progress.
- **Workflow Support:** Use your own workflow to fit your style.

---

## Installation

### 1. Clone the Repository

Clone the project repository to your local machine:

```sh
git clone https://github.com/yourusername/PhotoshopDiffusion.git
```

### 2. Install Dependencies

Make sure you have [Node.js]() installed, if you haven't already.

Afterwards run `install.bat` in the plugins folder.
This will install all python and javascript dependancies.

### 3. Set Up the ComfyUI Server

Ensure that a ComfyUI server is running (by default at `127.0.0.1:8188`). 

### 4. Install the Plugin in Photoshop

1. **Install UXP Developer Tools:**  
   If you haven’t already, install and open the UXP Developer Tools from the Adobe Creative Cloud app (see [Adobe UXP Developer Tool documentation](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/) for details).

2. **Launch Photoshop:**  
   Open Adobe Photoshop.

3. **Add Your Plugin:**
   - Open the UXP Developer Tools.
   - Click **Add Plugin**.
   - Navigate to the folder where you cloned PhotoshopDiffusion and select `mainfest.json`.
   - Click **Load** next to the newly appeared plugin.
   
**Important:** The plugin needs to be loaded from the UXP Developer Tools every time Photoshop is restarted. This is due to the limitations of Adobe.
---

## Usage

- **Queue Generation:**  


  Click the **Queue** button within the plugin UI to start image generation. The plugin will connect to the ComfyUI server via a WebSocket and display live progress updates.

- **Image-to-Image and Workflow Options:**  
  For image improvements or specific workflows (e.g., inpainting, noise matching), select the appropriate options from the plugin’s menu.

- **Output:**  
  Once the generation completes, images are saved automatically in the `output_images` folder.

---

## Contributing

I welcome your feedback, bug reports, and pull requests. Feel free to open an issue or submit a pull request if you have suggestions or improvements.

---

## License

This project is licensed under the [Apache-2.0 License](LICENSE).

---
Happy creating!


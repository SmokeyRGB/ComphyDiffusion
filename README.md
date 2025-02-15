# PhotoshopDiffusion

PhotoshopDiffusion is a Photoshop plugin designed to seamlessly connect Adobe Photoshop with a running ComfyUI server. It enables prompt-to-image and image-to-image generation directly from within Photoshop using the ComfyUI engine.

## Features

- **Prompt Generation:** Queue text prompts to generate visual outputs by leveraging a ComfyUI server.
- **Image-to-Image Processing:** Upload input images and process them with an associated prompt.
- **Real-Time Progress:** Uses a WebSocket connection ([`websocket.js`](js/websocket.js)) to update progress during generation.
- **Preview Integration:** Displays generated image previews in the plugin UI ([`ui.js`](js/ui.js)).
- **Workflow Support:** Supports different workflows (e.g., inpainting, noise matching) and utilizes configuration files located in the `python_server` folder.

## Installation

1. **Clone the Repository**  
   Clone the project repository to your local machine.

2. **Install Dependencies**  
   Navigate to the project folder and run:
   ```sh
   npm install
   ```
   This installs required dependencies like `socket.io-client` as defined in package.json.

3. **Set Up the ComfyUI Server**  
   Ensure you have a ComfyUI server running (by default on `127.0.0.1:8188`) as described in the python_server documentation. Install Python dependencies by running:
   ```sh
   pip install -r python_server/requirements.txt
   ```

4. **Install the Plugin in Photoshop**  
   Run the provided install.bat script or manually copy the plugin folder into your Photoshop plugins directory, following the guidelines in the Adobe UXP documentation.

5. **Launch Photoshop**  
   Open Photoshop and activate the plugin from the Plugins panel. The plugin UI is defined in index.html and initialized via main.js.

## Usage

- Click the **Queue** button to initiate generation. The plugin connects to the ComfyUI server via a WebSocket (see websocket.js) and displays progress updates.
- For image improvements and workflows, choose the appropriate menu items from the plugin interface.
- On completion, generated images are stored in the output_images folder.

## Contributing

Feel free to open issues or submit pull requests if you have suggestions or improvements.

## License

This project is licensed under the Apache-2.0 license. See LICENSE for details.
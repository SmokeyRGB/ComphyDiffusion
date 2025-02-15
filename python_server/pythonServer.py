import os
import json
from flask import Flask, request, jsonify

# Import the helper function from your comfyui-api module.
# Ensure that the api_helper module is in your PYTHONPATH or in the same directory.
from comfyui_api.api.api_helpers import generate_image_by_prompt_and_image

app = Flask(__name__)

# Define directories (adjust these paths as needed)
PLUGIN_DATA_DIR = r"C:\Users\Sammy\AppData\Local\Temp\Adobe\UXP\PluginsStorage\PHSP\24\Developer\Photoshop-ComfyUI_v2\PluginData"
OUTPUT_DIR = r"C:\Users\Sammy\AppData\Local\Temp\Adobe\UXP\PluginsStorage\PHSP\24\Developer\Photoshop-ComfyUI_v2\Output"

@app.route('/submit', methods=['POST'])
def submit():
    try:
        # Load prompt information from prompt.json
        prompt_path = os.path.join(PLUGIN_DATA_DIR, "prompt.json")
        with open(prompt_path, 'r') as f:
            prompt_data = json.load(f)
        
        # Optionally, load status.json for additional context
        status_path = os.path.join(PLUGIN_DATA_DIR, "status.json")
        with open(status_path, 'r') as f:
            status_data = json.load(f)
        
        # Define the path for the input image (the image to be processed)
        input_image_path = os.path.join(PLUGIN_DATA_DIR, "temp_image_rgb.png")
        if not os.path.exists(input_image_path):
            return jsonify({"error": "Input image (temp_image_rgb.png) not found."}), 400
        
        # Check for mask image availability.
        # The current helper function does not use it, but you can later extend the workflow if needed.
        mask_image_path = os.path.join(PLUGIN_DATA_DIR, "temp_image_inpaint.png")
        if os.path.exists(mask_image_path):
            print("Mask image detected at:", mask_image_path, "but it is not used in the current generation pipeline.")
        
        # Ensure the output directory exists for saving generated images.
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Use the helper function to generate an image based on the prompt and input image.
        # The function signature is:
        # generate_image_by_prompt_and_image(prompt, output_path, input_path, filename, save_previews=False)
        # In this case, we pass the prompt_data dictionary as is.
        input_filename = os.path.basename(input_image_path)
        generate_image_by_prompt_and_image(prompt_data, OUTPUT_DIR, input_image_path, input_filename, save_previews=True)
        
        # After generation is complete, update status.json to indicate completion.
        status_update = {"genCompleted": True}
        with open(status_path, 'w') as f:
            json.dump(status_update, f)
        
        return jsonify({
            "message": "Image generation submitted successfully. Check the output directory for results."
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the Flask server on port 5000 (adjust host/port if needed)
    app.run(port=5000)

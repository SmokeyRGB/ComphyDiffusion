import asyncio
import websockets
import json
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from comfyui_api.utils.actions.prompt_image_to_image import prompt_image_to_image
from comfyui_api.utils.actions.load_workflow import load_workflow
from comfyui_api.api.websocket_api import interupt_prompt
from asyncio import Queue
import time

PLUGIN_DATA_DIR = r"C:\Users\Sammy\AppData\Local\Temp\Adobe\UXP\PluginsStorage\PHSP\24\Developer\Photoshop-ComfyUI_v2\PluginData"
OUTPUT_DIR = r"C:\Users\Sammy\AppData\Local\Temp\Adobe\UXP\PluginsStorage\PHSP\24\Developer\Photoshop-ComfyUI_v2\Output"
PREVIEW_DIR = r"C:\Users\Sammy\AppData\Local\Temp\Adobe\UXP\PluginsStorage\PHSP\24\Developer\Photoshop-ComfyUI_v2\Previews"
COMFYUI_SERVER_ADDRESS = "127.0.0.1:8888"  # newly added constant

class PreviewHandler(FileSystemEventHandler):
    def __init__(self, websocket, queue, loop):
        self.websocket = websocket
        self.queue = queue
        self.loop = loop
        self.last_modified = 0  # For debouncing events
        self.suppress_next = False  # Flag to skip one duplicate event

    def on_modified(self, event):
        # If the flag is set, skip this event and reset the flag.
        if self.suppress_next:
            #print(f"Suppressing duplicate event for: {event.src_path}")
            self.suppress_next = False
            return

        current_time = time.time()
        if current_time - self.last_modified < 0.1:  # Debounce threshold
            return
        self.last_modified = current_time
        
        if event.src_path.lower().endswith((".jpeg", ".jpg", ".png")):
            #print(f"Detected modification in: {event.src_path}")
            asyncio.run_coroutine_threadsafe(self.queue.put(event.src_path), self.loop)

async def send_previews(websocket, queue):
    try:
        while True:
            image_path = await queue.get()
            try:
                # Small delay to ensure the file is fully written
                await asyncio.sleep(0.1)
                with open(image_path, "rb") as f:
                    image_data = f.read()
                #print(f"Sending preview for: {image_path}")
                await websocket.send(json.dumps({"status": "preview", "image": list(image_data)}))
            except Exception as e:
                print(f"Error sending preview: {e}")
            finally:
                queue.task_done()
    except asyncio.CancelledError:
        print("Preview sender task cancelled")
    except Exception as e:
        print(f"Preview sender error: {e}")

def run_comfyui(input_image_path, prompt_data, client_ws, workflow_path, loop):
    """
    Offload ComfyUI processing to a thread. Pass both the client websocket and its event loop.
    """
    images = []
    workflow = load_workflow(workflow_path)
    
    async def inner():
        async for image in prompt_image_to_image(
            workflow,
            input_image_path,
            prompt_data.get("positive", ""),
            prompt_data.get("negative", ""),
            save_previews=True,
            prompt_data=prompt_data,
            client_ws=client_ws,
            loop=loop  # Pass the loop through
        ):
            images.append(image)
        return images

    return asyncio.run(inner())

async def handler(websocket, path=None):
    print("WebSocket client connected")
    loop = asyncio.get_running_loop()  # Get the current event loop
    fs_preview_queue = Queue()
    
    # Set up the file system observer with our preview handler.
    observer = Observer()
    event_handler = PreviewHandler(websocket, fs_preview_queue, loop)
    observer.schedule(event_handler, PREVIEW_DIR, recursive=False)
    observer.start()

    # Start the preview sender task.
    fs_preview_task = asyncio.create_task(send_previews(websocket, fs_preview_queue))

    try:
        async def process_message(message):
            try:
                data = json.loads(message)
            except Exception as e:
                print(f"Failed to decode message: {e}")
                return

            if data.get("command") == "image_to_image":
                # Ensure "type" parameter is valid; default to "input"
                if "type" not in data or data["type"] not in ["input", "temp", "output"]:
                    data["type"] = "input"

                # Before starting a new generation, make sure preview events are enabled.
                event_handler.suppress_next = False

                prompt_path = os.path.join(PLUGIN_DATA_DIR, "prompt.json")
                with open(prompt_path, 'r') as f:
                    prompt_data = json.load(f)
                print("Prompt data:", prompt_data)

                input_image_path = data.get("input_path")
                if not os.path.exists(input_image_path):
                    await websocket.send(json.dumps({"status": "error", "message": "Input image not found"}))
                    return
                
                workflow_path = data.get("workflow_path")

                os.makedirs(OUTPUT_DIR, exist_ok=True)
                print("Loading input image from path:", input_image_path)

                # Offload the heavy ComfyUI processing to a separate thread.
                images = await asyncio.to_thread(
                    run_comfyui, 
                    input_image_path, 
                    prompt_data,
                    websocket,
                    workflow_path,
                    loop  # Pass the loop through
                )

                # Once generation is done, set the flag to skip the final duplicate event.
                event_handler.suppress_next = True

                status_update = {"genCompleted": True}
                status_path = os.path.join(PLUGIN_DATA_DIR, "status.json")
                with open(status_path, 'w') as f:
                    json.dump(status_update, f)

                await websocket.send(json.dumps({
                    "status": "success",
                    "message": "Image generation completed",
                    "images": images
                }))

            elif data.get("command") == "cancel":
                # Handle the cancel command
                print("Received cancel command")
                interupt_prompt(COMFYUI_SERVER_ADDRESS)  # updated call with server address
                await websocket.send(json.dumps({"status": "cancelled", "message": "Generation cancelled"}))

            else:
                await websocket.send(json.dumps({"status": "error", "message": "Unknown command"}))

        async for message in websocket:
            print("Received message:", message)
            asyncio.create_task(process_message(message))
    except websockets.exceptions.ConnectionClosed:
        print("WebSocket client disconnected")
    finally:
        observer.stop()
        observer.join()
        fs_preview_task.cancel()
        await asyncio.gather(fs_preview_task, return_exceptions=True)

async def main():
    async with websockets.serve(handler, "127.0.0.1", 6789):
        print("WebSocket server started on ws://127.0.0.1:6789")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())

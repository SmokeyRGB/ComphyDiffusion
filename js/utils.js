const photoshop = require("photoshop");
const app = photoshop.app;
const websocketModule = require("./websocket");
const ui = require("./ui");

const DEFAULT_SETTINGS = {
    comfyUIPath: '',
    websocketUrl: 'ws://127.0.0.1:6789',
    workflowPath: '',
    insertAs: 'whole',
    fitMode: 'fit-height',
};



const pluginCleanup = async () => { 
    console.log("Cleaning up plugin resources.")
    // TODO: Restore ComfyUI default graph
    //await websocketModule.closeWebsocket();
}

const verifyComfyUI = async (comfyUIPath, previewDir) => {
  console.log('Verifying ComfyUI path:', comfyUIPath);
  try {
    const dirExists = await fs.getEntryWithUrl(comfyUIPath)
      .then(() => true)
      .catch(() => false);
    if (!dirExists) throw new Error('ComfyUI path is invalid');

    await fixComfyUIListener(comfyUIPath);
    await fixComfyUILatentPreview(comfyUIPath, previewDir);
  } catch (err) {
    console.error('Error verifying ComfyUI path:', err);
    alert('Error: ' + err.message);
  }
};

const fixComfyUIListener = async (comfyUIPath) => {
  try {
    const comfyDir = await fs.getEntryWithUrl(comfyUIPath);
    if (!comfyDir) throw new Error('ComfyUI directory not found');

    const entries = await comfyDir.getEntries();
    let runFile = null;
    for (const entry of entries) {
      if (entry.isFile && entry.name.toLowerCase().endsWith('.bat')) {
        const text = await entry.read();           // <- no format argument
        if (/python\.exe\s+main\.py/i.test(text) && !text.includes('--cpu')) {
          runFile = entry;
          break;
        }
      }
    }
    if (!runFile) throw new Error('ComfyUI run file (batch file with "python.exe main.py") not found');

    let content = await runFile.read();
    if (!content.includes('--listen')) {
      return new Promise((resolve, reject) => {
        confirm({
          title: 'ComfyUI Listener Fix',
          message: 'ComfyUI does not listen for incoming connections. \n\nAdd "--listen 8888" automatically?',
          buttons: [
            {
              label: 'Yes',
              onClick: async () => {
                try {
                  const updated = content.replace(
                    /^(.*python\.exe\s+main\.py(?:\s+[^\r\n]*)?)(\r?\n|$)/im,
                    '$1 --listen 8888$2'
                  );
                  await runFile.write(updated);   // <- no format argument
                  console.log('Added --listen 8888 to ComfyUI run file');
                  resolve();
                } catch (e) { reject(e); }
              }
            },
            { label: 'No', onClick: () => reject(new Error('--listen flag missing')) }
          ]
        });
      });
    }
    else {
        console.log('Checked ComfyUI run file, --listen flag present');
        return Promise.resolve();
    }
  } catch (err) {
    console.error('Error fixing ComfyUI listener:', err);
    alert('Error: ' + err.message);
  }
};

/**
 * Makes sure latent_preview.py contains the code that dumps each preview
 * image to disk inside `previewDir`.
 *
 * @param {string} previewDir  Absolute path where previews should be written
 */
const fixComfyUILatentPreview = async (comfyUIDir, previewDir) => {
  try {
    // 1. Locate the file
    filePath = comfyUIDir + '\\latent_preview.py';
    const latentFile = await fs.getEntryWithUrl(filePath)
      .catch(() => null);
    if (!latentFile) {
      throw new Error('latent_preview.py not found in ComfyUI root');
    }

    // 2. Read its content
    let content = await latentFile.read();
    if (!content) {
      throw new Error('latent_preview.py is empty or could not be read');
    }

    // 3. Code we want to insert
    const marker = 'preview_bytes = previewer.decode_latent_to_preview_image(preview_format, x0)';
    const snippet = [
      '            # Save preview bytes to file',
      '            try:',
      '                preview_image = preview_bytes[1]',
      '                import os',
      '                preview_path = os.path.join(' + JSON.stringify(previewDir) + ', f"preview.{preview_format.lower()}")',
      '                os.makedirs(' + JSON.stringify(previewDir) + ', exist_ok=True)',
      '                preview_image.save(preview_path)',
      '            except:',
      '                print("Could not save preview")'
    ].join('\n');

    // 4. Already OK?
    if (content.includes(snippet)) {
      console.log('Checked ComfyUI latent_preview. Latent preview code already present');
      return;
    }
    else {
        console.log('Checked ComfyUI latent_preview. Latent preview code missing, insert?');
    }


    // 5. Ask the user first
    return new Promise(async (resolve, reject) => {
   if (confirm("latent_preview.py is missing preview code. \n\n Add it?")) {
            try {
                if (!content.includes(marker)) {
                  throw new Error('Could not locate insertion point in latent_preview.py');
                }
                const newContent = content.replace(marker, marker + '\n' + snippet);
                await latentFile.write(newContent);
                console.log('Updated latent_preview.py with preview save code');
                resolve();
              } catch (e) {
                reject(e);
              }
            }
            else {
              reject(new Error('User cancelled latent preview code insertion'));
            }
      })

  } catch (err) {
    console.error('Error fixing ComfyUI latent preview:', err);
    alert('Error: ' + err.message);
  }
};



const loadWorkflow = async (workflow_path) => {
    try {
        const workflowFile = await fs.getEntryWithUrl(workflow_path);
        //parse the workflow file as JSON data
        const workflowData = await workflowFile.read();
        return JSON.parse(workflowData);
    } catch (error) {
        console.error('Error loading workflow:', error);
        return {};
    }
}



const loadSettings = async () => {
    try {
        const settingsFilePath = dataFolderPath.nativePath + '\\' + 'pluginSettings.json';
        console.log('Loading settings from:', settingsFilePath);
        const settingsFile = await fs.getEntryWithUrl(settingsFilePath);
        const settingsData = await settingsFile.read();
        const settings = settingsData ? JSON.parse(settingsData) : {};
        console.log('Settings loaded:', settings);
        document.getElementById('fitModeDropdown').value = settings.fitMode || DEFAULT_SETTINGS.fitMode;
        ui.applyFitMode(settings.fitMode || DEFAULT_SETTINGS.fitMode);
        return {...DEFAULT_SETTINGS, ...settings};
    } catch (error) {
        console.error('Error loading settings:', error);
        document.getElementById('fitModeDropdown').value = settings.fitMode || DEFAULT_SETTINGS.fitMode;
        ui.applyFitMode(settings.fitMode || DEFAULT_SETTINGS.fitMode);
        return DEFAULT_SETTINGS;
    }

}

const saveSettings = async (updates) => {
    try {
        // Load current settings
        const currentSettings = await loadSettings();
        
        // Merge updates with current settings
        const mergedSettings = {...currentSettings, ...updates};
        
        // Save merged settings
        const settingsFile = await dataFolderPath.createFile('pluginSettings.json', { overwrite: true });
        await settingsFile.write(JSON.stringify(mergedSettings));
        console.log('Settings updated:', mergedSettings);
    } catch (error) {
        console.error('Error saving settings:', error);
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
    pluginCleanup,
    verifyComfyUI,
    loadWorkflow,
    loadSettings,
    saveSettings,
    getActiveSelection,
    selectionActive,
    closeDoc,
};
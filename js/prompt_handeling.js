const { localFileSystem: fs } = require('uxp').storage;
const { XMPMeta, XMPConst } = require('uxp').xmp;
const bp = require("photoshop").action.batchPlay;
const psCore = require("photoshop").core;


/* * This module handles reading, writing, and managing prompt data for Photoshop layers using XMP metadata.
 * It allows storing and retrieving prompt and workflow data for each layer in the document's XMP metadata.
 * The data is stored under a custom namespace to avoid conflicts with other metadata. */

// Custom XMP namespace for our plugin (keeping original name)
const NS_COMPHYDIFFUSION = "http://ns.comphydiffusion.com/xmp/1.0/";
let namespaceRegistered = false;

// GETTER for document XMP
const getDocumentXMP = () => {
    return bp(
        [
            {
                _obj: "get",
                _target: {
                    _ref: [
                        { _property: "XMPMetadataAsUTF8" },
                        { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                    ],
                },
            },
        ],
        { synchronousExecution: true }
    )[0].XMPMetadataAsUTF8;
};

// SETTER for document XMP
const setDocumentXMP = async (xmpString) => {
    try {
        await psCore.executeAsModal(
            async () =>
                await bp(
                    [
                        {
                            _obj: "set",
                            _target: [
                                { _property: "XMPMetadataAsUTF8" },
                                { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                            ],
                            to: {
                                _obj: "XMPMetadataAsUTF8",
                                XMPMetadataAsUTF8: xmpString,
                            },
                        },
                    ],
                    { synchronousExecution: false }
                ),
            { commandName: "Setting XMP..." }
        );
    } catch (error) {
        console.error(error);
    }
};

/**
 * Stores prompt and workflow data for a specific layer in document XMP
 * @param {string} layerId - The ID of the layer
 * @param {object} promptData - Prompt data to store
 * @param {object} workflowData - Workflow data to store
 */
async function setLayerPromptData(layerId, promptData, workflowData) {
    try {
        // Check and register namespace once
        if (!namespaceRegistered) {
            const existingURI = XMPMeta.getNamespaceURI("pd");
            if (!existingURI) {
                XMPMeta.registerNamespace(NS_COMPHYDIFFUSION, "pd");
            }
            namespaceRegistered = true;
        }

        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);

        // Store prompt and workflow as JSON strings
        if (promptData) {
            meta.setProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`, JSON.stringify(promptData));
        }
        if (workflowData) {
            meta.setProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`, JSON.stringify(workflowData));
        }

        await setDocumentXMP(meta.serialize());
        return true;
    } catch (error) {
        console.error("Error saving layer prompt data to XMP:", error);
        return false;
    }
}

/**
 * Retrieves prompt and workflow data for a specific layer from document XMP
 * @param {string} layerId - The ID of the layer
 * @returns {object} Object containing prompt and workflow data or null if not found
 */
function getLayerPromptData(layerId) {
    try {
        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);
        
        const result = {};
        const promptJson = meta.getProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`);
        const workflowJson = meta.getProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`);

        if (promptJson) {
            result.prompt = JSON.parse(promptJson);
        }
        if (workflowJson) {
            result.workflow = JSON.parse(workflowJson);
        }

        return Object.keys(result).length ? result : null;
    } catch (error) {
        console.error("Error reading layer prompt data from XMP:", error);
        return null;
    }
}

/**
 * Removes prompt and workflow data for a specific layer from document XMP
 * @param {string} layerId - The ID of the layer
 */
async function removeLayerPromptData(layerId) {
    try {
        const xmpString = getDocumentXMP();
        const meta = new XMPMeta(xmpString);
        
        meta.deleteProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Prompt`);
        meta.deleteProperty(NS_COMPHYDIFFUSION, `Layer_${layerId}_Workflow`);

        await setDocumentXMP(meta.serialize());
        return true;
    } catch (error) {
        console.error("Error removing layer prompt data from XMP:", error);
        return false;
    }
}

// ----------  FILE-BASED PROMPT HANDLING FUNCTIONS ----------
// Maintain existing file-based functions exactly as they were
async function readPromptFile() {
    try {
        let promptFile = await dataFolderPath.getEntry('prompt.json');
        let data = await promptFile.read();
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.log("Error parsing JSON, attempting to fix: " + e);
            data = data.replace(/}\s*$/, '');
            try {
                data = JSON.parse(data);
                console.log("Fixed JSON: " + JSON.stringify(data));
            } catch (e) {
                console.log("Error whilst fixing JSON: " + e);
            }
        }
        return promptFile;
    } catch (e) {
        console.log("Error whilst loading prompt File: " + e);
        let promptFile = await dataFolderPath.createFile('prompt.json');
        let data = {
            "positive": "",
            "negative": "bad quality, worst quality, blurry",
            "seed": "16932230013661987000",
            "steps": "15",
            "cfg": "6"
        };
        await promptFile.write(JSON.stringify(data), { append: false });
        console.log("Created new prompt file");
        return promptFile;
    }
}

async function savePrompt() {
    const positive_prompt = document.getElementById('positivePrompt').value;
    const negative_prompt = document.getElementById('negativePrompt').value;
    const seed = document.getElementById('seed').value;
    let steps = document.getElementById('steps').value;
    let cfg = document.getElementById('cfg').value;
    const denoise = Math.round(document.getElementById('denoiseSlider').value * 100) / 100;

    if (steps == '') {
        steps = 20;
    }
    if (cfg == '') {
        cfg = 6;
    }

    try {
        const promptFile = await readPromptFile();
        let prompt = {
            'positive': positive_prompt,
            'negative': negative_prompt,
            'seed': seed,
            'steps': steps,
            'cfg': cfg,
            'denoise': denoise,
        };

        console.log('Prompt saved: ' + JSON.stringify(prompt));
        return await promptFile.write(JSON.stringify(prompt), { append: false, overwrite: true });
    } catch (e) {
        console.log('Prompt could not be saved: ' + e);
    }
}

async function loadPrompt() {
    try {
        const promptFile = await readPromptFile();
        let prompt = JSON.parse(await promptFile.read());
        console.log('Prompt loaded: ' + JSON.stringify(prompt));
        document.getElementById('positivePrompt').value = prompt['positive'];
        document.getElementById('negativePrompt').value = prompt['negative'];
        document.getElementById('seed').value = prompt['seed'];
        document.getElementById('cfg').value = prompt['cfg'];
        document.getElementById('steps').value = prompt['steps'];
        document.getElementById('denoiseSlider').value = prompt['denoise'];
        document.getElementById('denoiseSlider').dispatchEvent(new Event('input'));
        return prompt;
    } catch (e) {
        console.log('Prompt could not be loaded: ' + e);
    }
}

// ----------  HELPERS FOR PROMPT INFO PANEL ----------

const COLLAPSE_KEY = 'ComfyPS_promptCollapse';
let collapseState = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');

const getCurrentLayerData = async () => {
  const selected = require('photoshop').app.activeDocument?.activeLayers[0];
  if (!selected) return null;
  return getLayerPromptData(selected.id);
};

const hydratePromptInfo = (data) => {
  document.getElementById('posPromptInfo').value   = data?.prompt?.positive ?? '';
  document.getElementById('negPromptInfo').value   = data?.prompt?.negative ?? '';
  document.getElementById('seedInfo').value        = data?.prompt?.seed     ?? '';
  document.getElementById('stepsInfo').value       = data?.prompt?.steps    ?? '';
  document.getElementById('cfgInfo').value         = data?.prompt?.cfg      ?? '';
};

const recyclePrompt = (part) => {
  if (part === 'positive') document.getElementById('positivePrompt').value = document.getElementById('posPromptInfo').value;
  if (part === 'negative') document.getElementById('negativePrompt').value = document.getElementById('negPromptInfo').value;
  if (part === 'seed')     document.getElementById('seed').value          = document.getElementById('seedInfo').value;
  // save & sync
  savePrompt();
};

const recycleWorkflow = async (data) => {
  if (!data?.workflow) return;
  // Write workflow JSON to temp file
  const tempFolder = await require('uxp').storage.localFileSystem.getTemporaryFolder();
  const tempFile   = await tempFolder.createFile('tempWorkflow.json', { overwrite: true });
  await tempFile.write(JSON.stringify(data.workflow), { append: false });
  // Tell main to use it
  require('../main').pickWorkflow(tempFile.nativePath);
};

const useAll = async () => {
  const data = await getCurrentLayerData();
  if (!data) return;  
  // Update all UI elements first
  console.log('Using all prompts from layer:', data);
  //recyclePrompt('positive');
  //recyclePrompt('negative');
  //recyclePrompt('seed');
  
    document.getElementById('positivePrompt').value = data.prompt.positive;
    document.getElementById('negativePrompt').value = data.prompt.negative;
    document.getElementById('seed').value        = data.prompt.seed;
    document.getElementById('denoiseSlider').value = data.prompt.denoise || 1; // Default to 0.5 if not set
    document.getElementById('denoiseSlider').dispatchEvent(new Event('input'));
  document.getElementById('steps').value = data.prompt.steps;
  document.getElementById('cfg').value   = data.prompt.cfg;
  
  // Then perform single save after all updates
  await Promise.all([
      //recycleWorkflow(data),
      savePrompt()
  ]);
};

/* promptInfoPanel.js – tile renderer */

function renderPromptTiles(data) {
  const root = document.getElementById('promptTiles');
  root.innerHTML = '';

  // ---- Positive tile ----
  makeTile(root, 'Positive Prompt', data?.prompt?.positive ?? '', (val) => {
    document.getElementById('positivePrompt').value = val;
    
  });

  // ---- Negative tile ----
  makeTile(root, 'Negative Prompt', data?.prompt?.negative ?? '', (val) => {
    document.getElementById('negativePrompt').value = val;
  });

  // ---- Seed tile ----
  makeTile(root, 'Seed', data?.prompt?.seed ?? '', (val) => {
    document.getElementById('seed').value = val;
  });

  // ---- Steps tile ----
  makeTile(root, 'Steps', data?.prompt?.steps ?? '', (val) => {
    document.getElementById('steps').value = val;
  });

  // ---- CFG tile ----
  makeTile(root, 'CFG', data?.prompt?.cfg ?? '', (val) => {
    document.getElementById('cfg').value = val;
  });

  // ---- Spacer ----
  const spacer = document.createElement('div');
  spacer.className = 'tile-spacer';
  root.appendChild(spacer);

  // ---- Workflow tile ----
  makeTile(root, 'Workflow', '↻ Reuse Workflow', async () => {
    if (!data?.workflow) return;
    const tmp = await fs.getTemporaryFolder();
    const f   = await tmp.createFile('tempWorkflow.json', { overwrite: true });
    await f.write(JSON.stringify(data.workflow), { append: false });
    require('../main').pickWorkflow(f.nativePath);
  }, true); // footer-style button

}

function makeTile(root, title, value, onRecycle, footerOnly = false) {
  const tile = document.createElement('div');
  tile.className = collapseState[title] ? 'tile collapsed' : 'tile';

  const hdr = document.createElement('div');
  hdr.className = 'tile-header';
  hdr.innerHTML = `${title} <span>${collapseState[title] ? '▼' : '▲'}</span>`;

  const body = document.createElement('div');
  body.className = 'tile-body';

  if (!footerOnly) {
    const row = document.createElement('div');
    row.className = 'tile-row';

    const inp = document.createElement('sp-textfield');
    inp.setAttribute('multiline', '');
    inp.setAttribute('quiet', '');
    inp.value = value;

    const recBtn = document.createElement('sp-action-button');
    recBtn.setAttribute('size', 's');
    recBtn.setAttribute('quiet', '');
    recBtn.textContent = '♻';
    recBtn.title = 'Reuse ' + title;
    recBtn.addEventListener('click', () => onRecycle(inp.value));

    // const cpyBtn = document.createElement('sp-action-button');
    // cpyBtn.setAttribute('size', 's');
    // cpyBtn.setAttribute('quiet', '');
    // cpyBtn.textContent = '📋';
    // cpyBtn.title = 'Copy ' + title;
    // cpyBtn.addEventListener('click', () => navigator.clipboard.writeText(inp.value));

    row.append(inp, recBtn);

    body.appendChild(row);
  } else {
    const row = document.createElement('div');
    row.className = 'tile-row footer';
    const btn = document.createElement('sp-button');
    btn.setAttribute('size', 's');
    btn.setAttribute('variant', 'accent');
    btn.textContent = value;
    btn.addEventListener('click', onRecycle);
    row.appendChild(btn);
    body.appendChild(row);
  }

  hdr.addEventListener('click', () => {
  const collapsed = tile.classList.toggle('collapsed');
  hdr.querySelector('span').textContent = collapsed ? '▼' : '▲';
  collapseState[title] = collapsed;
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState));
});

  tile.append(hdr, body);
  root.appendChild(tile);
}

/* ---------- collapse / uncollapse all ---------- */
document.getElementById('toggleAllBtn').addEventListener('click', () => {
  const tiles = document.querySelectorAll('.tile');
  const collapsed = tiles[0]?.classList.contains('collapsed') ?? false;
  tiles.forEach(t => {
    if (collapsed) t.classList.remove('collapsed');
    else t.classList.add('collapsed');
  });
  document.getElementById('toggleAllBtn').textContent = collapsed ? 'Collapse' : 'Uncollapse';
});


document.getElementById('prmUseAll').addEventListener('click', useAll);


module.exports = {
    readPromptFile,
    savePrompt,
    loadPrompt,
    setLayerPromptData,
    getLayerPromptData,
    removeLayerPromptData,
    hydratePromptInfo,
    recyclePrompt,
    recycleWorkflow,
    useAll,
    getCurrentLayerData,
    renderPromptTiles
};

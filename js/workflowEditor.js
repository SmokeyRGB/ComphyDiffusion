/*  workflowEditor.js
    A lightweight ComfyUI-workflow editor for the UXP panel
    ------------------------------------------------------
    Exports: openEditor(), closeEditor(), updateWorkflow()
*/

const { localFileSystem: fs } = require('uxp').storage;

let editorPanel;          // <sp-dialog> instance
let workflowObj   = {};   // current JSON in memory
let filePath      = '';   // disk location of the file

/* -------------- helpers ------------------ */
const clone = o => JSON.parse(JSON.stringify(o));

const findNode = (className) =>
  Object.keys(workflowObj).find(id => workflowObj[id].class_type === className);

/* -------------- public API --------------- */
async function openEditor(path) {
  filePath = path || (await fs.getFileForOpening({ types: ['json'] }))?.nativePath;
  if (!filePath) return;
  console.log("Got workflow path: ", filePath)

  const workflowFile = await fs.getEntryWithUrl(filePath);
  workflowObj = JSON.parse(await workflowFile.read());
  console.log("Workflow data loaded:\n", workflowObj)

  if (!editorPanel) createPanel();
  renderPanel();
  editorPanel.setAttribute('open', '');
}

function closeEditor() {
  editorPanel?.removeAttribute('open');
}

async function updateWorkflow(patch) {
  Object.assign(workflowObj, patch);
  const file = await fs.createSessionToken(await fs.getEntryWithUrl(filePath));
  await file.write(JSON.stringify(workflowObj, null, 2));
}

/* -------------- GUI creation ------------- */
function createPanel() {
  document.body.insertAdjacentHTML('beforeend', `
    <sp-dialog id="workflowEditorDialog" style="width: 420px; max-height: 90vh; overflow-y: auto;">
      <sp-heading slot="title">ComfyUI Workflow Editor</sp-heading>
      <sp-body id="workflowEditorBody" style="display:flex; flex-direction: column; gap:10px;"></sp-body>
      <sp-button-group slot="buttongroup">
        <sp-button id="weSaveBtn" variant="cta">Save & Close</sp-button>
        <sp-button id="weCancelBtn">Cancel</sp-button>
      </sp-button-group>
    </sp-dialog>
  `);

  editorPanel = document.getElementById('workflowEditorDialog');
  document.getElementById('weSaveBtn').addEventListener('click', async () => {
    await updateWorkflow({});
    closeEditor();
  });
  document.getElementById('weCancelBtn').addEventListener('click', closeEditor);
}

/* -------------- dynamic UI --------------- */
function renderPanel() {
  const body = document.getElementById('workflowEditorBody');
  body.innerHTML = ''; // clear previous

  /* checkpoint */
  const ckptId = findNode('CheckpointLoaderSimple');
  if (ckptId) {
    const ckptPath = workflowObj[ckptId].inputs.ckpt_name;
    body.insertAdjacentHTML('beforeend', `
      <sp-textfield id="weCkptPath" size="m" value="${ckptPath}">
        <sp-label slot="label">Checkpoint</sp-label>
      </sp-textfield>
    `);
    document.getElementById('weCkptPath').addEventListener('input', e => {
      workflowObj[ckptId].inputs.ckpt_name = e.target.value;
    });
  }

  /* LoRA section */
  const loraId = findNode('Power Lora Loader (rgthree)');
  if (loraId) {
    body.insertAdjacentHTML('beforeend', `<sp-heading size="xs">LoRA Slots</sp-heading>`);

    const loraInputs = workflowObj[loraId].inputs;
    Object.keys(loraInputs)
      .filter(k => k.startsWith('lora_'))
      .forEach(slot => {
        const { lora, strength } = loraInputs[slot];
        body.insertAdjacentHTML('beforeend', `
          <div style="display:flex; gap:8px; align-items:center;">
            <sp-textfield style="flex:1" value="${lora}" data-slot="${slot}" data-field="lora">
              <sp-label slot="label">${slot}</sp-label>
            </sp-textfield>
            <sp-number-field style="width:60px" value="${strength}" min="0" max="2" step="0.05"
              data-slot="${slot}" data-field="strength">
            </sp-number-field>
            <sp-action-button class="weDelLora" data-slot="${slot}">❌</sp-action-button>
          </div>
        `);
      });

    /* event handlers */
    body.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', e => {
        const slot = e.target.dataset.slot;
        const field = e.target.dataset.field;
        workflowObj[loraId].inputs[slot][field] = field === 'strength'
          ? parseFloat(e.target.value)
          : e.target.value;
      });
    });

    body.querySelectorAll('.weDelLora').forEach(btn => {
      btn.addEventListener('click', e => {
        const slot = e.target.dataset.slot;
        delete workflowObj[loraId].inputs[slot];
        renderPanel(); // redraw
      });
    });

    /* add new slot */
    body.insertAdjacentHTML('beforeend', `
      <sp-action-button id="weAddLora" quiet>Add LoRA slot</sp-action-button>
    `);
    document.getElementById('weAddLora').addEventListener('click', () => {
      const keys = Object.keys(loraInputs).filter(k => k.startsWith('lora_'));
      const next = keys.length ? parseInt(keys.pop().split('_')[1]) + 1 : 1;
      loraInputs[`lora_${next}`] = { on: true, lora: '', strength: 1 };
      renderPanel();
    });
  }
}

module.exports = {
    openEditor,
    closeEditor,
    updateWorkflow
};
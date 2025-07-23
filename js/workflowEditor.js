/*  workflowEditor.js  –  Tile-based, always-on panel
    --------------------------------------------------
    The panel now:
    • Reads workflow_path from main.js
    • Renders every node as a small editable tile
    • Writes back on change
*/

const { localFileSystem: fs } = require('uxp').storage;
let workflowObj = {};
let workflowBackup = {};
let lastPath = '';

/* ---------- helpers ---------- */
/* ---------- helper: set nested value ---------- */
function setDeep(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] = cur[keys[i]] || {};
  }
  cur[keys[keys.length - 1]] = value;
}

const save = async () => {
  const file = await fs.getEntryWithUrl(lastPath);
  await file.write(JSON.stringify(workflowObj, null, 2));
};



/* ---------- public ---------- */
async function refresh(workflow_path = "") {
  if (!workflow_path || lastPath === workflow_path) return;
  lastPath = workflow_path;
  const file = await fs.getEntryWithUrl(workflow_path);
  workflowObj = JSON.parse(await file.read());
  workflowBackup = JSON.parse(JSON.stringify(workflowObj)); // deep copy backup
  console.log("Workflow Editor Panel refreshed! Workflow:", workflowObj);
  render();
}

/* ---------- tile renderer ---------- */
function render() {
    const root = document.getElementById('workflowEditorRoot');
    root.style.overflowY = 'auto'; // ensure scrollable
    root.innerHTML = '';

    // Add a warning that this is an experimental feature
    const infoBox = document.createElement('div');
    infoBox.style.marginBottom = '8px';
    root.appendChild(infoBox);
    const warning = document.createElement('a');
    warning.style.left = '8px';
    warning.textContent = '⚠ Experimental feature. Use at your own risk if you know what you are doing. ';
    infoBox.appendChild(warning);

    // Add a restore button to revert to the last saved workflow
    const restoreButton = document.createElement('a');
    restoreButton.textContent = 'Restore';
    restoreButton.style.cssText = 'color: #177fff; cursor: pointer; right: 8px;';
    restoreButton.addEventListener('click', async () => { 
        if (Object.keys(workflowBackup).length === 0) {
        alert('No workflow backup available.');
        return;
        }
        workflowObj = JSON.parse(JSON.stringify(workflowBackup)); // deep copy
        await save();
        render();
    });
    infoBox.appendChild(restoreButton);


  Object.entries(workflowObj).forEach(([id, node]) => {
    const tile = document.createElement('div');
    tile.className = 'tile collapsed';

    /* header */
    const hdr = document.createElement('header');
    hdr.textContent = node.class_type;
    hdr.textContent= node._meta?.title || node.class_type; // use _meta.name if available
    hdr.style.cssText =
      'background:#1b1b1bff;color:#177fffff;padding:6px 8px;cursor:pointer;display:flex;justify-content:space-between;border-radius:6px;';
    hdr.innerHTML += '<span style="font-size:10px;">▼</span>';

    /* body */
    const body = document.createElement('div');
    body.style.cssText = 'display:none;padding:8px;';

    /* helper to create rows */
    function addRow(labelText, value, fullKey) {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cssText = 'display:flex;gap:8px;align-items:center;';

        const isPath =
            typeof value === 'string' &&
            (value.includes('\\') || value.includes('/') || value.endsWith('.safetensors') || value.endsWith('.ckpt') || value.endsWith('.pth') || value.endsWith('.sft'));

        row.innerHTML = `
            <label style="flex:0 0 140px;color:#ccc;">${labelText}</label>
            ${isPath ? '<button class="pickBtn" style="color:#177fff;font-size:14px;width:45px;cursor:pointer;">Pick</button>' : ''}
            <sp-textfield style="width:80%;" size="s" value="${value}"></sp-textfield>

        `;
        const inp = row.querySelector('sp-textfield');

        inp.addEventListener('input', async () => {
            setDeep(workflowObj[id].inputs, fullKey, inp.value)
            await save();
        });

        if (isPath) {
            row.querySelector('.pickBtn').addEventListener('click', async () => {
            const file = await require('uxp').storage.localFileSystem.getFileForOpening({ types: ['safetensors', 'ckpt', 'pth', 'json'] });
            if (file) {
                inp.value = file.nativePath;
                setDeep(workflowObj[id].inputs, fullKey, file.nativePath);
                await save();
            }
            });
        }

        body.appendChild(row);
    }

    /* inputs */
    Object.entries(node.inputs).forEach(([k, v]) => {
      if (Array.isArray(v) || k === 'PowerLoraLoaderHeaderWidget' || k === '➕ Add Lora') return;

      if (typeof v !== 'object' || v === null) {
        addRow(k, v, k);
      } else {
        Object.entries(v).forEach(([subK, subV]) => {
          if (Array.isArray(subV)) return;
          addRow(`${k}.${subK}`, subV, `${k}.${subK}`);
        });
      }
    });

    /* collapse toggle */
    hdr.addEventListener('click', () => {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      hdr.querySelector('span').textContent = isHidden ? '▲' : '▼';
    });

    tile.appendChild(hdr);
    tile.appendChild(body);
    root.appendChild(tile);
  });
}

/* ---------- panel bootstrap ---------- */
function initPanel() {

  document.body.insertAdjacentHTML('beforeend', `
    <div id="workflowEditorRoot" class="tile-container"></div>
  `);


  /* tiny CSS injected once */
  if (!document.getElementById('weCSS')) {
    const style = document.createElement('style');
    style.id = 'weCSS';
    style.textContent = `
    .tile-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;
  font-size: 12px;
  overflow-y: auto;
}

.tile {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 6px;
  width: 100%;
}

.tile header {
  background: #1b1b1bff;
  color: #177fffff;
  padding: 6px 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tile header span {
  font-size: 10px;
}

.tile .inputs {
  padding: 4px;
  display: none;
  
}

.tile:not(.collapsed) .inputs {
  display: block;
}

.tile .row {
  display: flex;
  align-items: center;
}

.tile .row label {
  color: #ccc;
  flex: 0 0 140px;
}

.tile .row input {
  flex: 1;
  background: #111;
  color: #fff;
  border: 1px solid #444;
  border-radius: 3px;
}
    `;
    document.head.appendChild(style);
  }

    // 3. Watch the root element for size changes
  const root = document.getElementById('workflowEditorRoot');
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { height } = entry.contentRect;   // current pixel height of the panel
      root.style.height = `${height}px`;      // keep tiles exactly inside
    }
    console.log("Workflow Editor panel resized to:", root.style.height);
  });
  resizeObserver.observe(document.body);
  //refresh();        // first load
}

module.exports = {
  initPanel,
  refresh,
}
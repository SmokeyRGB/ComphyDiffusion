const { loadPrompt, savePrompt } = require('./prompt_handeling');

const bundle = require('../dist/bundle.js');
const animatePanel = bundle.Plugin.animatePanel;

const seedControl = require('./seed_control');
let autoQueue = false;


const displayHelptext = async () => {
    let enabled = document.getElementById('displayHelptext').checked;

    if (enabled) {
        let helptext_obj = document.getElementById('helpText');
        helptext_obj.style.display = "inherit";

        var img = document.getElementById('generationPreview')

        let doc_width = app.activeDocument.width;
        let doc_height = app.activeDocument.height;

        const prompt = await loadPrompt();
        let steps = prompt['steps'];
        let cfg = prompt['cfg'];

        helptext_obj.innerHTML = "Hints will be shown here. You're doing great!"

        if (cfg < 5) {
            helptext_obj.innerHTML = "Hint: Your cfg is low. <br>If you're not using LCM/Turbo models try raising it."
        } else if (cfg > 7) {
            helptext_obj.innerHTML = "Hint: Your cfg is high. <br>If you're using LCM/Turbo models it should be between 1-2. <br>Otherwise values between 5-7 are recommended."
        } else if (steps < 5) {
            helptext_obj.innerHTML = "Hint: You're generating with a very low amount of steps. <br>If you're using LCM/Turbo models it should be between 5-8. <br>Otherwise values between 15-30 are recommended."
        } else if (steps > 30) {
            helptext_obj.innerHTML = "Hint: You're generating with a high amount of steps. <br>If you're using LCM/Turbo models it should be between 5-8. <br>Otherwise values between 15-30 are recommended."
        } else if (doc_width < 1024 && doc_height < 1024) {
            helptext_obj.innerHTML = "Hint: Your image is pretty small: " + doc_width + "x" + doc_height + "<br>Consider scaling up if you're using SDXL inpaint.";
        } else if (doc_width > 2048 || doc_height > 2048) {
            helptext_obj.innerHTML = "Hint: Your image is pretty big: " + doc_width + "x" + doc_height + " <br>Consider scaling down to decrease generation time, <br>and avoid weird generation output.";
        }
    } else {
        let helptext_obj = document.getElementById('helpText');
        helptext_obj.style.display = "none";
    }
}

const showAbout = () => {
    document.getElementById('aboutDialog').setAttribute('open');
}

const animateObjects = () => {
    if (animation_state >= 240) { animation_state = 1 }

    if (!genCompleted) {
        let rad = animation_state * (2 * Math.PI / 240);
        let cos = Math.cos(rad) + 1
        let size = 12 + Math.floor(3 * cos);
        document.getElementById('queueButton').style.fontSize = `${size}px;`;
        animation_state++;
    } else {
        document.getElementById('queueButton').style.fontSize = '15px'
        animation_state = 1;
    }
}

const changePreviewSize = () => {
    let preview_img = document.querySelector('#generationPreview img');
    let slider_value = document.getElementById('previewSizeSlider').value;

    let fixed_height = 80 * slider_value / 100 + 'vh';

    console.log("Changed preview size to: " + fixed_height);
    document.getElementById('generationPreview').style.height = fixed_height;
}


const hideAdvPrompts = async () => {
    console.log("Toggling advanced prompts");

    // Cache DOM elements
    const negativePrompt = document.getElementById("negativePrompt").parentElement;
    const steps = document.getElementById("steps");
    const cfg = document.getElementById("cfg");
    const seed = document.getElementById("seed");
    const advPromptingBtn = document.getElementById("advPromptingButton");
    const randomizeSeedBtn = document.getElementById("randomizeSeed");
    const queueButton = document.getElementById('queueButtonContainer');
    

    // Toggle advanced state
    advancedPrompting = !advancedPrompting;


    // Toggle visibility
    const display = advancedPrompting ? "flex" : "none";
    negativePrompt.style.display = display;
    steps.style.display = display;
    cfg.style.display = display;
    seed.style.display = display;

    // Toggle prompt border
    document.getElementById("positivePrompt").style.border = advancedPrompting ? "1px solid rgba(66, 158, 89, 0.55)" : "";
    document.getElementById("negativePrompt").style.border = advancedPrompting ? "1px solid rgba(99, 29, 29, 0.65)" : "";

    // Toggle size
    document.getElementById("negativePrompt").size = advancedPrompting ? "s" : "";
    steps.size = advancedPrompting ? "s" : "";
    cfg.size = advancedPrompting ? "s" : "";
    seed.size = advancedPrompting ? "s" : "";
    advPromptingBtn.style.height = advancedPrompting ? "25px" : "30px";
    randomizeSeedBtn.style.height = advancedPrompting ? "25px" : "";

    const qb = document.getElementById("queueButton");
    qb.classList.toggle("seed-look", !advancedPrompting);
    qb.style.display = advancedPrompting ? "none" : "flex";

    // Visual feedback for button
    advPromptingBtn.style.backgroundColor = advancedPrompting ? "#1e1c19" : "";

    // Save prompt state
    await savePrompt(dataFolderPath);
};

document.getElementById("advPromptingButton").addEventListener('click', hideAdvPrompts);

// Updated helper to attach zoom and pan events using mouse events for Spectrum (Adobe UXP)
// In attachZoomPanListeners we use a zoomLevel constant.
// For clarity, we define helper functions below.
const ZOOM_LEVEL = 3;

/* --- clamp helper --- */
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

/* --- compute correct bounds for any zoom level --- */
function clampOffsets(offX, offY, cw, ch, iw, ih) {
  const maxLeft = 0;
  const minLeft = cw - iw;
  const maxTop  = 0;
  const minTop  = ch - ih;

  return {
    offsetX: clamp(offX, minLeft, maxLeft),
    offsetY: clamp(offY, minTop,  maxTop)
  };
}

/* --- set (un-zoomed) size and optionally center --- */
function setNormalSize(img, w, h) {
  const cw = img.parentElement.clientWidth;
  const ch = img.parentElement.clientHeight;

  /* contain-fit scaling */
  const scale = Math.min(cw / w, ch / h);   // keeps aspect ratio
  img.style.width  = w * scale + 'px';
  img.style.height = h * scale + 'px';
  img.style.objectFit = 'contain';          // no stretch
  img.style.left = (cw - w * scale) / 2 + 'px';
  img.style.top  = (ch - h * scale) / 2 + 'px';

  /* store un-zoomed numbers */
  img.dataset.normalW = w;
  img.dataset.normalH = h;
  img.dataset.scale   = 1;
}

/* --- apply zoom keeping pointer fixed --- */
function applyCurrentScale(img, clientX, clientY) {
  const cw = img.parentElement.clientWidth;
  const ch = img.parentElement.clientHeight;

  const nw = Number(img.dataset.normalW);
  const nh = Number(img.dataset.normalH);

  const rect = img.parentElement.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

  const oldScale = Number(img.dataset.scale || 1);
  const newScale = oldScale === 1 ? ZOOM_LEVEL : 1;
  img.dataset.scale = newScale;

  const newW = nw * newScale;
  const newH = nh * newScale;

  /* cursor-relative zoom math */
  const imgX = parseFloat(img.style.left) || 0;
  const imgY = parseFloat(img.style.top)  || 0;

  const newLeft = imgX - (mx - imgX) * (newScale / oldScale - 1);
  const newTop  = imgY - (my - imgY) * (newScale / oldScale - 1);

  img.style.width  = newW + 'px';
  img.style.height = newH + 'px';

  const clamped = clampOffsets(newLeft, newTop, cw, ch, newW, newH);
  img.style.left = clamped.offsetX + 'px';
  img.style.top  = clamped.offsetY + 'px';
}

function attachZoomPanListeners(img) {
  if (img.dataset.listenersAdded) return;
  img.dataset.listenersAdded = 'true';
  img.style.position = 'absolute';

  let dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;

  const start = e => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseLeft = parseFloat(img.style.left) || 0;
    baseTop  = parseFloat(img.style.top)  || 0;
  };

  const move = e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = baseLeft + dx;
    const newTop  = baseTop  + dy;

    const cw = img.parentElement.clientWidth;
    const ch = img.parentElement.clientHeight;
    const iw = parseFloat(img.style.width);
    const ih = parseFloat(img.style.height);

    const clamped = clampOffsets(newLeft, newTop, cw, ch, iw, ih);
    img.style.left = clamped.offsetX + 'px';
    img.style.top  = clamped.offsetY + 'px';
  };

  const end = () => dragging = false;

  img.addEventListener('dblclick', e => applyCurrentScale(img, e.clientX, e.clientY));
  img.addEventListener('pointerdown', start);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
}

async function renderBatchControls(total, batch) {
  const nav  = document.getElementById('batchNav');
  const prev = document.getElementById('batchPrev');
  const next = document.getElementById('batchNext');
  const cnt  = document.getElementById('batchCounter');

  if (total <= 1) { nav.style.display = 'flex'; return; }

  nav.style.display = 'flex';
  cnt.textContent = `1 / ${total}`;


  prev.onclick = () => changeBatch(-1, batch);
  next.onclick = () => changeBatch(1, batch);
}

async function changeBatch(delta, batch) {
  const n = batch.images.length;
  batch.index = (batch.index + delta + n) % n;  // wrap around
  const data = batch.images[batch.index];
  console.log(`Rendering batch ${batch.index + 1} / ${n}`);
  await updateFinalPreviewFromData(data.image_data);
  const img = document.querySelector('#generationPreview img');
  img.dataset.originalWidth = img.style.width || img.getBoundingClientRect().width + 'px';
  img.dataset.originalHeight = img.style.height || img.getBoundingClientRect().height + 'px';
  document.getElementById('batchCounter').textContent = `${batch.index + 1} / ${n}`;
}

/* window resize → keep fit consistent */
window.addEventListener('resize', () => {
  const img = document.querySelector('#generationPreview img');
  if (!img) return;

  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  if (!natW) return;

  const cw = img.parentElement.clientWidth;
  const ch = img.parentElement.clientHeight;

  /* new base size (contain-fit) */
  const baseScale = Math.min(cw / natW, ch / natH);
  const newW = natW * baseScale;
  const newH = natH * baseScale;

  /* store new normal dimensions */
  img.dataset.normalW = natW;
  img.dataset.normalH = natH;

  const currentZoom = Number(img.dataset.scale || 1);

  img.style.width  = newW * currentZoom + 'px';
  img.style.height = newH * currentZoom + 'px';

  if (currentZoom === 1) {
    /* un-zoomed → center */
    img.style.left = (cw - newW) / 2 + 'px';
    img.style.top  = (ch - newH) / 2 + 'px';
  } else {
    /* keep current offset, just clamp it */
    const clamped = clampOffsets(
      parseFloat(img.style.left) || 0,
      parseFloat(img.style.top)  || 0,
      cw, ch,
      newW * currentZoom,
      newH * currentZoom
    );
    img.style.left = clamped.offsetX + 'px';
    img.style.top  = clamped.offsetY + 'px';
  }
});

function applyFitMode(mode) {
    const img = document.querySelector('#generationPreview img');
    if (!img) return;

    const natW = img.naturalWidth, natH = img.naturalHeight;
    if (!natW) return;

    const cw = img.parentElement.clientWidth;
    const ch = img.parentElement.clientHeight;

    let scale;
    switch (mode) {
        case 'fit-height':  scale = ch / natH; break;
        case 'fit-width':   scale = cw / natW; break;
        case 'no-overflow': scale = Math.min(cw / natW, ch / natH); break;
    }

    setNormalSize(img, natW * scale, natH * scale);
}

const updatePreview = async (center = false) => {
  const container = document.getElementById("generationPreview");
  let img = container.querySelector('img');

  if (!img) {
    img = document.createElement('img');
    container.appendChild(img);
  }

  /* keep current position & scale */
  const oldLeft = img.style.left || '';
  const oldTop  = img.style.top  || '';
  const oldW    = img.style.width  || '';
  const oldH    = img.style.height || '';

  img.onload = () => {
    /* only run once per image load */
    if (img.dataset.loaded) return;
    img.dataset.loaded = 'true';

    const scale = Math.min(
      container.clientWidth  / img.naturalWidth,
      container.clientHeight / img.naturalHeight
    );
    setNormalSize(img, img.naturalWidth * scale, img.naturalHeight * scale);
    attachZoomPanListeners(img);
  };

  try {
    const url = updateLivePreview
      ? 'file://' + dataFolderPath.nativePath + '/temp_image_preview.png'
      : "https://i.gifer.com/XVo6.gif";

    /* no style reset, only src swap */
    img.src = url + '?t=' + Date.now();  // cache-bust
  } catch (e) {
    console.log(e);
  }

  displayHelptext();
};


const updateTempPreview = async (previewData) => {
  const container = document.getElementById("generationPreview");
  let img = container.querySelector('img');

  if (!img) {
    img = document.createElement('img');
    container.appendChild(img);
  }

  /* keep current transform */
  const oldLeft = img.style.left || '';
  const oldTop  = img.style.top  || '';

  img.onload = () => {
    if (img.dataset.loaded) return;
    img.dataset.loaded = 'true';

    const scale = Math.min(
      container.clientWidth  / img.naturalWidth,
      container.clientHeight / img.naturalHeight
    );
    setNormalSize(img, img.naturalWidth * scale, img.naturalHeight * scale);
    attachZoomPanListeners(img);
  };

  img.src = `data:image/png;base64,${previewData}`;
  // keep left/top untouched → no jump
};

const updateFinalPreviewFromData = async (base64Data) => {
    const img_container = document.getElementById("generationPreview");
    let img_element = img_container.querySelector('img');
    if (!img_element) {
        img_element = document.createElement('img');
        img_container.appendChild(img_element);
    }
    img_element.onload = () => {
        if (img_element.dataset.loaded) return;
        img_element.dataset.loaded = 'true';

        let scale = Math.min(
            img_container.clientWidth / img_element.naturalWidth,
            img_container.clientHeight / img_element.naturalHeight
        );
        setNormalSize(img_element, img_element.naturalWidth * scale, img_element.naturalHeight * scale);
        attachZoomPanListeners(img_element);
    };
    try {
        if (!base64Data.startsWith("data:")) {
            base64Data = "data:image/png;base64," + base64Data;
        }
        img_element.src = base64Data;
    } catch (error) {
        console.error("Error updating final preview from data:", error);
    }
};

const updateGenerationStatus = async (status) => {
    try {
        let statusFile = await dataFolderPath.createFile('status.json', { overwrite: true });
        const data = { "status": status }; // status is either "completed" or "running"
        await statusFile.write(JSON.stringify(data), { append: false });
        console.log("Updated generation status file to:", status);
        if (status === "completed") {
          if (!autoQueue) {
              document.getElementById('queueButton').innerText = "Queue";
              document.getElementById('queueButton').disabled = false;
              document.getElementById('queueButton').variant = 'cta';
              document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          }
          else {
            document.getElementById('queueButton').style.backgroundColor = ' rgba(116, 255, 127, 0.21)';
            document.getElementById('queueButton').disabled = false;
            document.getElementById('queueButton').innerHTML= '<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1" d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6Z"/><path stroke="currentColor" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
          }
            generationState = "idle";
        }

    } catch (error) {
        console.error("Error updating generation status file:", error);
    }
}

const updateAutoQueue = (newAutoQueue) => {
    autoQueue = newAutoQueue;
}

const getGenerationState = async () => {
    let data;
    try { 
        let statusFile = await dataFolderPath.getEntry('status.json');
        data = JSON.parse((await statusFile.read()));
    }
    catch (e) {
        console.log("Error loading generation status file:", e);
        let statusFile = await dataFolderPath.createFile('status.json');
        data = { "status": "completed" };
        await statusFile.write(JSON.stringify(data), { append: false });
        console.log("Created new status file");
    }

    if (data.status === "completed") {
        // Do not override UI if generation has been completed.
        genCompleted = true;
        updateLivePreview = false;
    } else if (data.status === "running") {
        // Only update UI if not already in running state.
        genCompleted = false;
        updateLivePreview = true;
        document.getElementById('queueButton').innerText = "⏳";
        document.getElementById('loadingSandClock').style.display = 'block';
        document.getElementById('queueButton').variant = 'secondary';
    } else if (data.status === "completed") {
        // Keep UI as is.
    } else {
        // Fallback: set to idle.
        genCompleted = true;
        generationState = "idle";
        updateLivePreview = false;
        document.getElementById('queueButton').innerText = "Queue";
        document.getElementById('queueButton').disabled = false;
        document.getElementById('queueButton').variant = 'cta';
        document.getElementById('loadingSandClock').style.display = 'none';
    }
    
    return genCompleted;
}

const display_progress = async (progress) => {
    let statusFile = await dataFolderPath.getEntry('status.json');
    const data = JSON.parse(await statusFile.read());
    
    const progressElement = document.getElementById('queueButtonProgress');
    
    if (data.status === "running") {
        // Calculate width and left offset so that it grows from the center
        const newWidth = progress;  // in percentage
        const newLeft = (100 - progress) / 2;  // in percentage
        progressElement.style.width = `${newWidth}%`;
        progressElement.style.left = `${newLeft}%`;
        progressElement.style.backgroundColor = "rgb(255, 255, 255, 0.3)";
        progressElement.style.border = "2px solid rgba(23, 127, 255, 0.7)";
        //progressElement.style.backgroundColor = "radial-gradient(circle, rgba(23, 127, 255, 0.2), rgba(23, 127, 255, 0.0))";
        console.log("Progress update:", progress + "% completed");
    } else if (qButtonHoverState) {
        // If hovering/cancel state, fill the button with a red progress bar
        progressElement.style.width = `100%`;
        progressElement.style.left = `0%`;
        progressElement.style.backgroundColor = "#ff4d4d";
    } else {
        // Reset to default state (no progress)
        progressElement.style.width = `0%`;
        progressElement.style.left = `50%`;
        progressElement.style.backgroundColor = "rgba(23, 127, 255, 0.2)";
    }
};

const resetQueueButton = () => {
    generationState = "idle";
    document.getElementById('queueButton').innerText = "Queue";
    document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    const progressElem = document.getElementById('queueButtonProgress');
    if (progressElem) {
        progressElem.style.width = "0%";
        progressElem.style.left = "50%";
    }
};



module.exports = {
    displayHelptext,
    showAbout,
    animateObjects,
    changePreviewSize,
    hideAdvPrompts,
    updatePreview,
    applyFitMode,
    updateTempPreview,
    updateAutoQueue,
    display_progress,
    resetQueueButton,
    updateGenerationStatus,
    getGenerationState,
    renderBatchControls,
    updateFinalPreviewFromData
};

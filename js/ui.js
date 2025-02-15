const { loadPrompt, savePrompt } = require('./prompt_handeling');

const seedControl = require('./seed_control');

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

const hideMaskPreview = () => {
    var x = document.getElementById("maskPreview");
    if (x.style.display === "none") {
        x.style.display = "block";
        let slider_value = document.getElementById('previewSizeSlider').value;
        let preview_size = 10 * (slider_value / 100) + 'em';
        preview_img.style.height = preview_size;
    } else {
        x.style.display = "none";
        let slider_value = document.getElementById('previewSizeSlider').value;
        let preview_size = 15 * (slider_value / 100) + 'em';
        preview_img.style.height = preview_size;
    }
}

const hideAdvPrompts = async () => {
    console.log("Toggling advanced prompts");

    // Cache DOM elements
    const negativePrompt = document.getElementById("negativePrompt").parentElement;
    const steps = document.getElementById("steps");
    const cfg = document.getElementById("cfg");
    const increaseSeedBtn = document.getElementById("increaseSeed");
    const decreaseSeedBtn = document.getElementById("decreaseSeed");
    const advPromptingBtn = document.getElementById("advPromptingButton");

    const queueButton = document.getElementById('queueButtonContainer');
    

    // Toggle advanced state
    advancedPrompting = !advancedPrompting;

    // Move queue button
    queueButton.style.bottom = advancedPrompting ? '181px' : '145px';

    // Toggle visibility
    const display = advancedPrompting ? "flex" : "none";
    negativePrompt.style.display = display;
    steps.style.display = display;
    cfg.style.display = display;
    increaseSeedBtn.style.display = advancedPrompting ? "inline-block" : "none";
    decreaseSeedBtn.style.display = advancedPrompting ? "inline-block" : "none";

    // Visual feedback for button
    advPromptingBtn.style.backgroundColor = advancedPrompting ? "#1e1c19" : "";

    // Save prompt state
    await savePrompt(tempFolderPath);
};

document.getElementById("advPromptingButton").addEventListener('click', hideAdvPrompts);

// Add event listeners for prompt changes
document.getElementById("positivePrompt").addEventListener('input', () => savePrompt(tempFolderPath));
document.getElementById("negativePrompt").addEventListener('input', () => savePrompt(tempFolderPath));
document.getElementById("steps").addEventListener('input', () => savePrompt(tempFolderPath));
document.getElementById("cfg").addEventListener('input', () => savePrompt(tempFolderPath));

// Add event listener for randomizeSeed button
document.getElementById("randomizeSeed").addEventListener('click', seedControl.getRandomInt);

// Updated helper to attach zoom and pan events using mouse events for Spectrum (Adobe UXP)
// In attachZoomPanListeners we use a zoomLevel constant.
// For clarity, we define helper functions below.
const ZOOM_LEVEL = 2.5;
let lastContainerWidth = 0;
let lastContainerHeight = 0;

// Helper: clamp offsets so the image stays within the container.
function clampOffsets(offsetX, offsetY, containerWidth, containerHeight, imgWidth, imgHeight) {
  let minLeft, maxLeft, minTop, maxTop;
  if (imgWidth > containerWidth) {
    minLeft = containerWidth - imgWidth;
    maxLeft = 0;
  } else {
    minLeft = 0;
    maxLeft = containerWidth - imgWidth;
  }
  if (imgHeight > containerHeight) {
    minTop = containerHeight - imgHeight;
    maxTop = 0;
  } else {
    minTop = 0;
    maxTop = containerHeight - imgHeight;
  }
  offsetX = Math.min(Math.max(offsetX, minLeft), maxLeft);
  offsetY = Math.min(Math.max(offsetY, minTop), maxTop);
  return { offsetX, offsetY };
}

function attachZoomPanListeners(img) {
  if (!img || img.getAttribute('data-listeners-added')) return;
  
  console.log("Attaching zoom/pan listeners to image");
  img.setAttribute('data-listeners-added', 'true');

  img.style.position = 'absolute';
  let container = document.getElementById("generationPreview");
  
  // Get base offset for centered image in normal state.
  let baseOffsetX = (container.clientWidth - img.clientWidth) / 2;
  let baseOffsetY = 0;
  img.style.left = baseOffsetX + "px";
  img.style.top = baseOffsetY + "px";

  img.style.pointerEvents = 'auto';
  img.style.cursor = 'grab';
  
  // Use the base offsets as the starting internal offsets.
  let internalOffsetX = baseOffsetX;
  let internalOffsetY = baseOffsetY;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const startDrag = (e) => {
    e.preventDefault();
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    img.style.cursor = 'grabbing';
  };

  const drag = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    internalOffsetX += deltaX;
    internalOffsetY += deltaY;

    // Clamp the offset so the image remains within container boundaries.
    let clamped = clampOffsets(
      internalOffsetX,
      internalOffsetY,
      container.clientWidth,
      container.clientHeight,
      img.clientWidth,
      img.clientHeight
    );
    internalOffsetX = clamped.offsetX;
    internalOffsetY = clamped.offsetY;

    img.style.left = internalOffsetX + 'px';
    img.style.top = internalOffsetY + 'px';
  };

  const endDrag = () => {
    isDragging = false;
    img.style.cursor = 'grab';
  };

  // Double-click toggles zoom.
  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (img.dataset.doubled === "true") {
      // ZOOMING OUT:
      // Compute the pointer's image coordinate in zoomed-in mode:
      // (e.clientX - internalOffsetX) / ZOOM_LEVEL.
      // After zooming out, we want that same coordinate under the pointer.
      internalOffsetX = e.clientX - (e.clientX - internalOffsetX) / ZOOM_LEVEL;
      internalOffsetY = e.clientY - (e.clientY - internalOffsetY) / ZOOM_LEVEL;
      
      // Revert to normal dimensions.
      if (img.dataset.originalWidth) img.style.width = img.dataset.originalWidth;
      if (img.dataset.originalHeight) img.style.height = img.dataset.originalHeight;

      // Clamp after calculating new offsets.
      let clamped = clampOffsets(
        internalOffsetX,
        internalOffsetY,
        container.clientWidth,
        container.clientHeight,
        parseFloat(img.style.width),
        parseFloat(img.style.height)
      );
      internalOffsetX = clamped.offsetX;
      internalOffsetY = clamped.offsetY;
      
      img.style.left = internalOffsetX + 'px';
      img.style.top = internalOffsetY + 'px';
      img.dataset.doubled = "false";
      lastX = e.clientX;
      lastY = e.clientY;
    } else {
      // ZOOMING IN:
      if (!img.dataset.originalWidth) {
        img.dataset.originalWidth = img.style.width || img.getBoundingClientRect().width + "px";
      }
      if (!img.dataset.originalHeight) {
        img.dataset.originalHeight = img.style.height || img.getBoundingClientRect().height + "px";
      }
      let originalW = parseFloat(img.dataset.originalWidth);
      let originalH = parseFloat(img.dataset.originalHeight);
      // Update offset so the clicked point remains fixed.
      internalOffsetX = ZOOM_LEVEL * internalOffsetX - (ZOOM_LEVEL - 1) * e.clientX;
      internalOffsetY = ZOOM_LEVEL * internalOffsetY - (ZOOM_LEVEL - 1) * e.clientY;
      
      img.style.width = (originalW * ZOOM_LEVEL) + "px";
      img.style.height = (originalH * ZOOM_LEVEL) + "px";

      // Clamp the new offsets.
      let clamped = clampOffsets(
        internalOffsetX,
        internalOffsetY,
        container.clientWidth,
        container.clientHeight,
        originalW * ZOOM_LEVEL,
        originalH * ZOOM_LEVEL
      );
      internalOffsetX = clamped.offsetX;
      internalOffsetY = clamped.offsetY;
      
      img.style.left = internalOffsetX + 'px';
      img.style.top = internalOffsetY + 'px';
      img.dataset.doubled = "true";
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  img.removeEventListener('pointerdown', startDrag);
  document.removeEventListener('pointermove', drag);
  document.removeEventListener('pointerup', endDrag);
  img.removeEventListener('dblclick', handleDoubleClick);
  
  img.addEventListener('pointerdown', startDrag);
  document.addEventListener('pointermove', drag);
  document.addEventListener('pointerup', endDrag);
  img.addEventListener('dblclick', handleDoubleClick);
}

const updatePreview = async (center = false) => {
  const img_container = document.getElementById("generationPreview");
  let img_element = img_container.querySelector('img');
  if (!img_element) {
    img_element = document.createElement('img');
    img_container.appendChild(img_element);
  }
  img_element.onload = () => {
    // Scale so the image fills 100% of the container's height.
    let scale = img_container.clientHeight / img_element.naturalHeight;
    let normalWidth = img_element.naturalWidth * scale;
    let normalHeight = img_element.naturalHeight * scale;
    img_element.style.width = normalWidth + "px";
    img_element.style.height = normalHeight + "px";
    // Center horizontally.
    let offsetX = (img_container.clientWidth - normalWidth) / 2;
    let offsetY = 0;
    img_element.style.left = offsetX + "px";
    img_element.style.top = offsetY + "px";
    // Save these as the normal dimensions.
    img_element.dataset.originalWidth = normalWidth + "px";
    img_element.dataset.originalHeight = normalHeight + "px";
    img_element.dataset.doubled = "false";
    attachZoomPanListeners(img_element);
    lastContainerWidth = img_container.clientWidth;
    lastContainerHeight = img_container.clientHeight;
  };
  try {
    if (updateLivePreview) {
      img_element.src = 'file://' + tempFolderPath.nativePath + '/temp_image_preview.png';
      updateLivePreview = false;
    } else {
      img_element.src = "https://i.gifer.com/XVo6.gif";
    }
  } catch (e) {
    console.log(e);
  }
  displayHelptext();
};

window.addEventListener('resize', () => {
  const container = document.getElementById("generationPreview");
  const img = container.querySelector('img');
  if (!img) return;
  let newContainerWidth = container.clientWidth;
  let newContainerHeight = container.clientHeight;
  let newScale = newContainerHeight / img.naturalHeight;
  let newNormalWidth = img.naturalWidth * newScale;
  let newNormalHeight = img.naturalHeight * newScale;
  let newBaseX = (newContainerWidth - newNormalWidth) / 2;
  let newBaseY = 0;
  
  if (img.dataset.doubled !== "true") {
    // In zoomed-out mode: recalc and center.
    img.style.width = newNormalWidth + "px";
    img.style.height = newNormalHeight + "px";
    img.style.left = newBaseX + "px";
    img.style.top = newBaseY + "px";
    img.dataset.originalWidth = newNormalWidth + "px";
    img.dataset.originalHeight = newNormalHeight + "px";
  } else {
    // If zoomed in, convert the current absolute offset to a pan offset relative to the old centered state.
    let currentLeft = parseFloat(img.style.left);
    let currentTop = parseFloat(img.style.top);
    let oldScale = lastContainerHeight / img.naturalHeight;
    let oldNormalWidth = img.naturalWidth * oldScale;
    let oldNormalHeight = img.naturalHeight * oldScale;
    let oldBaseX = (lastContainerWidth - oldNormalWidth) / 2;
    let oldBaseY = 0;
    let panX = (currentLeft - oldBaseX) / ZOOM_LEVEL;
    let panY = (currentTop - oldBaseY) / ZOOM_LEVEL;
    // Apply the same pan offset relative to the new base.
    let newLeft = newBaseX + panX * ZOOM_LEVEL;
    let newTop = newBaseY + panY * ZOOM_LEVEL;
    // Clamp the new offsets.
    let clamped = clampOffsets(
      newLeft,
      newTop,
      newContainerWidth,
      newContainerHeight,
      newNormalWidth * ZOOM_LEVEL,
      newNormalHeight * ZOOM_LEVEL
    );
    img.style.width = (newNormalWidth * ZOOM_LEVEL) + "px";
    img.style.height = (newNormalHeight * ZOOM_LEVEL) + "px";
    img.style.left = clamped.offsetX + "px";
    img.style.top = clamped.offsetY + "px";
    img.dataset.originalWidth = newNormalWidth + "px";
    img.dataset.originalHeight = newNormalHeight + "px";
  }
  lastContainerWidth = newContainerWidth;
  lastContainerHeight = newContainerHeight;
});



const updateTempPreview = async (previewData) => {
    const img_container = document.getElementById("generationPreview");
    let img_element = img_container.querySelector('img');
    if (!img_element) {
        img_element = document.createElement('img');
        img_container.appendChild(img_element);
    }
    img_element.onload = () => {
        let scale = Math.max(
            img_container.clientWidth / img_element.naturalWidth,
            img_container.clientHeight / img_element.naturalHeight
        );
        img_element.style.width = (img_element.naturalWidth * scale) + "px";
        img_element.style.height = (img_element.naturalHeight * scale) + "px";
        let offsetX = (img_container.clientWidth - img_element.clientWidth) / 2;
        let offsetY = (img_container.clientHeight - img_element.clientHeight) / 2;
        img_element.style.left = offsetX + "px";
        img_element.style.top = offsetY + "px";
        attachZoomPanListeners(img_element);
    };
    try {
        img_element.src = `data:image/png;base64,${previewData}`;
        updateLivePreview = false;
    } catch (e) {
        console.log(e);
    }
};

const updateFinalPreview = async (tempFolderPath) => {
    try {
        const fs = require('uxp').storage.localFileSystem;
        // Get the preview image file.
        const previewFile = await tempFolderPath.getEntry("temp_image_preview.png");
        // Get the preview <img> element (assumes it exists inside an element with id 'generationPreview')
        const previewElement = document.querySelector('#generationPreview img');
        if (previewElement) {
            // Set the image source to the native path of the file.
            previewElement.src = 'file://' + previewFile.nativePath;
        }
    } catch (e) {
        console.error("Error updating final preview:", e);
    }
};

const updateFinalPreviewFromData = async (base64Data) => {
    const img_container = document.getElementById("generationPreview");
    let img_element = img_container.querySelector('img');
    if (!img_element) {
        img_element = document.createElement('img');
        img_container.appendChild(img_element);
    }
    img_element.onload = () => {
        let scale = Math.min(
            img_container.clientWidth / img_element.naturalWidth,
            img_container.clientHeight / img_element.naturalHeight
        );
        img_element.style.width = (img_element.naturalWidth * scale) + "px";
        img_element.style.height = (img_element.naturalHeight * scale) + "px";
        let offsetX = (img_container.clientWidth - img_element.clientWidth) / 2;
        let offsetY = (img_container.clientHeight - img_element.clientHeight) / 2;
        img_element.style.left = offsetX + "px";
        img_element.style.top = offsetY + "px";
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
        let statusFile = await tempFolderPath.createFile('status.json', { overwrite: true });
        const data = { "status": status }; // status is either "completed" or "running"
        await statusFile.write(JSON.stringify(data), { append: false });
        console.log("Updated generation status file to:", status);
        if (status === "completed") {
            document.getElementById('queueButton').innerText = "Queue";
            document.getElementById('queueButton').disabled = false;
            document.getElementById('queueButton').variant = 'cta';
            document.getElementById('queueButton').style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            generationState = "idle"
        }

    } catch (error) {
        console.error("Error updating generation status file:", error);
    }
}

const getGenerationState = async () => {
    let data;
    try { 
        let statusFile = await tempFolderPath.getEntry('status.json');
        data = JSON.parse((await statusFile.read()));
    }
    catch (e) {
        console.log("Error loading generation status file:", e);
        let statusFile = await tempFolderPath.createFile('status.json');
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
    let statusFile = await tempFolderPath.getEntry('status.json');
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
    hideMaskPreview,
    hideAdvPrompts,
    updatePreview,
    updateTempPreview,
    display_progress,
    resetQueueButton,
    updateGenerationStatus,
    getGenerationState,
    updateFinalPreview,
    updateFinalPreviewFromData
};

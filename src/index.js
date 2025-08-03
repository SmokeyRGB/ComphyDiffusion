const UPNG = require("upng-js");
const gsap = require("gsap/dist/gsap.min.js").default;

// Helper: Encode PNG using UPNG.js
const encodeToPNG_UPNG = async (rgbaBuffer, width, height) => {
    console.log("Encoding PNG using UPNG.js...");

    // Convert RGBA Uint8Array to ArrayBuffer
    const rgbaArrayBuffer = rgbaBuffer.buffer;

    // Encode PNG using UPNG.js
    const pngBinary = UPNG.encode([rgbaArrayBuffer], width, height, 0);

    console.log("PNG successfully encoded using UPNG.js.");
    return new Uint8Array(pngBinary);
};



// ---------- helper: parse a linear-gradient string ----------
function parseGradient(str) {
  // 1. pull out everything between the first '(' and the last ')'
  const core = str.match(/linear-gradient\((.+)\)$/i)?.[1];
  if (!core) return null;

  // 2. direction is everything up to the first comma that is NOT inside ()
  const dirMatch = core.match(/^([^,]+)/);
  const direction = dirMatch ? dirMatch[1].trim() : "90deg";

  // 3. stops are the rest – split on commas but NOT inside ()
  const stopsText = core.slice(dirMatch[0].length + 1);
  const stopsRaw = splitTopLevel(stopsText, ",").map(s => s.trim()).filter(Boolean);

  const stops = stopsRaw.map(stop => {
    // stop looks like "rgba(255,255,255,0.6) 50%"
    const lastSpace = stop.lastIndexOf(" ");
    const color = lastSpace === -1 ? stop : stop.slice(0, lastSpace).trim();
    const pos   = lastSpace === -1 ? "0%" : stop.slice(lastSpace + 1).trim();
    return { color, pos: parseFloat(pos) || 0 };
  });

  return {
    direction,
    colors: stops.map(s => s.color),
    positions: stops.map(s => s.pos)
  };
}

// ---------- helper: split on delimiter only at top level (ignores ()) ----------
function splitTopLevel(text, delim) {
  const out = [];
  let depth = 0, last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === delim && depth === 0) {
      out.push(text.slice(last, i));
      last = i + 1;
    }
  }
  out.push(text.slice(last));
  return out;
}

// ---------- helper: build a linear-gradient string ----------
function buildGradient(direction, colors, positions) {
  const stops = colors.map((c, i) => `${c} ${positions[i]}%`).join(", ");
  return `linear-gradient(${direction}, ${stops})`;
}



// ---------- main: animatePanel ----------
const animatePanel = (element, styleProp, startValue, endValue, duration) => {
  if (!element) {
    console.error("animatePanel: element not found!");
    return;
  }

  duration = (duration || 0) / 1000; // ms → s

  // 1. opacity -------------------------------------------------
  if (styleProp === "opacity") {
    gsap.fromTo(
      element,
      { opacity: startValue },
      { opacity: endValue, duration, ease: "back.inOut" }
    );
    return;
  }

  // 2. background (linear-gradient) ---------------------------
  if (styleProp === "background") {
  const startGrad = parseGradient(startValue);
  const endGrad   = parseGradient(endValue);
  if (!startGrad || !endGrad) {
    console.error("animatePanel: gradient strings malformed.");
    return;
  }

  // Ensure equal length
  const len = Math.max(startGrad.positions.length, endGrad.positions.length);
  while (startGrad.positions.length < len) startGrad.positions.push(startGrad.positions.at(-1));
  while (endGrad.positions.length   < len) endGrad.positions.push(endGrad.positions.at(-1));
  while (startGrad.colors.length < len) startGrad.colors.push(startGrad.colors.at(-1));
  while (endGrad.colors.length   < len) endGrad.colors.push(endGrad.colors.at(-1));

  // Tween only the numeric positions
  const proxy = { positions: [...startGrad.positions] };
  gsap.to(proxy, {
    duration,
    ease: "back.inOut",
    positions: [...endGrad.positions],
    onUpdate() {
      element.style.background = buildGradient(
        startGrad.direction,
        startGrad.colors,
        proxy.positions
      );
    }
  });
  return;
}

  // 3. numeric CSS properties (top, left, width, height, etc.) -
  gsap.fromTo(
    element,
    { [styleProp]: startValue },
    { [styleProp]: endValue, duration, ease: "back.inOut" }
  );
};

// Export for CommonJS (UXP Compatible)
module.exports = { 
    encodeToPNG_UPNG: UPNG.encode,
    decodeFromPNG_UPNG: UPNG.decode,
    toRGBA8: UPNG.toRGBA8,
    animatePanel,
};

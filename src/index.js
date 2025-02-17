const UPNG = require("upng-js");

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

// Export for CommonJS (UXP Compatible)
module.exports = { encodeToPNG_UPNG };

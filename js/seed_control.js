const min = 0;
const max = 18446744073709551615;

const getRandomInt = () => {

    let new_seed = Math.floor(Math.random() * (max - min) + min);
    document.getElementById('seed').value = new_seed.toString();
    window.savePrompt(); // Call savePrompt from main.js
    seedButton = document.getElementById('randomizeSeed');
    // seedButton.style.background = '#0d4488ff';
    // setTimeout(() => {
    //     seedButton.style.background = '';
    // }, 500);
    hueGradientBackground(document.getElementById('randomizeSeed'), 350, 0, 360);
    return new_seed;
};

/**
 * hueGradientBackground
 * @param {HTMLElement} el      – DOM element to animate
 * @param {number} durationMs   – total animation time in ms
 * @param {number} [startHue=0] – start hue (0–360)
 * @param {number} [endHue=360] – end hue (0–360)
 *
 * Usage:
 * hueGradientBackground(document.getElementById('box'), 3000);
 */
function hueGradientBackground(el, durationMs, startHue = 0, endHue = 360) {
  const STEPS = 120;               // 120 steps ≈ smooth at 60 fps
  const stepDur = durationMs / STEPS;
  const delta = (endHue - startHue) / STEPS;

  let current = startHue;

  const tick = () => {
    if (current >= endHue) {
        el.style.backgroundColor = ''; // reset to default
        return;
    } // finished
    el.style.backgroundColor = `hsl(${current}, 50%, 30%)`;
    current += delta;
    setTimeout(tick, stepDur);
  };

  tick();
}

module.exports = {
    getRandomInt,
};

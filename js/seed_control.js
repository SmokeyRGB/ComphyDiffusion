const min = 0;
const max = 18446744073709551615;

const getRandomInt = () => {

    let new_seed = Math.floor(Math.random() * (max - min) + min);
    document.getElementById('seed').value = new_seed.toString();
    window.savePrompt(); // Call savePrompt from main.js
    return new_seed;
};

module.exports = {
    getRandomInt,
};

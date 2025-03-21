const { localFileSystem: fs } = require('uxp').storage;

async function readPromptFile(tempFolderPath) {
    try {
        let promptFile = await tempFolderPath.getEntry('prompt.json');
        let data = await promptFile.read();
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.log("Error parsing JSON, attempting to fix: " + e);
            data = data.replace(/}\s*$/, ''); // Remove the extra closing bracket
            try {
                data = JSON.parse(data);
                console.log("Fixed JSON: " + JSON.stringify(data));}
            catch (e) {
                console.log("Error whilst fixing JSON: " + e);
            }
        }
        return promptFile;
    } catch (e) {
        console.log("Error whilst loading prompt File: " + e);
        let promptFile = await tempFolderPath.createFile('prompt.json');
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

async function savePrompt(tempFolderPath) {
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

    console.log('Got prompt from UI Input: \nPositive: ' + positive_prompt + '\nNegative: ' + negative_prompt + '\nSeed: ' + seed);

    try {
        const promptFile = await readPromptFile(tempFolderPath);
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

async function loadPrompt(tempFolderPath) {
    try {
        const promptFile = await readPromptFile(tempFolderPath);
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

module.exports = {
    readPromptFile,
    savePrompt,
    loadPrompt
};

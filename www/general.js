// Tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;

        // Deactivate all tabs and content
        document.querySelectorAll('.tab, .tab-content').forEach(el => {
            el.classList.remove('active');
        });

        // Activate clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});


// --- Utility Functions ---
function EmphGloss(word) {
    const match = word.match(/\(([^)]+)\) (.+)/); // Match pattern (x) y
    if (match) {
        const firstPart = match[1]; // Capture (x)
        const secondPart = match[2]; // Capture y
        return `<span class="partofspeech">(${firstPart})</span> <span class="gloss">${secondPart}</span>`;
    } else {
        return `<span class="gloss">${word}</span>`;
    }
}

function splitAndAppendDefinitions(dict) {
    const newDict = {};
    const skipWords = ["to", "do", "be", "become", "from", "sth/sb", "make", "sth", "sb", "swh", "a",
        "the", "and", "of", "in", ""
    ];

    for (const key in dict) {
        const words = key.split(" ");
        const emphasized_gloss = EmphGloss(dict[key]);
        for (const word of words) {
            if (skipWords.includes(word) && words.length > 1) {
                continue;
            }
            if (!newDict[word]) {
                newDict[word] = `\n    [${key}] ${emphasized_gloss}`;
            } else {
                newDict[word] += `\n    [${key}] ${emphasized_gloss}`;
            }
        }
    }
    return newDict;
}


// --- Event Listeners and Initial Setup ---

const topBox = document.getElementById("topBox");
const bottomBox = document.getElementById("bottom-box");
const sideBox = document.getElementById("sideBox");
const bottomSideBox = document.getElementById("bottomSideBox");


/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SLIDER LOGIC~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
// Global variables
window.currentFlavor = 'standard';
window.showAnnotations = false;

// Get the slider elements
const flavorSlider = document.getElementById('flavor-slider');
const annotationsSlider = document.getElementById('annotations-slider');

// Event listener for the flavor slider
flavorSlider.addEventListener('click', () => {
    flavorSlider.classList.toggle('active');
    if (flavorSlider.dataset.flavor === 'std') {
        window.currentFlavor = 'hypertrevorese';
        flavorSlider.dataset.flavor = 'hyp';
        flavorSlider.classList.add('flavor-hyp');
    } else {
        window.currentFlavor = 'standard';
        flavorSlider.dataset.flavor = 'std';
        flavorSlider.classList.remove('flavor-hyp');
    }
    console.log('Flavor:', currentFlavor); // For debugging

    // Trigger the existing event listeners
    topBox.dispatchEvent(new Event('input'));
});

// // Event listener for the annotations slider
// annotationsSlider.addEventListener('click', () => {
//     annotationsSlider.classList.toggle('active');
//     if (annotationsSlider.dataset.annotations === 'no') {
//         window.showAnnotations = true;
//         annotationsSlider.dataset.annotations = 'yes';
//         annotationsSlider.classList.add('annotations-yes');
//     } else {
//         window.showAnnotations = false;
//         annotationsSlider.dataset.annotations = 'no';
//         annotationsSlider.classList.remove('annotations-yes');
//     }
//     console.log('Annotations:', showAnnotations); // For debugging
// 
//     // Trigger the existing event listeners
//     topBox.dispatchEvent(new Event('input'));
//     // topBox2.dispatchEvent(new Event('input'));
// });


/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~LOAD STUFFS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Fetch the dictionary
fetch('./trevorese.json?v=9')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`); // Better error handling
        }
        return response.json();
    })
    .then(data => {
        window.compounds = data["compounds"];
        window.gloss_to_surface = data["gloss_to_surface"];
        window.gloss_to_surface_hypertrevorese = data["gloss_to_surface_hypertrevorese"];
        window.gloss_to_supergloss = data["gloss_to_supergloss"];
        window.gloss_to_supercompound = data["gloss_to_supercompound"];
        window.surface_to_gloss = {};
        // Create reverse mapping (surface to gloss)
        for (let gloss in window.gloss_to_surface) {
            let surface = window.gloss_to_surface[gloss];
            //only add if surface doesn't start with __
            if (!surface.startsWith("__")) {
                window.surface_to_gloss[surface] = gloss;
            }
        }

        window.english_to_gloss = splitAndAppendDefinitions(data["english_to_gloss"]);
        // Build the FSA after loading the dictionary
        buildFSA();
    })
    .catch(error => {
        console.error('Error loading dictionary:', error);
        // Display error to the user, e.g., in the bottom box
        document.getElementById('bottom-box').innerHTML = `<span style="color: red;">Error loading dictionary: ${error.message}</span>`;
        document.getElementById('bottom-box-2').innerHTML = `<span style="color: red;">Error loading dictionary: ${error.message}</span>`;
    });


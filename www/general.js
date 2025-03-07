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

const topBox = document.getElementById("top-box");
const bottomBox = document.getElementById("bottom-box");
const sideBox = document.getElementById("side-box");
const bottomSideBox = document.getElementById("bottom-side-box");
const topBox2 = document.getElementById("top-box-2");
const bottomBox2 = document.getElementById("bottom-box-2");


//Gloss to Surface:
topBox.addEventListener("input", () => {
    const notFoundWords = [];
    const notFoundCompounds = [];
    const translated = get_surface(topBox.value.toLowerCase(), notFoundWords, notFoundCompounds);
    bottomBox.innerHTML = translated;
    sideBox.innerHTML = notFoundWords.join("\n");
    bottomSideBox.innerHTML = "* " + notFoundCompounds.join("<br> * ");
});

//Surface to Gloss:
topBox2.addEventListener("input", () => {
  try {
     const glossed = get_gloss(topBox2.value);
     bottomBox2.innerHTML = glossed;
  } catch (error) {
    bottomBox2.innerHTML = `<span style="color: red;">${error.message}</span>`;
  }

});


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

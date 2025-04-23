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

        // Load periodic table content if this tab is clicked and not already loaded
        if (tabId === 'periodic-table' && !periodicTableLoaded) {
            loadPeriodicTable();
        }
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

let periodicTableLoaded = false; // Flag to track if table is loaded

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


/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~HIDING AND COPYING~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

    function toggleBox(boxId) {
        const box = document.getElementById(boxId);
        box.classList.toggle('hidden');
    }

    function copyText(boxId) {
        const box = document.getElementById(boxId);
        const text = box.innerText; // Use innerText to get the visible text, not innerHTML

        // Use the Clipboard API for modern browsers
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                console.log("Text copied to clipboard: " + text);
                // Optional: Show a brief "Copied!" message.
                // You could add a small <span> next to the button and toggle its visibility.
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                fallbackCopyText(text); // Fallback for older browsers
            });
        } else {
          fallbackCopyText(text); // Fallback for older browsers
        }
    }

    // Fallback for older browsers (and cases where Clipboard API fails)
    function fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            const msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textarea);

    }



/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ PERIODIC TABLE LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

async function loadPeriodicTable() {
    const tableContainer = document.getElementById('periodic-table');
    tableContainer.innerHTML = 'Loading table...'; // Show loading indicator
    console.log('loadPeriodicTable function started.'); // DEBUG

    try {
        console.log('Fetching fptable.tsv...'); // DEBUG
        const response = await fetch('./fptable.tsv?v=' + Date.now()); // Add cache-busting param
        console.log('Fetch response received:', response.status); // DEBUG
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const tsvData = await response.text();
        console.log('TSV data fetched, length:', tsvData.length); // DEBUG
        const rows = tsvData.trim().split('\n');
        console.log('TSV parsed into', rows.length, 'rows.'); // DEBUG

        let tableHTML = '<div class="table-container"><table id="trevorese-periodic-table">';

        rows.forEach((row, rowIndex) => {
            // console.log(`Processing row ${rowIndex}`); // DEBUG (can be noisy)
            const cells = row.split('\t');
            if (rowIndex === 0) {
                tableHTML += '<thead><tr><th></th>'; // Add empty top-left header cell
                cells.forEach(cell => {
                    const cellContent = cell.trim();
                    const headerClass = cellContent.length > 1 ? 'pt-header-long' : '';
                    tableHTML += `<th class="${headerClass}">${cellContent}</th>`;
                });
                tableHTML += '</tr></thead><tbody>';
            } else {
                tableHTML += '<tr>';
                cells.forEach((cell, cellIndex) => {
                    const cellContent = cell.trim();
                    let cellClass = '';
                    let processedContent = cellContent; // Content to display inside TD

                    // Apply special classes first
                    if (cellContent.includes('()')) {
                        cellClass += ' pt-grey';
                    }
                    if (cellContent === '\\') {
                        cellClass += ' pt-black';
                    }

                    // Handle first column styling
                    if (cellIndex === 0) {
                        cellClass += ' pt-first-col';
                        if (cellContent.length > 1) {
                            cellClass += ' pt-header-long';
                        }
                    } else { // Apply surface style to data cells (not first column)
                        // Only apply surface styling if not grey/black cell
                        if (!cellClass.includes('pt-grey') && !cellClass.includes('pt-black')) {
                            const parenIndex = cellContent.indexOf('(');
                            if (parenIndex !== -1) {
                                const surfacePart = cellContent.substring(0, parenIndex).trim();
                                const restPart = cellContent.substring(parenIndex);
                                processedContent = `<span class="surface">${surfacePart}</span> ${restPart}`;
                            } else if (cellContent) { // Don't wrap empty cells
                                processedContent = `<span class="surface">${cellContent}</span>`;
                            }
                        }
                    }

                    tableHTML += `<td class="${cellClass.trim()}">${processedContent}</td>`;
                });
                tableHTML += '</tr>';
            }
        });

        tableHTML += '</tbody></table></div>';
        tableContainer.innerHTML = tableHTML;
        periodicTableLoaded = true; // Set flag to true after successful load
        console.log('Periodic table HTML generated and inserted.'); // DEBUG

    } catch (error) {
        console.error('Error loading or parsing periodic table:', error); // Log the specific error
        tableContainer.innerHTML = `<span style="color: red;">Error loading periodic table: ${error.message}. Check console for details.</span>`;
    }
}


/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~ KEYBOARD SCROLLING ~~~~~~~~~~~~~~~~~~~~~~~~~*/

document.addEventListener('keydown', function(event) {
    const activeElement = document.activeElement;
    const isInput = activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' || 
                    activeElement.tagName === 'SELECT';

    // Ignore if typing in an input field
    if (isInput) {
        return;
    }

    const activeTabContent = document.querySelector('.tab-content.active');
    if (!activeTabContent) {
        return; // No active tab found
    }

    let scrollAmount = 0;
    const scrollStep = activeTabContent.clientHeight * 0.8; // Scroll by 80% of viewport height

    switch (event.code) {
        case 'Space':
        case 'PageDown':
            scrollAmount = scrollStep;
            break;
        case 'PageUp':
            scrollAmount = -scrollStep;
            break;
        default:
            return; // Ignore other keys
    }

    if (scrollAmount !== 0) {
        event.preventDefault(); // Prevent default browser scroll
        // Check if the active content is an iframe, scroll its content window
        if (activeTabContent.tagName === 'IFRAME') {
            activeTabContent.contentWindow.scrollBy(0, scrollAmount);
        } else {
             // Otherwise, scroll the div itself (if it's scrollable)
            activeTabContent.scrollBy(0, scrollAmount);
        }
    }
});

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~ INITIALIZATION ~~~~~~~~~~~~~~~~~~~~~~~~~~*/

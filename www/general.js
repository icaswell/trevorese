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

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SURFACE MODE LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Get the surface mode checkbox
const surfaceModeCheckbox = document.getElementById('surface-mode-checkbox');

// Global variable to track surface mode state
window.surfaceMode = true; // Default to checked (true)

// Function to convert gloss spans to surface spans
function toggleSurfaceMode(isSurfaceMode) {
    window.surfaceMode = isSurfaceMode;
    console.log('Surface mode toggled:', isSurfaceMode);
    
    // Only apply to tutorial and about tabs
    const tutorialFrame = document.querySelector('#tutorial iframe');
    const aboutFrame = document.querySelector('#about iframe');
    
    // Process tutorial iframe if it exists
    if (tutorialFrame) {
        try {
            // Try to access the contentDocument
            const tutorialDoc = tutorialFrame.contentDocument || tutorialFrame.contentWindow.document;
            processSurfaceMode(tutorialDoc, isSurfaceMode);
        } catch (e) {
            console.error('Error accessing tutorial iframe:', e);
        }
    }
    
    // Process about iframe if it exists
    if (aboutFrame) {
        try {
            // Try to access the contentDocument
            const aboutDoc = aboutFrame.contentDocument || aboutFrame.contentWindow.document;
            processSurfaceMode(aboutDoc, isSurfaceMode);
        } catch (e) {
            console.error('Error accessing about iframe:', e);
        }
    }
}

// Function to process a document for surface mode
function processSurfaceMode(doc, isSurfaceMode) {
    console.log('Processing document for surface mode:', isSurfaceMode);
    if (!doc) {
        console.error('No document provided to processSurfaceMode');
        return;
    }
    
    try {
        // Update table headings
        const tableHeadings = doc.querySelectorAll('th, td.heading');
        tableHeadings.forEach(heading => {
            if (heading.textContent.toLowerCase().includes('gloss')) {
                if (isSurfaceMode) {
                    heading.dataset.originalText = heading.textContent;
                    heading.textContent = heading.textContent.replace(/gloss/i, 'surface');
                } else if (heading.dataset.originalText) {
                    heading.textContent = heading.dataset.originalText;
                }
            }
        });
        
        // Find all spans with gloss classes
        const allSpans = doc.querySelectorAll('span');
        const glossSpans = [];
        
        // Filter spans that have gloss classes or have been converted to surface
        allSpans.forEach(span => {
            if (span.className.includes('gloss') || 
                span.className.includes('surface') || 
                span.dataset.originalClass) {
                glossSpans.push(span);
            }
        });
        
        console.log('Found spans to process:', glossSpans.length);
        
        // Process each span
        glossSpans.forEach(span => {
            if (isSurfaceMode) {
                // If already in surface mode, skip
                if (span.className.includes('surface') && !span.dataset.originalClass) {
                    return;
                }
                
                // Store original class and content if not already stored
                if (!span.dataset.originalClass) {
                    span.dataset.originalClass = span.className;
                }
                if (!span.dataset.originalContent) {
                    span.dataset.originalContent = span.textContent;
                }
                
                // Get the corresponding surface form
                const gloss = span.dataset.originalContent || span.textContent.trim().toLowerCase();
                
                if (window.gloss_to_surface && gloss in window.gloss_to_surface) {
                    const surface = window.gloss_to_surface[gloss];
                    // Change class to surface or surface-emph
                    if (span.className.includes('gloss-emph')) {
                        span.className = 'surface-emph';
                    } else if (span.className.includes('gloss')) {
                        span.className = 'surface';
                    }
                    // Update content
                    span.textContent = surface;
                } else {
                    // No surface found, mark as not found
                    span.className = 'gloss-notfound';
                    // Keep original text
                }
            } else {
                // Restore original class and content
                if (span.dataset.originalClass) {
                    span.className = span.dataset.originalClass;
                }
                if (span.dataset.originalContent) {
                    span.textContent = span.dataset.originalContent;
                }
            }
        });
    } catch (e) {
        console.error('Error in processSurfaceMode:', e);
    }
}

// Event listener for the surface mode checkbox
surfaceModeCheckbox.addEventListener('change', () => {
    console.log('Checkbox changed:', surfaceModeCheckbox.checked);
    toggleSurfaceMode(surfaceModeCheckbox.checked);
});

// Initialize surface mode based on checkbox default state
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing surface mode');
    // Wait a bit for iframes to load
    setTimeout(() => {
        toggleSurfaceMode(surfaceModeCheckbox.checked);
    }, 1000);
});

// Add event listeners for tab clicks to ensure surface mode is applied when switching tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (tabId === 'tutorial' || tabId === 'about') {
            // Wait a bit for iframe content to be accessible
            setTimeout(() => {
                toggleSurfaceMode(surfaceModeCheckbox.checked);
            }, 500);
        }
    });
});

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ WORD INFO POPUP LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Initialize popup elements when the DOM is fully loaded
let wordInfoPopup, popupWord, popupContent, popupClose;

// Function to initialize popup elements
function initPopupElements() {
    // Get the popup elements
    wordInfoPopup = document.getElementById('word-info-popup');
    popupWord = document.getElementById('popup-word');
    popupContent = document.getElementById('popup-content');
    popupClose = document.querySelector('.popup-close');
    
    // Add event listeners if elements exist
    if (popupClose) {
        // Close popup when clicking the close button
        popupClose.addEventListener('click', hideWordInfoPopup);
    }
}

// Define the order of fields to display
const FIELD_DISPLAY_ORDER = [
    { tsv: "noun/pronoun", display: "noun" },
    { tsv: "verb", display: "verb" },
    { tsv: "adj/adv", display: "adj/adv" },
    { tsv: "quantifier", display: "quantifier" },
    { tsv: "conjunction", display: "conjunction" },
    { tsv: "preposition", display: "preposition" },
    { tsv: "affix", display: "affix" },
    { tsv: "interjection", display: "interjection" },
    { tsv: "fn", display: "function word" },
    { tsv: "cognates", display: "cognates" },
    { tsv: "COMMENTS/TODOS", display: "Notes" }
];

// Function to find VocabEntry by surface form
function findVocabEntryBySurface(surface) {
    // First check if the surface exists in the surface_to_gloss map
    if (window.surface_to_gloss && surface in window.surface_to_gloss) {
        const gloss = window.surface_to_gloss[surface];
        // Now get the VocabEntry from the dictionary
        if (window.trevorese_dictionary && window.trevorese_dictionary.vocabs && 
            gloss in window.trevorese_dictionary.vocabs) {
            return {
                entry: window.trevorese_dictionary.vocabs[gloss],
                gloss: gloss,
                index: Array.from(Object.keys(window.trevorese_dictionary.vocabs)).indexOf(gloss) + 1
            };
        }
    }
    return null;
}

// Function to populate the popup with word information
function populateWordInfoPopup(surface) {
    const result = findVocabEntryBySurface(surface);
    if (!result) {
        popupWord.innerHTML = `<span class="surface">${surface}</span> (not found)`;
        popupContent.innerHTML = '<p>No information available for this word.</p>';
        return;
    }
    
    const { entry, gloss, index } = result;
    
    // Set the header with surface form and index
    popupWord.innerHTML = `<span class="surface">${surface}</span> (#${index})`;
    
    // Build the content HTML
    let contentHTML = `<div class="field-row"><span class="field-label">gloss:</span> <span class="gloss">${gloss}</span></div>`;
    
    // Add facet information in the specified order
    FIELD_DISPLAY_ORDER.forEach(field => {
        if (entry.facets[field.tsv] && entry.facets[field.tsv].length > 0) {
            const values = entry.facets[field.tsv];
            contentHTML += `<div class="field-row"><span class="field-label">${field.display}:</span> <span class="english">${values.join('; ')}</span></div>`;
        }
    });
    
    // Set the content
    popupContent.innerHTML = contentHTML;
}

// Function to show the popup at the clicked position
function showWordInfoPopup(event, surface) {
    // Populate the popup
    populateWordInfoPopup(surface);
    
    // Position the popup near the clicked element
    const rect = event.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position (centered below the word)
    const top = rect.bottom + scrollTop + 5; // 5px below the word
    const left = rect.left + scrollLeft + (rect.width / 2) - (wordInfoPopup.offsetWidth / 2);
    
    // Set the position
    wordInfoPopup.style.top = `${top}px`;
    wordInfoPopup.style.left = `${left}px`;
    
    // Show the popup
    wordInfoPopup.style.display = 'block';
}

// Function to hide the popup
function hideWordInfoPopup() {
    if (wordInfoPopup) {
        wordInfoPopup.style.display = 'none';
    }
}

// Close popup when clicking outside
document.addEventListener('click', (event) => {
    if (event.target.closest('#word-info-popup') || 
        event.target.classList.contains('surface') || 
        event.target.classList.contains('surface-emph')) {
        return; // Don't close if clicking inside popup or on a surface span
    }
    hideWordInfoPopup();
});

// Function to add click listeners to surface spans in iframes
function addSurfaceClickListeners() {
    // Get the iframe documents
    const tutorialFrame = document.querySelector('#tutorial iframe');
    const aboutFrame = document.querySelector('#about iframe');
    
    // Process tutorial iframe if it exists
    if (tutorialFrame && tutorialFrame.contentDocument) {
        const tutorialDoc = tutorialFrame.contentDocument || tutorialFrame.contentWindow.document;
        addClickListenersToDoc(tutorialDoc);
    }
    
    // Process about iframe if it exists
    if (aboutFrame && aboutFrame.contentDocument) {
        const aboutDoc = aboutFrame.contentDocument || aboutFrame.contentWindow.document;
        addClickListenersToDoc(aboutDoc);
    }
}

// Function to add click listeners to surface spans in a document
function addClickListenersToDoc(doc) {
    // Find all surface spans
    const surfaceSpans = doc.querySelectorAll('.surface, .surface-emph');
    
    // Add click listeners to each span
    surfaceSpans.forEach(span => {
        // Remove existing listeners to avoid duplicates
        span.removeEventListener('click', surfaceClickHandler);
        
        // Add new click listener
        span.addEventListener('click', surfaceClickHandler);
    });
}

// Click handler for surface spans
function surfaceClickHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const surface = event.target.textContent.trim();
    showWordInfoPopup(event, surface);
}

// Add surface click listeners when surface mode is toggled
const originalToggleSurfaceMode = toggleSurfaceMode;
toggleSurfaceMode = function(isSurfaceMode) {
    originalToggleSurfaceMode(isSurfaceMode);
    
    // Add click listeners after a short delay to ensure DOM is updated
    setTimeout(() => {
        if (isSurfaceMode) {
            addSurfaceClickListeners();
        }
    }, 500);
};

// Add click listeners when tabs are clicked
document.querySelectorAll('.tab').forEach(tab => {
    const originalClickHandler = tab.onclick;
    tab.onclick = function(event) {
        if (originalClickHandler) {
            originalClickHandler.call(this, event);
        }
        
        const tabId = tab.dataset.tab;
        if ((tabId === 'tutorial' || tabId === 'about') && window.surfaceMode) {
            // Wait a bit for iframe content to be accessible
            setTimeout(() => {
                addSurfaceClickListeners();
            }, 500);
        }
    };
});

// Initialize click listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize popup elements
    initPopupElements();
    
    // Wait for iframes to load
    setTimeout(() => {
        if (window.surfaceMode) {
            addSurfaceClickListeners();
        }
    }, 1500);
});

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
/*~~~~~~~~~~~~~~~~~~~~~ KEYBOARD SCROLLING ~~~~~~~~~~~~~~~~~~~~~~~~~*/

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

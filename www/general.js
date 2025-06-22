// Timing utility function for performance measurement
function timeOperation(operationName, fn) {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    console.log(`general.js: TIMING: ${operationName} took ${(endTime - startTime).toFixed(2)}ms`);
    return result;
}

// Tab switching logic - now handled by tab-navigation.js
// The original tab switching logic is preserved for backward compatibility
// but the actual tab clicks are handled by the TabNavigator class

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
window.showAnnotations = false;

// Get the slider elements
const annotationsSlider = document.getElementById('annotations-slider');

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SURFACE MODE LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Global variable to track surface mode state
window.surfaceMode = true; // Always enabled by default

// Function to convert gloss spans to surface spans
function toggleSurfaceMode(isSurfaceMode) {
    window.surfaceMode = isSurfaceMode;
    console.log('general.js: Surface mode toggled:', isSurfaceMode);
    
    // Only apply to tutorial and about tabs
    const tutorialFrame = document.querySelector('#tutorial iframe');
    const aboutFrame = document.querySelector('#about iframe');
    
    // Process tutorial iframe if it exists
    if (tutorialFrame) {
        try {
            // Try to access the contentDocument
            const tutorialDoc = tutorialFrame.contentDocument || tutorialFrame.contentWindow.document;
            timeOperation('Process surface mode for tutorial', () => {
                processSurfaceMode(tutorialDoc, isSurfaceMode);
                return null;
            });
        } catch (e) {
            console.error('Error accessing tutorial iframe:', e);
        }
    }
    
    // Process about iframe if it exists
    if (aboutFrame) {
        try {
            // Try to access the contentDocument
            const aboutDoc = aboutFrame.contentDocument || aboutFrame.contentWindow.document;
            timeOperation('Process surface mode for about', () => {
                processSurfaceMode(aboutDoc, isSurfaceMode);
                return null;
            });
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
                    console.log('Storing original class:', span.className, 'for text:', span.textContent);
                }
                if (!span.dataset.originalContent) {
                    span.dataset.originalContent = span.textContent;
                }
                
                // Get the original gloss content
                const glossText = span.dataset.originalContent || span.textContent.trim();
                
                // Check if it's a compound (contains dashes)
                if (glossText.includes('-')) {
                    // Handle compound word
                    const parts = glossText.split('-');
                    let surfaceParts = [];
                    let allPartsFound = true;
                    
                    // Process each part
                    for (const part of parts) {
                        const trimmedPart = part.trim().toLowerCase();
                        if (window.atomgloss_to_surface && trimmedPart in window.atomgloss_to_surface) {
                            surfaceParts.push(window.atomgloss_to_surface[trimmedPart]);
                        } else {
                            // If any part is not found, mark the whole compound
                            allPartsFound = false;
                            surfaceParts.push(part); // Keep original part
                        }
                    }
                    
                    // Update class and content based on whether all parts were found
                    if (allPartsFound) {
                        // Check if the original class contains 'gloss-emph'
                        const originalClass = span.dataset.originalClass || span.className;
                        const isEmph = originalClass.includes('gloss-emph');
                        
                        // Force the class to be only 'surface-emph' or 'surface' without any other classes
                        if (isEmph) {
                            span.className = 'surface-emph';
                            console.log('Setting surface-emph for compound:', glossText);
                        } else {
                            span.className = 'surface';
                        }
                    } else {
                        span.className = 'gloss-notfound';
                    }
                    
                    // Join the surface parts without dashes (as per Sesowi rules)
                    span.textContent = surfaceParts.join('');
                    
                } else {
                    // Handle atomic word
                    const gloss = glossText.toLowerCase();
                    
                    if (window.atomgloss_to_surface && gloss in window.atomgloss_to_surface) {
                        const surface = window.atomgloss_to_surface[gloss];
                        // Check if the original class contains 'gloss-emph'
                        const originalClass = span.dataset.originalClass || span.className;
                        const isEmph = originalClass.includes('gloss-emph');
                        
                        // Force the class to be only 'surface-emph' or 'surface' without any other classes
                        if (isEmph) {
                            span.className = 'surface-emph';
                            console.log('Setting surface-emph for atomic:', gloss);
                        } else {
                            span.className = 'surface';
                        }
                        // Update content
                        span.textContent = surface;
                    } else {
                        // No surface found, mark as not found
                        span.className = 'gloss-notfound';
                        // Keep original text
                    }
                }
            } else {
                // Restore original class and content
                if (span.dataset.originalClass) {
                    console.log('Restoring original class:', span.dataset.originalClass, 'for text:', span.textContent);
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

// Initialize surface mode on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('general.js: DOM loaded, initializing surface mode');
    // Wait a bit for iframes to load
    setTimeout(() => {
        toggleSurfaceMode(true); // Always enable surface mode
    }, 1000);
});

// Add event listeners for tab clicks to ensure surface mode is applied when switching tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (tabId === 'tutorial' || tabId === 'about') {
            // Wait a bit for iframe content to be accessible
            setTimeout(() => {
                toggleSurfaceMode(true); // Always enable surface mode
            }, 500);
        }
    });
});

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ COLLAPSE SECTIONS LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Initialize collapse state
let collapseState = true; // Default to collapsed (checked)

// Function to toggle all collapsible sections
function toggleAllCollapsibleSections(collapsed) {
    console.log(`Toggling all collapsible sections: ${collapsed ? 'collapsed' : 'expanded'}`);
    
    // Get the iframe documents
    const tutorialFrame = document.querySelector('#tutorial iframe');
    const aboutFrame = document.querySelector('#about iframe');
    const phonologyFrame = document.querySelector('#phonology iframe');
    
    // Process tutorial iframe if it exists
    if (tutorialFrame) {
        try {
            const tutorialDoc = tutorialFrame.contentDocument || tutorialFrame.contentWindow.document;
            timeOperation('Toggle collapsible sections in tutorial', () => {
                toggleCollapsibleInDoc(tutorialDoc, collapsed);
                return null;
            });
        } catch (e) {
            console.error('Error accessing tutorial iframe:', e);
        }
    }
    
    // Process about iframe if it exists
    if (aboutFrame) {
        try {
            const aboutDoc = aboutFrame.contentDocument || aboutFrame.contentWindow.document;
            timeOperation('Toggle collapsible sections in about', () => {
                toggleCollapsibleInDoc(aboutDoc, collapsed);
                return null;
            });
        } catch (e) {
            console.error('Error accessing about iframe:', e);
        }
    }
    
    // Process phonology iframe if it exists
    if (phonologyFrame) {
        try {
            const phonologyDoc = phonologyFrame.contentDocument || phonologyFrame.contentWindow.document;
            timeOperation('Toggle collapsible sections in phonology', () => {
                toggleCollapsibleInDoc(phonologyDoc, collapsed);
                return null;
            });
        } catch (e) {
            console.error('Error accessing phonology iframe:', e);
        }
    }
}

// Function to toggle collapsible sections in a document
function toggleCollapsibleInDoc(doc, collapsed) {
    if (!doc) return;
    
    try {
        // Find all collapsible headers
        const collapsibleHeaders = doc.querySelectorAll('.collapsible-header');
        
        // First, ensure all headers have click handlers if they don't already
        collapsibleHeaders.forEach(header => {
            // Check if we've already added our click handler
            if (!header.hasAttribute('data-click-handler-added')) {
                // Add the click handler to toggle visibility
                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // Toggle the collapsed class
                    this.classList.toggle('collapsed');
                    // Toggle the visibility of the next sibling (content)
                    const content = this.nextElementSibling;
                    if (content && content.classList.contains('collapsible-content')) {
                        // Support both style-based and class-based visibility
                        if (content.style.display === 'none') {
                            content.style.display = 'block';
                            content.classList.add('open');
                        } else {
                            content.style.display = 'none';
                            content.classList.remove('open');
                        }
                    }
                });
                
                // Mark that we've added the handler
                header.setAttribute('data-click-handler-added', 'true');
            }
        });
        
        // Now apply the collapsed state as requested
        collapsibleHeaders.forEach(header => {
            // Get the content element (next sibling)
            const content = header.nextElementSibling;
            
            if (content && content.classList.contains('collapsible-content')) {
                if (collapsed) {
                    // Collapse: add 'collapsed' class to header if not already present
                    if (!header.classList.contains('collapsed')) {
                        header.classList.add('collapsed');
                    }
                    // Hide content - support both style and class methods
                    content.style.display = 'none';
                    content.classList.remove('open');
                } else {
                    // Expand: remove 'collapsed' class from header
                    header.classList.remove('collapsed');
                    // Show content - support both style and class methods
                    content.style.display = 'block';
                    content.classList.add('open');
                }
            }
        });
    } catch (e) {
        console.error('Error toggling collapsible sections:', e);
    }
}

// Initialize collapse checkbox
document.addEventListener('DOMContentLoaded', () => {
    const collapseCheckbox = document.getElementById('collapse-checkbox');
    
    if (collapseCheckbox) {
        // Set initial state
        collapseState = collapseCheckbox.checked;
        
        // Add event listener for checkbox change
        collapseCheckbox.addEventListener('change', () => {
            toggleAllCollapsibleSections(collapseCheckbox.checked);
        });
        
        // Apply initial state after iframes load
        setTimeout(() => {
            toggleAllCollapsibleSections(collapseState);
        }, 1000);
    }
});

// We don't need to reset collapse state when switching tabs
// This allows users to maintain their manually expanded/collapsed sections
// The initial state is still applied when the page first loads

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ WORD INFO POPUP LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Initialize popup elements when the DOM is fully loaded
let wordInfoPopup, popupWord, popupContent, popupClose;

// Function to initialize popup elements
function initPopupElements() {
    console.log('general.js: Initializing popup elements');
    // Get the popup elements
    wordInfoPopup = document.getElementById('word-info-popup');
    popupWord = document.getElementById('popup-word');
    popupContent = document.getElementById('popup-content');
    popupClose = document.querySelector('.popup-close');
    
    if (!wordInfoPopup) {
        console.error('general.js: Could not find word-info-popup element!');
        return;
    }
    
    console.log('general.js: Found popup elements:', {
        popup: wordInfoPopup ? 'found' : 'not found',
        word: popupWord ? 'found' : 'not found',
        content: popupContent ? 'found' : 'not found',
        close: popupClose ? 'found' : 'not found'
    });
    
    // Add event listeners if elements exist
    if (popupClose) {
        // Close popup when clicking the close button
        popupClose.addEventListener('click', hideWordInfoPopup);
    }
    
    // Add global ESC key event listener to close popups
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            console.log('general.js: ESC key pressed, hiding word info popup');
            hideWordInfoPopup();
        }
    }, { passive: true });
}

// FIELD_DISPLAY_ORDER is now defined in display.js

// findVocabEntryBySurface is now defined in display.js

// Function to generate word info content - shared between popups
function generateWordInfoContent(surface) {
    const startTime = performance.now();
    const result = findVocabEntryBySurface(surface);
    
    // Return object with header and content
    const contentData = {
        headerHTML: '',
        contentHTML: '',
        contentElement: null
    };
    
    if (!result) {
        contentData.headerHTML = `<span class="surface">${surface}</span> (not found)`;
        contentData.contentHTML = '<p>No information available for this word.</p>';
        console.log(`general.js: TIMING: generateWordInfoContent for "${surface}" took ${(performance.now() - startTime).toFixed(2)}ms`);
        return contentData;
    }
    
    const { entry, gloss, index } = result;
    
    // Generate the header HTML
    contentData.headerHTML = createDictionaryHeaderDisplay({
        surface: surface,
        gloss: gloss,
        showIndex: true,
        index: index
    });
    
    // Generate the content element
    contentData.contentElement = createDictionaryEntryDisplay(entry, {
        gloss: gloss,
        surface: surface,
        showIndex: true,
        index: index,
        hideWordHeader: true  // Hide the word header since it's in the popup header
    });
    
    console.log(`general.js: TIMING: generateWordInfoContent for "${surface}" took ${(performance.now() - startTime).toFixed(2)}ms`);
    return contentData;
}

// Function to populate the popup with word information
function populateWordInfoPopup(surface) {
    const contentData = generateWordInfoContent(surface);
    
    // Set the header
    popupWord.innerHTML = contentData.headerHTML;
    
    // Set the content
    popupContent.innerHTML = '';
    if (contentData.contentElement) {
        popupContent.appendChild(contentData.contentElement);
    } else if (contentData.contentHTML) {
        popupContent.innerHTML = contentData.contentHTML;
    }
}

// Track the currently clicked word element
let lastClickedWordElement = null;

// Function to show the popup at the clicked position
function showWordInfoPopup(event, surface) {
    console.log(`general.js: showWordInfoPopup called for surface: ${surface}`);
    
    // Make sure popup elements are initialized
    if (!wordInfoPopup) {
        console.log('general.js: Popup elements not initialized, initializing now');
        initPopupElements();
        
        // If still not found, create a warning and return
        if (!wordInfoPopup) {
            console.error('general.js: Could not initialize popup elements!');
            return;
        }
    }
    
    // Debug: Check if popup elements exist
    console.log('general.js: Popup elements check:', {
        wordInfoPopup: wordInfoPopup ? 'found' : 'not found',
        popupWord: popupWord ? 'found' : 'not found',
        popupContent: popupContent ? 'found' : 'not found',
        popupClose: popupClose ? 'found' : 'not found'
    });
    
    // Check if this is the same element that was clicked before
    if (lastClickedWordElement === event.target && wordInfoPopup && wordInfoPopup.style.display === 'block') {
        // If clicking the same word again, hide the popup
        hideWordInfoPopup();
        lastClickedWordElement = null;
        return;
    }
    
    // Store the current clicked element
    lastClickedWordElement = event.target;
    
    // Populate the popup
    populateWordInfoPopup(surface);
    
    // Position the popup near the clicked element
    const rect = event.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position (centered below the word)
    const top = rect.bottom + scrollTop + 5; // 5px below the word
    const left = rect.left + scrollLeft + (rect.width / 2) - (wordInfoPopup.offsetWidth / 2);
    
    // Debug: Log positioning information
    console.log('general.js: Positioning debug:', {
        rect: rect,
        scrollTop: scrollTop,
        scrollLeft: scrollLeft,
        calculatedTop: top,
        calculatedLeft: left,
        popupWidth: wordInfoPopup.offsetWidth,
        popupHeight: wordInfoPopup.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    });
    
    // Set the position
    wordInfoPopup.style.top = `${top}px`;
    wordInfoPopup.style.left = `${left}px`;
    
    // Show the popup with improved visibility
    wordInfoPopup.style.display = 'block';
    wordInfoPopup.style.visibility = 'visible';
    wordInfoPopup.style.zIndex = '9999'; // Increased z-index to ensure visibility
    wordInfoPopup.style.position = 'absolute'; // Ensure absolute positioning
    
    // Check if this is from the mobile periodic table and apply additional styles if needed
    const isMobileTable = event.target.closest('.mobile-periodic-table') !== null;
    if (isMobileTable) {
        console.log('general.js: Click from mobile periodic table detected, applying special styling');
        // Apply additional styles for mobile periodic table context
        wordInfoPopup.style.backgroundColor = 'white';
        wordInfoPopup.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)'; // Enhanced shadow
        wordInfoPopup.style.border = '2px solid #009c36'; // Green border to match the table theme
    }
    
    console.log('general.js: Popup displayed at position:', { top, left });
    console.log('general.js: Popup display style:', wordInfoPopup.style.display);
    console.log('general.js: Popup visibility:', wordInfoPopup.style.visibility);
    console.log('general.js: Popup z-index:', wordInfoPopup.style.zIndex);
    console.log('general.js: Popup computed styles:', {
        display: window.getComputedStyle(wordInfoPopup).display,
        visibility: window.getComputedStyle(wordInfoPopup).visibility,
        zIndex: window.getComputedStyle(wordInfoPopup).zIndex,
        position: window.getComputedStyle(wordInfoPopup).position
    });
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

// Function to add click listeners to surface spans in iframes and tabs
function addSurfaceClickListeners() {
    const startTime = performance.now();
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
    
    // Process the periodic table tab directly (not in an iframe)
    const periodicTableTab = document.querySelector('#periodic-table');
    if (periodicTableTab) {
        addClickListenersToDoc(document);
    }
    console.log(`general.js: TIMING: addSurfaceClickListeners took ${(performance.now() - startTime).toFixed(2)}ms`);
}

// Function to add click listeners to surface and gloss spans in a document
function addClickListenersToDoc(doc) {
    const startTime = performance.now();
    // Find all surface and gloss spans
    const spans = doc.querySelectorAll('.surface, .surface-emph, .gloss');
    
    // Add click listeners to each span
    spans.forEach(span => {
        // Remove existing listeners to avoid duplicates
        span.removeEventListener('click', spanClickHandler);
        
        // Add new click listener
        span.addEventListener('click', spanClickHandler);
    });
    console.log(`general.js: TIMING: addClickListenersToDoc added listeners to ${spans.length} elements in ${(performance.now() - startTime).toFixed(2)}ms`);
}

// Click handler for both surface and gloss spans
function spanClickHandler(event) {
    event.preventDefault();
    event.stopPropagation();
    
    let text = event.target.textContent.trim();
    
    // If it's a gloss span, remove the parentheses if present
    if (event.target.classList.contains('gloss')) {
        // Remove parentheses from gloss text if present
        text = text.replace(/^\((.+)\)$/, '$1');
    }
    
    showWordInfoPopup(event, text);
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

// Initialize click listeners when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure all content is loaded
    setTimeout(() => {
        addSurfaceClickListeners();
        
        // Also add listeners to the main document for the periodic table
        if (document.querySelector('#periodic-table.active')) {
            addClickListenersToDoc(document);
        }
    }, 1000);
});

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
        
        // Reset the lastClickedWordElement when switching tabs
        // This prevents issues with popup positioning when returning to a tab
        lastClickedWordElement = null;
        hideWordInfoPopup();
    };
});

// Initialize click listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('general.js: DOM content loaded, initializing popup elements');
    // Initialize popup elements
    initPopupElements();
    
    // Wait for iframes to load
    setTimeout(() => {
        if (window.surfaceMode) {
            addSurfaceClickListeners();
        }
        
        // Ensure the stories tab has the popup functionality
        const storiesTab = document.querySelector('.tab[data-tab="stories"]');
        if (storiesTab) {
            storiesTab.addEventListener('click', function() {
                console.log('general.js: Stories tab clicked, ensuring popup elements are initialized');
                // Re-initialize popup elements when switching to stories tab
                setTimeout(() => {
                    initPopupElements();
                }, 500);
            });
        }
    }, 1500);
});

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ PERIODIC TABLE LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

async function loadPeriodicTable() {
    const startTime = performance.now();
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

        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Use mobile-friendly card layout
            tableContainer.innerHTML = generateMobilePeriodicTable(rows);
        } else {
            // Use traditional table layout
            tableContainer.innerHTML = generateDesktopPeriodicTable(rows);
        }
        
        periodicTableLoaded = true; // Set flag to true after successful load
        console.log('general.js: Periodic table HTML generated and inserted.'); // DEBUG

    } catch (error) {
        console.error('general.js: Error loading or parsing periodic table:', error); // Log the specific error
        tableContainer.innerHTML = `<span style="color: red;">Error loading periodic table: ${error.message}. Check console for details.</span>`;
    }
}

function generateMobilePeriodicTable(rows) {
    // Parse the data to extract atoms - use the same logic as desktop table
    const atoms = [];
    const headerCells = rows[0].split('\t');
    const vowels = headerCells.slice(0); // Skip empty first column, include all vowel columns
    // const vowels = headerCells.slice(1); // Skip empty first column, include all vowel columns
    
    // Process data rows (skip header row) - exactly like desktop table
    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split('\t');
        const consonant = cells[0].trim();
        
        // Process each vowel combination
        for (let j = 1; j < cells.length; j++) {
            const cellContent = cells[j].trim();
            const vowel = vowels[j - 1];
            
            // Use the same logic as desktop table for determining valid cells
            if (cellContent && cellContent !== '\\' && !cellContent.includes('()')) {
                const atom = consonant + vowel;
                
                // Extract meaning from parentheses - same as desktop
                const parenIndex = cellContent.indexOf('(');
                let meaning = '';
                if (parenIndex !== -1) {
                    meaning = cellContent.substring(parenIndex + 1, cellContent.length - 1).trim();
                }
                
                atoms.push({
                    atom: atom,
                    consonant: consonant,
                    vowel: vowel,
                    meaning: meaning
                });
            }
        }
    }
    
    // Group atoms by consonant, preserving original order
    const groupedAtoms = {};
    const consonantOrder = []; // Track order of consonants as they appear
    
    atoms.forEach(atom => {
        if (!groupedAtoms[atom.consonant]) {
            groupedAtoms[atom.consonant] = [];
            consonantOrder.push(atom.consonant);
        }
        groupedAtoms[atom.consonant].push(atom);
    });
    
    // Generate HTML
    let html = '<div class="mobile-periodic-table">';
    html += '<h2>Sesowi Atoms</h2>';
    html += '<p>Click any atom to see its details</p>';
    
    // Use original consonant order (don't sort)
    consonantOrder.forEach(consonant => {
        html += `<div class="consonant-group">`;
        html += `<h3 class="consonant-header">${consonant}</h3>`;
        html += `<div class="atoms-grid">`;
        
        groupedAtoms[consonant].forEach(atom => {
            html += `<div class="atom-card" data-atom="${atom.atom}" data-meaning="${atom.meaning}">`;
            html += `<div class="atom-surface">${atom.atom}</div>`;
            if (atom.meaning) {
                html += `<div class="atom-meaning">${atom.meaning}</div>`;
            }
            html += `</div>`;
        });
        
        html += `</div></div>`;
    });
    
    html += '</div>';
    
    // Ensure the popup element exists and is properly initialized before adding listeners
    setTimeout(() => {
        // Make sure popup is initialized first
        initPopupElements();
        
        // Ensure the word-info-popup has the correct z-index and is positioned properly
        const wordInfoPopup = document.getElementById('word-info-popup');
        if (wordInfoPopup) {
            // Set explicit styles to ensure visibility
            wordInfoPopup.style.position = 'absolute';
            wordInfoPopup.style.zIndex = '9999'; // Higher z-index to ensure it's on top
            console.log('Mobile periodic table: Popup element prepared for visibility');
        }
        
        // Now add the click listeners
        addMobilePeriodicTableListeners();
    }, 100);
    
    return html;
}

function addMobilePeriodicTableListeners() {
    const atomCards = document.querySelectorAll('.atom-card');
    
    // Create a dedicated mobile popup if it doesn't exist
    let mobilePopup = document.getElementById('mobile-word-info-popup');
    if (!mobilePopup) {
        mobilePopup = document.createElement('div');
        mobilePopup.id = 'mobile-word-info-popup';
        mobilePopup.className = 'word-info-popup mobile-popup';
        mobilePopup.innerHTML = `
            <div class="popup-header">
                <span id="mobile-popup-word"></span>
                <span class="popup-close">&times;</span>
            </div>
            <div id="mobile-popup-content" class="popup-content"></div>
        `;
        
        // Add the popup to the document body
        document.body.appendChild(mobilePopup);
        
        // Add close button functionality
        const closeBtn = mobilePopup.querySelector('.popup-close');
        closeBtn.addEventListener('click', () => {
            mobilePopup.style.display = 'none';
        });
        
        console.log('Created dedicated mobile popup:', mobilePopup);
    }
    
    // Add click listeners to atom cards
    atomCards.forEach(card => {
        card.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event bubbling
            
            const atom = card.dataset.atom;
            
            // Get popup elements
            const popupWord = document.getElementById('mobile-popup-word');
            const popupContent = document.getElementById('mobile-popup-content');
            
            // Use the shared content generation function
            const contentData = generateWordInfoContent(atom);
            
            // Set the header
            popupWord.innerHTML = contentData.headerHTML;
            
            // Set the content
            popupContent.innerHTML = '';
            if (contentData.contentElement) {
                popupContent.appendChild(contentData.contentElement.cloneNode(true));
            } else if (contentData.contentHTML) {
                popupContent.innerHTML = contentData.contentHTML;
            }
            
            // Position the popup
            const rect = card.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            // Position popup below the atom card
            const top = rect.bottom + scrollTop + 10;
            const left = rect.left + scrollLeft + (rect.width / 2) - 125; // Assuming popup width ~250px
            
            // Apply styles to ensure visibility
            mobilePopup.style.display = 'block';
            mobilePopup.style.visibility = 'visible';
            mobilePopup.style.zIndex = '9999';
            mobilePopup.style.position = 'absolute';
            mobilePopup.style.top = `${top}px`;
            mobilePopup.style.left = `${left}px`;
            mobilePopup.style.width = '250px';
            mobilePopup.style.backgroundColor = 'white';
            mobilePopup.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
            mobilePopup.style.border = '2px solid #009c36';
            
            console.log('Mobile popup displayed at:', { top, left });
            console.log('Mobile popup styles:', {
                display: mobilePopup.style.display,
                visibility: mobilePopup.style.visibility,
                zIndex: mobilePopup.style.zIndex,
                position: mobilePopup.style.position
            });
        });
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (event) => {
        const mobilePopup = document.getElementById('mobile-word-info-popup');
        if (mobilePopup && !event.target.closest('.atom-card') && !event.target.closest('#mobile-word-info-popup')) {
            mobilePopup.style.display = 'none';
        }
    });
}

function generateDesktopPeriodicTable(rows) {
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
    return tableHTML;
}

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~ HIDING AND COPYING~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

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
                console.log("general.js: Text copied to clipboard: " + text);
                // Optional: Show a brief "Copied!" message.
                // You could add a small <span> next to the button and toggle its visibility.
            }).catch(err => {
                console.error('general.js: Failed to copy text: ', err);
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
            console.log('general.js: Fallback: Copying text command was ' + msg);
        } catch (err) {
            console.error('general.js: Fallback: Oops, unable to copy', err);
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

// Function to display Sesowi -> English results
function displaySesowiResults(results) {
    const startTime = performance.now();
    const treveroseToEnglishResults = document.getElementById('treveroseToEnglishResults');
    treveroseToEnglishResults.innerHTML = ''; // Clear previous results

    if (results.length > 0) {
        results.forEach(result => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'dictionary-entry';

            // Sesowi word (surface and gloss)
            const wordDiv = document.createElement('div');
            wordDiv.className = 'word';
            if (result.entry.surface) {
                const surfaceSpan = document.createElement('span');
                surfaceSpan.className = 'surface';
                surfaceSpan.textContent = result.entry.surface;
                wordDiv.appendChild(surfaceSpan);
                wordDiv.appendChild(document.createTextNode(' '));
            }
            const glossSpan = document.createElement('span');
            glossSpan.className = 'gloss';
            glossSpan.textContent = result.gloss; // Use the full gloss
            wordDiv.appendChild(glossSpan);
            entryDiv.appendChild(wordDiv);

            // English definitions
            const definitionsDiv = document.createElement('div');
            definitionsDiv.className = 'definition';
            if (result.entry.facets) {
                DEFINITION_FIELDS.forEach(field => {
                    if (result.entry.facets[field]) {
                        result.entry.facets[field].forEach(def => {
                            const defP = document.createElement('p');
                            defP.innerHTML = `<span class="pos">(${field})</span> ${def}`;
                            definitionsDiv.appendChild(defP);
                        });
                    }
                });
                 // Also display supergloss if present
                if (result.entry.facets.supergloss) {
                     result.entry.facets.supergloss.forEach(def => {
                        const defP = document.createElement('p');
                        defP.innerHTML = `<span class="pos">(supergloss)</span> ${def}`;
                        definitionsDiv.appendChild(defP);
                    });
                }
            }
            entryDiv.appendChild(definitionsDiv);

            treveroseToEnglishResults.appendChild(entryDiv);
        });
    } else {
        treveroseToEnglishResults.innerHTML = '<p>No Sesowi matches found.</p>';
    }
    console.log(`general.js: TIMING: displaySesowiResults for ${results.length} results took ${(performance.now() - startTime).toFixed(2)}ms`);
}

// Function to display English -> Sesowi results
function displayEnglishResults(results, query) {
    const startTime = performance.now();
    const englishToTreveroseResults = document.getElementById('english-to-trevorese');
    englishToTreveroseResults.innerHTML = ''; // Clear previous results

    if (results.length > 0) {
        results.forEach(result => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'dictionary-entry';

            // Matched English definition (word part)
            const wordDiv = document.createElement('div');
            wordDiv.className = 'word';

            // Display the first matched English definition with highlighting
            if (result.matchedDefs && result.matchedDefs.length > 0) {
                const firstMatch = result.matchedDefs[0]; // Display the first definition that matched
                const matchedDef = firstMatch.def;
                const matchedField = firstMatch.field;

                // Highlight the matched part in the definition
                const lowerQuery = query.toLowerCase();
                const lowerDef = matchedDef.toLowerCase();
                const matchIndex = lowerDef.indexOf(lowerQuery);

                if (matchIndex !== -1) {
                    // Text before match
                    if (matchIndex > 0) {
                        wordDiv.appendChild(document.createTextNode(matchedDef.substring(0, matchIndex)));
                    }
                    // Highlighted match
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = 'highlight';
                    highlightSpan.textContent = matchedDef.substring(matchIndex, matchIndex + query.length);
                    wordDiv.appendChild(highlightSpan);
                    // Text after match
                    if (matchIndex + query.length < matchedDef.length) {
                        wordDiv.appendChild(document.createTextNode(matchedDef.substring(matchIndex + query.length)));
                    }
                } else {
                    // Fallback if somehow index is -1 despite being a match
                    wordDiv.textContent = matchedDef;
                }

                // Add part of speech/field
                const posSpan = document.createElement('span');
                posSpan.className = 'pos';
                posSpan.textContent = ` (${matchedField})`;
                wordDiv.appendChild(posSpan);
            }
            entryDiv.appendChild(wordDiv);

            // Sesowi translation (definition part)
            const translationDiv = document.createElement('div');
            translationDiv.className = 'definition';
            
            // Handle compound words properly
            const isCompound = result.gloss.includes('-');
            let surfaceToShow = '';

            if (isCompound) {
                // For compound words, we need to build the surface form from the component atoms
                const glossParts = result.gloss.split('-');
                const surfaceParts = [];

                // Get surface form for each part of the compound
                for (const part of glossParts) {
                    if (window.atomgloss_to_surface && window.atomgloss_to_surface[part]) {
                        surfaceParts.push(window.atomgloss_to_surface[part]);
                    } else {
                        // If we can't find the surface for a part, use the part itself
                        surfaceParts.push(part);
                    }
                }

                // Join the surface parts to form the compound surface
                surfaceToShow = surfaceParts.join('');
                
                // Add supergloss annotation if available
                const supergloss = window.compounds && window.compounds[result.gloss];
                if (supergloss) {
                    surfaceToShow += ` (${supergloss} > ${result.gloss})`;
                } else {
                    surfaceToShow += ` (${result.gloss})`;
                }
            } else if (result.entry.surface) {
                // For atomic words, use the surface directly
                surfaceToShow = result.entry.surface;
                surfaceToShow += ` (${result.gloss})`;
            } else {
                // Fallback if no surface is available
                surfaceToShow = result.gloss;
            }

            // Display the surface form
            const surfaceSpan = document.createElement('span');
            surfaceSpan.className = 'surface';
            surfaceSpan.textContent = surfaceToShow;
            translationDiv.appendChild(surfaceSpan);
            entryDiv.appendChild(translationDiv);

            englishToTreveroseResults.appendChild(entryDiv);
        });
    } else {
        englishToTreveroseResults.innerHTML = '<p>No English matches found.</p>';
    }
    console.log(`general.js: TIMING: displayEnglishResults for ${results.length} results took ${(performance.now() - startTime).toFixed(2)}ms`);
}

// Listen for window resize to handle mobile/desktop switching
window.addEventListener('resize', () => {
    // If periodic table is loaded, check if we need to switch layouts
    if (periodicTableLoaded) {
        const currentIsMobile = window.innerWidth <= 768;
        const tableContainer = document.getElementById('periodic-table');
        
        // Check if current layout doesn't match screen size
        const hasMobileLayout = tableContainer.querySelector('.mobile-periodic-table');
        const hasDesktopLayout = tableContainer.querySelector('.table-container');
        
        if (currentIsMobile && hasDesktopLayout) {
            // Switch to mobile layout
            loadPeriodicTable();
        } else if (!currentIsMobile && hasMobileLayout) {
            // Switch to desktop layout
            loadPeriodicTable();
        }
    }
}, { passive: true });

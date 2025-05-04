/**
 * Stories module for Trevorese
 * Loads and displays stories from stories.tsv
 */

// Import functions from other modules
// Note: These functions are already available globally via script includes in index.html
// This comment is just to document the dependencies
// - chomp_tokens from fsa.js

// Global variables
let stories = [];

/**
 * Parse the stories.tsv file and organize stories
 * @param {string} tsvContent - The content of the stories.tsv file
 */
function parseStories(tsvContent) {
    console.log("Parsing stories from TSV...");
    
    // Split the content into lines
    const lines = tsvContent.split('\n');
    
    // Skip the header line
    let currentStory = null;
    let storyCount = 0;
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if this is a story delimiter
        if (line === "___") {
            // Start a new story on the next line
            currentStory = null;
            continue;
        }
        
        // Skip lines that start with a tab (empty first column)
        if (line.startsWith('\t')) {
            console.log("Skipping line with empty first column:", line);
            continue;
        }
        
        // Split the line into columns
        const columns = line.split('\t');
        const trevorese = columns[0] ? columns[0].trim() : "";
        const english = columns.length > 1 ? columns[1].trim() : "";
        const notes = columns.length > 2 ? columns[2].trim() : "";
        
        // Skip lines with empty Trevorese (additional check)
        if (!trevorese) continue;
        
        // If we don't have a current story, this line is a title
        if (!currentStory) {
            currentStory = {
                title: {
                    trevorese: trevorese,
                    english: english
                },
                note: notes,
                lines: []
            };
            stories.push(currentStory);
            storyCount++;
            console.log(`Story ${storyCount}: "${trevorese}" (${english})`);
        } else {
            // Add this line to the current story
            currentStory.lines.push({
                trevorese: trevorese,
                english: english,
                note: notes
            });
            
            // Log the first line of each story
            if (currentStory.lines.length === 1) {
                console.log(`First line: "${trevorese}" (${english})`);
            }
        }
    }
    
    console.log(`Total stories parsed: ${storyCount}`);
    return stories;
}

/**
 * Check if a word can be properly tokenized and glossed
 * @param {string} word - The word to check
 * @returns {boolean} True if the word can be tokenized and all tokens can be mapped to glosses
 */
function isWordGlossable(word) {
    try {
        // Use the FSA to tokenize the surface form
        const tokenized = chomp_tokens(word.replace(/-/g, '')); // Remove any hyphens for tokenization
        
        // Check if all tokens can be mapped to glosses
        for (const surfaceToken of tokenized) {
            if (!window.surface_to_gloss || !(surfaceToken in window.surface_to_gloss)) {
                return false; // Found an unglossable token
            }
        }
        
        return true; // All tokens are glossable
    } catch (error) {
        return false; // Tokenization failed
    }
}

/**
 * Create HTML for a story
 * @param {Object} story - The story object
 * @param {number} index - The index of the story
 * @returns {string} HTML for the story
 */
function createStoryHTML(story, index) {
    // Create the collapsible header
    const storyTitle = `${story.title.trevorese} (${story.title.english})`;
    
    // Create the story content with each word in a surface div
    let storyContent = '';
    
    // Add each line of the story
    story.lines.forEach(line => {
        // For each line, we need to handle spaces and punctuation properly
        const trevorese = line.trevorese;
        
        // Use a regex to tokenize the line into words and non-words
        const tokens = trevorese.match(/[\w-]+|[^\w\s-]+|\s+/g) || [];
        
        // Process each token
        let lineHTML = '';
        
        tokens.forEach(token => {
            // Check if token is a word (contains alphanumeric characters)
            if (/[\w-]/.test(token)) {
                // It's a word or compound word
                if (token.includes('-')) {
                    // For compound words, use the dictionary tokenizer
                    const [words, punct] = window.trevorese_dictionary.tokenize(token);
                    
                    // Build HTML for compound word
                    for (let i = 0; i < words.length; i++) {
                        lineHTML += punct[i];
                        // Check if the word is glossable
                        const isGlossable = isWordGlossable(words[i]);
                        const cssClass = isGlossable ? 'surface' : 'surface-notfound';
                        lineHTML += `<span class="${cssClass}" onclick="showWordInfoPopup(event, '${words[i]}')">${words[i]}</span>`;
                    }
                    lineHTML += punct[words.length] || '';
                } else {
                    // Regular word - check if it's glossable
                    const isGlossable = isWordGlossable(token);
                    const cssClass = isGlossable ? 'surface' : 'surface-notfound';
                    lineHTML += `<span class="${cssClass}" onclick="showWordInfoPopup(event, '${token}')">${token}</span>`;
                }
            } else if (/\s+/.test(token)) {
                // It's whitespace - preserve it
                lineHTML += token;
            } else {
                // It's punctuation or other non-word characters
                lineHTML += token;
            }
        });
        
        // Add the line to the story content with data attributes for English translation and note
        const escapedEnglish = (line.english || '').replace(/"/g, '&quot;');
        const escapedNote = (line.note || '').replace(/"/g, '&quot;');
        storyContent += `<div class="story-line" data-english="${escapedEnglish}" data-note="${escapedNote}">${lineHTML}</div>`;
    });
    
    // Return the complete story HTML using the same structure as tutorial tab
    return `
        <div class="section-h2">
            <div class="collapsible-header" data-story-id="${index}">${storyTitle}</div>
            <div class="collapsible-content">
                <div class="story-content">
                    ${storyContent}
                </div>
            </div>
        </div>
    `;
}

/**
 * Load and display the stories
 */
function loadStories() {
    console.log("Loading stories...");
    
    // Get the stories container
    const storiesContainer = document.getElementById('stories-container');
    
    // Fetch the stories.tsv file
    fetch('stories.tsv')
        .then(response => response.text())
        .then(tsvContent => {
            // Parse the stories
            parseStories(tsvContent);
            
            // Create HTML for each story
            let storiesHTML = '';
            stories.forEach((story, index) => {
                storiesHTML += createStoryHTML(story, index);
            });
            
            // Add the stories to the container
            storiesContainer.innerHTML = storiesHTML;
            
            // Add event listeners to the collapsible elements
            setupCollapsibles();
            
            // Set up long-press handlers for translation popups
            setupLongPressHandlers();
        })
        .catch(error => {
            console.error("Error loading stories:", error);
            storiesContainer.innerHTML = `<p>Error loading stories: ${error.message}</p>`;
        });
}

/**
 * Set up collapsible functionality for stories
 */
function setupCollapsibles() {
    const collapsibleHeaders = document.querySelectorAll('#stories-container .collapsible-header');
    
    collapsibleHeaders.forEach(header => {
        // Add the click handler to toggle visibility
        header.addEventListener('click', function() {
            // Toggle the open class
            this.classList.toggle('open');
            
            // Toggle the visibility of the next sibling (content)
            const content = this.nextElementSibling;
            if (content && content.classList.contains('collapsible-content')) {
                content.classList.toggle('open');
            }
        });
    });
    
    // All stories start collapsed by default
}

/**
 * Set up long-press functionality for showing translations
 */
function setupLongPressHandlers() {
    // Variables to track long press
    let longPressTimer;
    let isLongPress = false;
    const longPressDuration = 500; // milliseconds
    
    // Create a translation popup element
    const translationPopup = document.createElement('div');
    translationPopup.className = 'translation-popup';
    document.body.appendChild(translationPopup);
    
    // Function to show the translation popup
    function showTranslationPopup(event, storyLine) {
        // Get the English translation and note from data attributes
        const english = storyLine.getAttribute('data-english');
        const note = storyLine.getAttribute('data-note');
        
        // Create the popup content
        let popupContent = '';
        if (english) {
            popupContent += `<div class="english">${english}</div>`;
        }
        if (note) {
            popupContent += `<div class="note">${note}</div>`;
        }
        
        // If there's no content, don't show the popup
        if (!popupContent) {
            return;
        }
        
        // Set the popup content
        translationPopup.innerHTML = popupContent;
        
        // Position the popup near the clicked element
        const rect = storyLine.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate position (centered below the line)
        const top = rect.bottom + scrollTop + 5; // 5px below the line
        const left = rect.left + scrollLeft;
        
        // Set the position
        translationPopup.style.top = `${top}px`;
        translationPopup.style.left = `${left}px`;
        
        // Show the popup
        translationPopup.style.display = 'block';
    }
    
    // Function to hide the translation popup
    function hideTranslationPopup() {
        translationPopup.style.display = 'none';
    }
    
    // Add event listeners to all surface spans
    function addSurfaceEventListeners() {
        const surfaceSpans = document.querySelectorAll('#stories-container .surface');
        
        surfaceSpans.forEach(span => {
            // Find the parent story-line element
            const storyLine = span.closest('.story-line');
            if (!storyLine) return;
            
            // Add mousedown event for long press
            span.addEventListener('mousedown', function(event) {
                // Start the long press timer
                isLongPress = false;
                clearTimeout(longPressTimer);
                longPressTimer = setTimeout(function() {
                    isLongPress = true;
                    showTranslationPopup(event, storyLine);
                }, longPressDuration);
            });
            
            // Add mouseup event to cancel long press
            span.addEventListener('mouseup', function() {
                clearTimeout(longPressTimer);
                // If it wasn't a long press, don't hide the popup
                // This allows the regular click to show the word info popup
                if (!isLongPress) {
                    return;
                }
            });
            
            // Add mouseleave event to cancel long press
            span.addEventListener('mouseleave', function() {
                clearTimeout(longPressTimer);
            });
        });
    }
    
    // Add click event to document to hide the popup when clicking outside
    document.addEventListener('click', function(event) {
        if (!translationPopup.contains(event.target) && 
            !event.target.classList.contains('surface')) {
            hideTranslationPopup();
        }
    });
    
    // Call the function to add event listeners
    addSurfaceEventListeners();
}

// Initialize stories when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the stories tab
    const storiesTab = document.querySelector('.tab[data-tab="stories"]');
    if (storiesTab) {
        // Load stories when the stories tab is clicked
        storiesTab.addEventListener('click', function() {
            if (stories.length === 0) {
                loadStories();
            }
        });
        
        // Also load stories if the stories tab is active by default
        if (storiesTab.classList.contains('active')) {
            loadStories();
        }
    }
});

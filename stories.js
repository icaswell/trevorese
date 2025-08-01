/**
 * Stories module for Sesowi
 * Loads and displays stories from stories.tsv
 */

// Import functions from other modules
// Note: These functions are already available globally via script includes in index.html
// This comment is just to document the dependencies
// - chomp_tokens from fsa.js

// Global variables
let stories = [];
let isLoadingStories = false;

// Define the eye icon as a variable for easy updating
const EYE_ICON = '🍄'; //' '🙀'; // 🏵️  'ᘛ⁐̤ᕐᐷ'; //'👁'; 🧿 👀𖥂◉

/**
 * Parse the stories.tsv file and organize stories
 * @param {string} tsvContent - The content of the stories.tsv file
 */
function parseStories(tsvContent) {
    console.log("stories.js: Parsing stories from TSV...");

    // Clear the existing stories array before parsing
    stories = [];
    
    // Split the content into lines
    const lines = tsvContent.split('\n');
    
    // Skip the header line
    let currentStory = null;
    let storyCount = 0;
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
        
        // Skip lines that start with a tab (empty first column)
        if (lines[i].startsWith('\t')) {
            console.log("stories.js: Skipping line with empty first column:", lines[i]);
            continue;
        }
 
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Check if this is a story delimiter
        if (line === "___") {
            // Start a new story on the next line
            currentStory = null;
            continue;
        }
       
        // Split the line into columns
        const columns = line.split('\t');
        const trevorese = columns[0] ? columns[0].trim() : "";
        const english = columns.length > 1 ? columns[1].trim() : "";
        const notes = columns.length > 2 ? columns[2].trim() : "";
        
        // Skip lines with empty Sesowi (additional check)
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
            console.log(`stories.js: Story ${storyCount}: "${trevorese}" (${english})`);
        } else {
            // Add this line to the current story
            currentStory.lines.push({
                trevorese: trevorese,
                english: english,
                note: notes
            });
            
            // Log the first line of each story
            if (currentStory.lines.length === 1) {
                console.log(`stories.js: First line: "${trevorese}" (${english})`);
            }
        }
    }
    
    console.log(`stories.js: Total stories parsed: ${storyCount}`);
    return stories;
}

/**
 * Process text to convert it to surface form with proper spans
 * @param {string} text - The text to process
 * @returns {string} HTML with surface spans
 */
function processTextToSurface(text) {
    // Use a regex to tokenize the text into words and non-words
    const tokens = text.match(/[\w-]+|[^\w\s-]+|\s+/g) || [];
    
    // Process each token
    let html = '';
    
    tokens.forEach(token => {
        // Check if token is a word (contains alphanumeric characters)
        if (/[\w-]/.test(token)) {
            // It's a word or compound word
            if (token.includes('-')) {
                // For compound words, use the dictionary tokenizer
                const [words, punct] = window.trevorese_dictionary.tokenize(token);
                
                // Build HTML for compound word
                for (let i = 0; i < words.length; i++) {
                    html += punct[i];
                    // Check if the word is glossable
                    const isGlossable = isWordGlossable(words[i]);
                    const cssClass = isGlossable ? 'surface' : 'surface-notfound';
                    html += `<span class="${cssClass}" data-word="${words[i]}">${words[i]}</span>`;
                }
                html += punct[words.length] || '';
            } else {
                // Regular word - check if it's glossable
                const isGlossable = isWordGlossable(token);
                const cssClass = isGlossable ? 'surface' : 'surface-notfound';
                html += `<span class="${cssClass}" data-word="${token}">${token}</span>`;
            }
        } else if (/\s+/.test(token)) {
            // It's whitespace - preserve it
            html += token;
        } else {
            // It's punctuation or other non-word characters
            html += token;
        }
    });
    
    return html;
}

/**
 * Check if a word can be properly tokenized and glossed
 * @param {string} word - The word to check
 * @returns {boolean} True if the word can be tokenized and all tokens can be mapped to glosses
 */
function isWordGlossable(word) {
    try {
        // console.log(`stories.js: Checking if word is glossable: '${word}'`);
        
        // We no longer need to check for proper nouns in window.proper_nouns
        // Proper nouns are now handled through the u_ prefix in glosses
        
        // Use the FSA to tokenize the surface form
        const tokenized = chomp_tokens(word.replace(/-/g, ''), true); // Remove any hyphens for tokenization, enable proper noun checking
        // console.log(`stories.js: Tokenized '${word}' into: [${tokenized.join(', ')}]`);
        
        // Check if all tokens can be mapped to glosses
        for (const surfaceToken of tokenized) {
            // We no longer need to check for proper nouns in window.proper_nouns
            // Proper nouns are now identified by glosses with u_ prefix
            
            // Check if the token is in the regular surface_to_gloss mapping
            if (!window.surface_to_gloss || !(surfaceToken in window.surface_to_gloss)) {
                // console.log(`stories.js: Token '${surfaceToken}' is not glossable`);
                return false; // Found an unglossable token
            }
        }
        
        // console.log(`stories.js: Word '${word}' is fully glossable`);
        return true; // All tokens are glossable
    } catch (error) {
        // console.error(`stories.js: Error checking if '${word}' is glossable:`, error);
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
    
    // Array to store images for this story
    const storyImages = [];
    
    // Create the story content with each word in a surface div
    let storyContent = '';
    
    // Add each line of the story
    story.lines.forEach(line => {
        // For each line, we need to handle spaces and punctuation properly
        const trevorese = line.trevorese;
        
        // Check if this line is an image directive (starts with "images:")
        if (trevorese.trim().toLowerCase().startsWith('images:')) {
            // Extract image specifications from the line
            const imagesPart = trevorese.trim().substring(7); // Remove "images:" prefix
            
            // Split by commas, but respect quotes for captions
            let currentSpec = '';
            let inQuotes = false;
            const imageSpecs = [];
            
            for (let i = 0; i < imagesPart.length; i++) {
                const char = imagesPart[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                    currentSpec += char;
                } else if (char === ',' && !inQuotes) {
                    // End of a spec, add it to the array
                    if (currentSpec.trim()) {
                        imageSpecs.push(currentSpec.trim());
                    }
                    currentSpec = '';
                } else {
                    currentSpec += char;
                }
            }
            
            // Add the last spec if there is one
            if (currentSpec.trim()) {
                imageSpecs.push(currentSpec.trim());
            }
            
            // Process each image specification
            imageSpecs.forEach(spec => {
                // Parse the format: filename.png:"caption"
                const colonIndex = spec.indexOf(':');
                
                if (colonIndex !== -1) {
                    // We have a filename with a caption
                    const imgFile = spec.substring(0, colonIndex).trim();
                    let caption = spec.substring(colonIndex + 1).trim();
                    
                    // Remove surrounding quotes from caption if present
                    if (caption.startsWith('"') && caption.endsWith('"')) {
                        caption = caption.substring(1, caption.length - 1);
                    }
                    
                    if (imgFile) {
                        console.log(`stories.js: Adding image ${imgFile} to story with caption: ${caption}`);
                        storyImages.push({ file: imgFile, caption: caption });
                    }
                } else {
                    // Just a filename without a caption
                    if (spec) {
                        console.log(`stories.js: Adding image ${spec} to story without caption`);
                        storyImages.push({ file: spec, caption: null });
                    }
                }
            });
            
            // Skip rendering this line in the story content
            return;
        }
        
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
                        lineHTML += `<span class="${cssClass}" data-word="${words[i]}">${words[i]}</span>`;
                    }
                    lineHTML += punct[words.length] || '';
                } else {
                    // Regular word - check if it's glossable
                    const isGlossable = isWordGlossable(token);
                    const cssClass = isGlossable ? 'surface' : 'surface-notfound';
                    lineHTML += `<span class="${cssClass}" data-word="${token}">${token}</span>`;
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
        
        // Log the translation data for this line
        // console.log(`stories.js: Story line: "${line.trevorese}" | Translation: "${line.english || 'none'}" | Note: "${line.note || 'none'}"`);
        
        // Check if this line is a chorus (laitaisang) or verse (gasangkwai X)
        if (line.trevorese.trim() === 'laitaisang' || line.trevorese.trim().startsWith('gasangkwai')) {
            // Format chorus and verse lines as h4
            storyContent += `<h4 class="story-line" data-english="${escapedEnglish}" data-note="${escapedNote}" data-trevorese="${line.trevorese}"><span class="translation-eye" title="Show translation">${EYE_ICON}</span> ${lineHTML}</h4>`;
        } else {
            // Regular line formatting
            storyContent += `<div class="story-line" data-english="${escapedEnglish}" data-note="${escapedNote}" data-trevorese="${line.trevorese}"><span class="translation-eye" title="Show translation">${EYE_ICON}</span> ${lineHTML}</div>`;
        }
    });
    
    // Process story content and insert images at appropriate positions
    let processedStoryContent = '';
    let imageIndex = 0;
    const storyLines = storyContent.split('</div>');
    
    // Insert first image at the top if available
    if (storyImages.length > 0 && imageIndex < storyImages.length) {
        processedStoryContent += createImageHTML(storyImages[imageIndex]);
        imageIndex++;
    }
    
    // Insert the rest of the images after every 4 lines
    let lineCounter = 0;
    storyLines.forEach((line, index) => {
        if (line.trim()) {
            processedStoryContent += line + '</div>';
            lineCounter++;
            
            // Insert an image after every 4 lines if available
            if (lineCounter % 4 === 0 && imageIndex < storyImages.length) {
                processedStoryContent += createImageHTML(storyImages[imageIndex]);
                imageIndex++;
            }
        }
    });
    
    // Replace the original story content with the processed one
    storyContent = processedStoryContent;
    
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
 * Create HTML for an image
 * @param {Object|string} img - Image object with file and caption or just the filename
 * @returns {string} - HTML for the image
 */
function createImageHTML(img) {
    let html = '';
    
    // Check if img is a string (old format) or an object with file and caption
    if (typeof img === 'string') {
        html = `<div class="story-image-container">
            <img src="img/${img}" alt="Story image" class="story-image">
        </div>`;
    } else {
        // New format with potential caption
        html = `<div class="story-image-container">
            <img src="img/${img.file}" alt="Story image" class="story-image">`;
        
        // Add caption if it exists
        if (img.caption) {
            // Process the caption to convert it to surface form
            const captionHTML = processTextToSurface(img.caption);
            html += `<div class="image-caption">${captionHTML}</div>`;
        }
        
        html += `</div>`;
    }
    
    return html;
}

/**
 * Load and display the stories
 */
function loadStories() {
    if (isLoadingStories) {
        console.log("stories.js: Story loading already in progress.");
        return;
    }
    isLoadingStories = true;
    console.log("stories.js: Loading stories...");
    
    // Get the stories container and clear it
    const storiesContainer = document.getElementById('stories-container');
    storiesContainer.innerHTML = '<p class="loading-message">Loading stories...</p>';
    
    // Add cache busting parameter to prevent browser caching
    const cacheBuster = `?t=${Date.now()}`;
    
    // Fetch the stories.tsv file with cache busting
    fetch(`stories.tsv${cacheBuster}`)
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
            
            // Set up word click handlers for word info popups
            setupWordClickHandlers();
        })
        .catch(error => {
            console.error("stories.js: Error loading stories:", error);
            storiesContainer.innerHTML = `<p>Error loading stories: ${error.message}</p>`;
        })
        .finally(() => {
            isLoadingStories = false;
        });
}

/**
 * Set up collapsible functionality for stories
 */
function setupCollapsibles() {
    const collapsibleHeaders = document.querySelectorAll('#stories-container .collapsible-header');
    
    collapsibleHeaders.forEach(header => {
        // Check if we've already added our click handler
        if (!header.hasAttribute('data-click-handler-added')) {
            // Add the click handler to toggle visibility
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Toggle the collapsed/open class
                this.classList.toggle('collapsed');
                this.classList.toggle('open'); // For backward compatibility
                
                // Toggle the visibility of the next sibling (content)
                const content = this.nextElementSibling;
                if (content && content.classList.contains('collapsible-content')) {
                    // Toggle both display style and open class for maximum compatibility
                    if (content.style.display === 'none' || !content.classList.contains('open')) {
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
    
    // All stories start collapsed by default
    collapsibleHeaders.forEach(header => {
        // Get the content element (next sibling)
        const content = header.nextElementSibling;
        if (content && content.classList.contains('collapsible-content')) {
            // Initially collapse all sections
            header.classList.add('collapsed');
            content.style.display = 'none';
            content.classList.remove('open');
        }
    });
}

/**
 * Set up functionality for showing translations
 */
function setupLongPressHandlers() {
    console.log('stories.js: Setting up translation handlers...');
    
    // Variables to track long press
    let longPressTimer;
    let isLongPress = false;
    const longPressDuration = 500; // milliseconds
    
    // Create a translation popup element if it doesn't exist yet
    let translationPopup = document.getElementById('translation-popup');
    if (!translationPopup) {
        translationPopup = document.createElement('div');
        translationPopup.id = 'translation-popup';
        translationPopup.className = 'translation-popup';
        document.body.appendChild(translationPopup);
        console.log('stories.js: Created translation popup element');
    }
    
    // Function to show the translation popup
    function showTranslationPopup(event, storyLine) {
        console.log('%cstories.js: 📝 SHOWING TRANSLATION POPUP', 'background: #004d4d; color: white; padding: 2px 5px; border-radius: 3px;');
        console.log('stories.js: Story line element:', storyLine);
        
        // Get the English translation and note from data attributes
        const english = storyLine.getAttribute('data-english');
        const note = storyLine.getAttribute('data-note');
        const trevorese = storyLine.getAttribute('data-trevorese');
        
        console.log('stories.js: Translation data:', { 
            trevorese: trevorese,
            english: english, 
            note: note,
            hasEnglish: !!english,
            hasNote: !!note
        });
        
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
            console.error('stories.js: ❌ No content to show in popup! This means the story line has no English translation or note.');
            alert('No translation available for this line: ' + trevorese);
            return;
        }
        
        // Set the popup content
        translationPopup.innerHTML = popupContent;
        console.log('stories.js: Popup content set to:', popupContent);
        
        // Position the popup near the clicked element
        const rect = storyLine.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate position (centered below the line)
        const top = rect.bottom + scrollTop + 5; // 5px below the line
        const left = rect.left + scrollLeft;
        
        // Set the position and ensure visibility
        translationPopup.style.top = `${top}px`;
        translationPopup.style.left = `${left}px`;
        translationPopup.style.display = 'block';
        translationPopup.style.zIndex = '9999'; // Ensure it's on top
        
        // Add a border to make it more visible for debugging
        translationPopup.style.border = '2px solid #004d4d';
        
        console.log('%cstories.js: ✅ Popup should now be visible', 'color: green; font-weight: bold;');
        console.log('stories.js: Popup position:', { top, left });
        console.log('stories.js: Popup element:', translationPopup);
        console.log('stories.js: Popup computed style:', window.getComputedStyle(translationPopup));
    }
    
    // Function to hide the translation popup
    function hideTranslationPopup() {
        if (translationPopup) {
            translationPopup.style.display = 'none';
            
            // Reset the active story line
            if (activeStoryLine) {
                // Find and reset the eye icon if it exists
                const eyeIcon = activeStoryLine.querySelector('.translation-eye');
                if (eyeIcon) {
                    eyeIcon.style.opacity = '0.7';
                    eyeIcon.style.color = '#666';
                }
            }
            activeStoryLine = null;
        }
    }
    
    // Track the currently active story line for the popup
    let activeStoryLine = null;
    
    // Add ESC key event listener to close the translation popup
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            console.log('stories.js: ESC key pressed, hiding translation popup');
            hideTranslationPopup();
        }
    }, { passive: true });
     
    
    //𓁼 ◉👁  
    // Direct event handler for eye icons - using event delegation for better performance
    document.getElementById('stories-container').addEventListener('click', function(event) {
        console.log('stories.js: Click detected in stories container on:', event.target);
        
        // Check if the clicked element is an eye icon
        if (event.target.classList.contains('translation-eye')) {
            event.stopPropagation(); // Prevent event bubbling
            console.log(`stories.js: Eye icon clicked! ${EYE_ICON}`);
            
            // Find the parent story line element (could be div.story-line or h4.story-line)
            const storyLine = event.target.closest('.story-line') || event.target.closest('h4.story-line');
            
            if (storyLine) {
                // Log detailed information about the story line
                const trevorese = storyLine.getAttribute('data-trevorese');
                const english = storyLine.getAttribute('data-english');
                const note = storyLine.getAttribute('data-note');
                
                console.log('stories.js: Found story line element:', storyLine);
                console.log('stories.js: Story line data:', {
                    trevorese: trevorese,
                    english: english,
                    note: note,
                    element: storyLine.outerHTML.substring(0, 100) + '...' // First 100 chars of HTML
                });
                
                // Check if this is the same story line that's currently active
                if (activeStoryLine === storyLine && translationPopup.style.display === 'block') {
                    // If the popup is already showing for this line, hide it
                    console.log('stories.js: Toggling off translation popup');
                    hideTranslationPopup();
                    activeStoryLine = null;
                    
                    // Change the eye icon to indicate closed state
                    event.target.style.opacity = '0.7';
                    event.target.style.color = '#666';
                } else {
                    // Otherwise, show the popup for this line
                    console.log('stories.js: Showing translation popup');
                    showTranslationPopup(event, storyLine);
                    activeStoryLine = storyLine;
                    
                    // Change the eye icon to indicate open state
                    event.target.style.opacity = '1';
                    event.target.style.color = '#004d4d';
                }
            } else {
                console.error('stories.js: ❌ No story line found for eye icon! This should not happen.');
                console.log('stories.js: Parent elements:', event.target.parentElement);
            }
        }
    });
    
    // Add long-press handlers to surface spans
    const surfaceSpans = document.querySelectorAll('#stories-container .surface');
    console.log(`stories.js: Found ${surfaceSpans.length} surface spans to attach long-press to`);
    
    surfaceSpans.forEach(span => {
        // Find the parent story-line element
        const storyLine = span.closest('.story-line') || span.closest('h4.story-line');
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
            if (!isLongPress) {
                return;
            }
        });
        
        // Add mouseleave event to cancel long press
        span.addEventListener('mouseleave', function() {
            clearTimeout(longPressTimer);
        });
    });
    
    // Add click event to document to hide the popup when clicking outside
    document.addEventListener('click', function(event) {
        if (translationPopup && 
            !translationPopup.contains(event.target) && 
            !event.target.classList.contains('surface') &&
            !event.target.classList.contains('translation-eye')) {
            hideTranslationPopup();
        }
    });
    
    console.log('stories.js: Translation handlers setup complete');
}

/**
 * Set up click handlers for words in the stories tab
 */
function setupWordClickHandlers() {
    // Add click event handlers to all surface words
    const surfaceWords = document.querySelectorAll('#stories-container .surface, #stories-container .surface-notfound');
    
    console.log(`stories.js: Setting up click handlers for ${surfaceWords.length} words in stories`);
    
    // First remove any existing click handlers to prevent duplicates
    surfaceWords.forEach(word => {
        // Clone the node to remove all event listeners
        const oldWord = word;
        const newWord = oldWord.cloneNode(true);
        if (oldWord.parentNode) {
            oldWord.parentNode.replaceChild(newWord, oldWord);
        }
    });
    
    // Re-select the words after replacing them
    const refreshedWords = document.querySelectorAll('#stories-container .surface, #stories-container .surface-notfound');
    
    // Add new click handlers
    refreshedWords.forEach(word => {
        word.addEventListener('click', function(event) {
            const wordText = this.getAttribute('data-word');
            if (wordText) {
                console.log(`stories.js: Word clicked: ${wordText}`);
                
                // Check if dictionary data is loaded before processing the click
                if (!window.trevorese_dictionary || Object.keys(window.trevorese_dictionary.vocabs).length === 0) {
                    console.log('stories.js: Click detected but dictionary not fully loaded yet. Please wait a moment and try again.');
                    return;
                }
                
                console.log('stories.js: Click detected in stories container on: ' + wordText);
                showWordInfoPopup(event, wordText);
            }
        });
    });
}

/**
 * Initialize stories when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the stories tab
    const storiesTab = document.querySelector('.tab[data-tab="stories"]');
    if (storiesTab) {
        // Load stories when the stories tab is clicked
        storiesTab.addEventListener('click', function() {
            if (stories.length === 0) {
                loadStories();
            } else {
                // If stories are already loaded, just reapply the click handlers
                console.log('stories.js: Stories already loaded, reapplying click handlers');
                setupWordClickHandlers();
            }
        });
        
        // Also load stories if the stories tab is active by default
        if (storiesTab.classList.contains('active') && stories.length === 0) {
            loadStories();
        }
    }
});

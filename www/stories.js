/**
 * Stories module for Trevorese
 * Loads and displays stories from stories.tsv
 */

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
        
        // Split the line into columns
        const columns = line.split('\t');
        const trevorese = columns[0] ? columns[0].trim() : "";
        const english = columns.length > 1 ? columns[1].trim() : "";
        const notes = columns.length > 2 ? columns[2].trim() : "";
        
        // Skip lines with empty Trevorese
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
                        lineHTML += `<span class="surface">${words[i]}</span>`;
                    }
                    lineHTML += punct[words.length] || '';
                } else {
                    // Regular word
                    lineHTML += `<span class="surface">${token}</span>`;
                }
            } else if (/\s+/.test(token)) {
                // It's whitespace - preserve it
                lineHTML += token;
            } else {
                // It's punctuation or other non-word characters
                lineHTML += token;
            }
        });
        
        // Add the line to the story content
        storyContent += `<div class="story-line">${lineHTML}</div>`;
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

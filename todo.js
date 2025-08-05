// Function to populate the Todo tab
function populateTodoTab() {
    console.log("Populating Todo tab...");
    
    // Get the tables
    const superglossProblemsTable = document.getElementById('supergloss-problems-table').querySelector('tbody');
    const todoNotesTable = document.getElementById('todo-notes-table').querySelector('tbody');
    const missingGlossesTable = document.getElementById('missing-glosses-table').querySelector('tbody');
    const unrecognizedCompoundsTable = document.getElementById('unrecognized-compounds-table').querySelector('tbody');
    const unglossableSurfacesTable = document.getElementById('unglossable-surfaces-table').querySelector('tbody');
    const missingEnglishWordsTable = document.getElementById('missing-english-words-table').querySelector('tbody');
    
    // Clear existing content
    superglossProblemsTable.innerHTML = '';
    todoNotesTable.innerHTML = '';
    missingGlossesTable.innerHTML = '';
    unrecognizedCompoundsTable.innerHTML = '';
    unglossableSurfacesTable.innerHTML = '';
    missingEnglishWordsTable.innerHTML = '';
    
    // Arrays to store issues
    const superglossIssues = [];
    const todoNotes = [];
    const missingGlosses = [];
    const unrecognizedCompounds = [];
    const unglossableSurfaces = [];
    const missingEnglishWords = [];
    
    // Check if dictionary is loaded
    if (!window.trevorese_dictionary || !window.trevorese_dictionary.vocabs) {
        console.error("Dictionary not loaded yet");
        return;
    }
    
    // Process all entries
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[gloss];
        
        // Skip atomic entries or entries with spaces
        if (entry.atomic || gloss.includes(' ')) continue;
        
        // Check for supergloss decomposition issues
        if (entry.facets.supercompound && entry.facets.supercompound.length > 0) {
            const supercompound = entry.facets.supercompound[0];
            const expandedSupercompound = expandSupercompound(entry);
            
            if (expandedSupercompound.replace('--', '-') !== gloss.replace('--', '-')) {
                superglossIssues.push({
                    gloss: gloss,
                    surface: entry.surface || '',
                    expected: gloss,
                    actual: expandedSupercompound
                });
            }
        }
        
        // Check for TODO notes
        if (entry.facets['COMMENTS/TODOS'] && entry.facets['COMMENTS/TODOS'].length > 0) {
            for (const note of entry.facets['COMMENTS/TODOS']) {
                if (note.toUpperCase().includes('TODO')) {
                    todoNotes.push({
                        gloss: gloss,
                        surface: entry.surface || '',
                        note: note
                    });
                }
            }
        }
    }
    
    // Sort issues by gloss
    superglossIssues.sort((a, b) => a.gloss.localeCompare(b.gloss));
    todoNotes.sort((a, b) => a.gloss.localeCompare(b.gloss));
    
    // Populate supergloss issues table
    if (superglossIssues.length > 0) {
        for (const issue of superglossIssues) {
            const row = document.createElement('tr');
            
            const glossCell = document.createElement('td');
            glossCell.textContent = issue.gloss;
            row.appendChild(glossCell);
            
            const surfaceCell = document.createElement('td');
            surfaceCell.textContent = issue.surface;
            row.appendChild(surfaceCell);
            
            const expectedCell = document.createElement('td');
            expectedCell.textContent = issue.expected;
            row.appendChild(expectedCell);
            
            const actualCell = document.createElement('td');
            actualCell.textContent = issue.actual;
            row.appendChild(actualCell);
            
            superglossProblemsTable.appendChild(row);
        }
    } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No supergloss decomposition issues found.';
        row.appendChild(cell);
        superglossProblemsTable.appendChild(row);
    }
    
    // Populate TODO notes table
    if (todoNotes.length > 0) {
        for (const todoItem of todoNotes) {
            const row = document.createElement('tr');
            
            const glossCell = document.createElement('td');
            glossCell.textContent = todoItem.gloss;
            row.appendChild(glossCell);
            
            const surfaceCell = document.createElement('td');
            surfaceCell.textContent = todoItem.surface;
            row.appendChild(surfaceCell);
            
            const noteCell = document.createElement('td');
            noteCell.textContent = todoItem.note;
            row.appendChild(noteCell);
            
            todoNotesTable.appendChild(row);
        }
    } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No TODO notes found.';
        row.appendChild(cell);
        todoNotesTable.appendChild(row);
    }
    
    // Find missing glosses and unrecognized compounds in tutorial files
    findMissingGlosses(missingGlosses, unrecognizedCompounds).then(() => {
        // Scan stories.tsv for unrecognized compounds and unglossable surfaces
        return scanStoriesFile(unrecognizedCompounds, unglossableSurfaces);
    }).then(() => {
        // Check top English words against the dictionary
        checkTopEnglishWords(missingEnglishWords);
        
        // Sort missing glosses by location
        missingGlosses.sort((a, b) => a.location.localeCompare(b.location));
        
        // Populate missing glosses table
        if (missingGlosses.length > 0) {
            for (const missingGloss of missingGlosses) {
                const row = document.createElement('tr');
                
                const glossCell = document.createElement('td');
                glossCell.textContent = missingGloss.gloss;
                row.appendChild(glossCell);
                
                const locationCell = document.createElement('td');
                locationCell.textContent = missingGloss.location;
                row.appendChild(locationCell);
                
                const missingPartCell = document.createElement('td');
                missingPartCell.textContent = missingGloss.missingPart;
                row.appendChild(missingPartCell);
                
                missingGlossesTable.appendChild(row);
            }
        } else {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'No missing glosses found.';
            row.appendChild(cell);
            missingGlossesTable.appendChild(row);
        }
        
        // Sort unrecognized compounds by gloss
        unrecognizedCompounds.sort((a, b) => a.gloss.localeCompare(b.gloss));
        
        // Remove duplicates from unrecognized compounds
        const uniqueUnrecognizedCompounds = [];
        const seenCompounds = new Set();
        
        unrecognizedCompounds.forEach(item => {
            const key = item.gloss.toLowerCase();
            if (!seenCompounds.has(key)) {
                seenCompounds.add(key);
                uniqueUnrecognizedCompounds.push(item);
            }
        });
        
        // Populate unrecognized compounds table
        if (uniqueUnrecognizedCompounds.length > 0) {
            for (const compound of uniqueUnrecognizedCompounds) {
                const row = document.createElement('tr');
                
                const glossCell = document.createElement('td');
                glossCell.textContent = compound.gloss;
                row.appendChild(glossCell);
                
                const locationCell = document.createElement('td');
                locationCell.textContent = compound.location;
                row.appendChild(locationCell);
                
                const surfaceCell = document.createElement('td');
                surfaceCell.textContent = compound.surface;
                row.appendChild(surfaceCell);
                
                unrecognizedCompoundsTable.appendChild(row);
            }
        } else {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'No unrecognized compounds found.';
            row.appendChild(cell);
            unrecognizedCompoundsTable.appendChild(row);
        }
        
        // Sort unglossable surfaces alphabetically
        unglossableSurfaces.sort((a, b) => a.surface.localeCompare(b.surface));
        
        // Remove duplicates from unglossable surfaces
        const uniqueUnglossableSurfaces = [];
        const seenSurfaces = new Set();
        
        unglossableSurfaces.forEach(item => {
            const key = item.surface;
            if (!seenSurfaces.has(key)) {
                seenSurfaces.add(key);
                uniqueUnglossableSurfaces.push(item);
            }
        });
        
        // Populate unglossable surfaces table
        if (uniqueUnglossableSurfaces.length > 0) {
            for (const surface of uniqueUnglossableSurfaces) {
                const row = document.createElement('tr');
                
                const surfaceCell = document.createElement('td');
                surfaceCell.textContent = surface.surface;
                row.appendChild(surfaceCell);
                
                const locationCell = document.createElement('td');
                locationCell.textContent = 'stories.tsv';
                row.appendChild(locationCell);
                
                const storyCell = document.createElement('td');
                storyCell.textContent = surface.story;
                row.appendChild(storyCell);
                
                unglossableSurfacesTable.appendChild(row);
            }
        } else {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 3;
            cell.textContent = 'No unglossable surfaces found.';
            row.appendChild(cell);
            unglossableSurfacesTable.appendChild(row);
        }
        
        console.log(`Found ${superglossIssues.length} supergloss issues, ${todoNotes.length} TODO notes, ${missingGlosses.length} missing glosses, ${uniqueUnrecognizedCompounds.length} unrecognized compounds, and ${unglossableSurfaces.length} unglossable surfaces`);
    });
}

// Helper function to expand supercompound (simplified version)
function expandSupercompound(entry, depth = 0) {
    if (depth > 6) {
        return `ERROR[Depth, ${entry.gloss}]`;
    }
    
    if (entry.atomic) {
        return entry.gloss;
    }
    
    const supercomp = entry.facets.supercompound && entry.facets.supercompound.length > 0 
        ? entry.facets.supercompound[0] 
        : entry.gloss;
    
    const ancestors = [];
    const subglosses = supercomp.split('-');
    
    for (const subgloss of subglosses) {
        const subentry = findEntryByGlossOrSupergloss(subgloss);
        if (!subentry) {
            ancestors.push(`ERROR[Undefined ${subgloss}]`);
        } else {
            ancestors.push(expandSupercompound(subentry, depth + 1));
        }
    }
    
    return ancestors.join('-');
}

// Helper function to find entry by gloss or supergloss
function findEntryByGlossOrSupergloss(gloss) {
    // Direct match in vocabs
    if (window.trevorese_dictionary.vocabs[gloss]) {
        return window.trevorese_dictionary.vocabs[gloss];
    }
    
    // Check if it's a supergloss for any entry
    for (const entryGloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[entryGloss];
        if (entry.facets.supergloss && 
            entry.facets.supergloss.length > 0 && 
            entry.facets.supergloss[0] === gloss) {
            return entry;
        }
    }
    
    return null;
}

// Function to scan stories.tsv for unrecognized compounds and unglossable surfaces
async function scanStoriesFile(unrecognizedCompounds, unglossableSurfaces) {
    try {
        // Fetch the stories.tsv file with cache-busting parameter
        const response = await fetch('stories.tsv?v=' + Date.now()); // Add cache-busting param
        if (!response.ok) {
            console.error(`Error loading stories.tsv: ${response.status}`);
            return;
        }
        
        const tsvContent = await response.text();
        
        // Split the content into lines
        const lines = tsvContent.split('\n');
        
        // Skip the header line
        let currentStory = null;
        
        // Process each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes("images:")) {
                continue
            }
            
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
                continue;
            }
            
            // Split the line into columns
            const columns = line.split('\t');
            const trevorese = columns[0] ? columns[0].trim() : "";
            
            // Skip lines with empty Sesowi
            if (!trevorese) continue;
            
            // If we don't have a current story, this line is a title
            if (!currentStory) {
                currentStory = trevorese;
            }
            
            // Process the Sesowi text
            // Use a regex to tokenize the line into words and non-words
            const tokens = trevorese.match(/[\w-]+|[^\w\s-]+|\s+/g) || [];
            
            // Process each token
            for (const token of tokens) {
                // Skip non-word tokens (spaces, punctuation)
                if (!/[\w-]/.test(token)) continue;
                
                // For any word (whether it has hyphens or not), try to tokenize with FSA
                try {
                    // Use the FSA to tokenize the surface form
                    const tokenized = chomp_tokens(token.replace(/-/g, '')); // Remove any hyphens for tokenization
                    
                    // If we have multiple tokens, this could be a compound
                    if (tokenized.length > 1) {
                        // Check if all tokens can be mapped to glosses
                        const glosses = [];
                        let allTokensFound = true;
                        
                        for (const surfaceToken of tokenized) {
                            if (window.surface_to_gloss && surfaceToken in window.surface_to_gloss) {
                                glosses.push(window.surface_to_gloss[surfaceToken]);
                            } else {
                                allTokensFound = false;
                                // Found an unglossable surface
                                unglossableSurfaces.push({
                                    surface: surfaceToken,
                                    story: currentStory
                                });
                            }
                        }
                        
                        // If all tokens have glosses, check if the compound is in the dictionary
                        if (allTokensFound) {
                            const compoundGloss = glosses.join('-');
                            if (!(compoundGloss in window.compounds)) {
                                // Add to unrecognized compounds
                                unrecognizedCompounds.push({
                                    gloss: compoundGloss,
                                    location: 'stories.tsv',
                                    surface: token
                                });
                            }
                        }
                    } else if (tokenized.length === 1) {
                        // Single token - check if it's in the dictionary
                        const surfaceToken = tokenized[0];
                        if (!window.surface_to_gloss || !(surfaceToken in window.surface_to_gloss)) {
                            // Found an unglossable surface
                            unglossableSurfaces.push({
                                surface: surfaceToken,
                                story: currentStory
                            });
                        }
                    }
                } catch (error) {
                    // If tokenization fails, it's an unglossable surface
                    unglossableSurfaces.push({
                        surface: token,
                        story: currentStory
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error scanning stories.tsv:', error);
    }
}

// Function to check top English words against the dictionary
function checkTopEnglishWords(missingEnglishWords) {
    console.log("Checking top English words...");
    
    // Fetch the top_english.txt file
    fetch('top_english.txt?v=1' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch top_english.txt: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            // Split the text into lines and process each word
            const lines = text.trim().split('\n');
            
            // Process each word
            lines.forEach((word, index) => {
                // Clean the word (remove any numbers or extra whitespace)
                var cleanWord = word.trim().toLowerCase();
                var noSWord = cleanWord;
                if (cleanWord.endsWith('s')) {
                    noSWord = cleanWord.substring(0, cleanWord.length - 1)
                }
                
                // Skip empty lines
                if (!cleanWord) return;
                
                // Check if the word exists in the dictionary
                let wordExists = false;
                
                // Check in English definitions
                for (const gloss in window.trevorese_dictionary.vocabs) {
                    const entry = window.trevorese_dictionary.vocabs[gloss];
                    
                    // Check each facet for the English word
                    for (const field in entry.facets) {
                        // Skip non-definition fields
                        if (field === 'COMMENTS/TODOS' || field === 'notes' || field === 'supercompound') continue;
                        
                        const definitions = entry.facets[field];
                        if (Array.isArray(definitions)) {
                            for (const definition of definitions) {
                                // Check if the definition contains the word as a whole word
                                if (typeof definition === 'string') {
                                    const regex = new RegExp(`\\b${cleanWord}\\b`, 'i');
                                    const noSRegex = new RegExp(`\\b${noSWord}\\b`, 'i');
                                    if (regex.test(definition) || noSRegex.test(definition)) {
                                        wordExists = true;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (wordExists) break;
                    }
                    
                    if (wordExists) break;
                }
                
                // If the word doesn't exist in the dictionary, add it to the list
                if (!wordExists) {
                    missingEnglishWords.push({
                        word: cleanWord,
                        rank: index + 1 // 1-based ranking
                    });
                }
            });
            
            // Update the UI with the missing words
            const missingEnglishWordsTable = document.getElementById('missing-english-words-table').querySelector('tbody');
            
            if (missingEnglishWords.length > 0) {
                // Sort by rank
                missingEnglishWords.sort((a, b) => a.rank - b.rank);
                
                // Add rows to the table
                for (const item of missingEnglishWords) {
                    const row = document.createElement('tr');
                    
                    const wordCell = document.createElement('td');
                    wordCell.textContent = item.word;
                    row.appendChild(wordCell);
                    
                    const rankCell = document.createElement('td');
                    rankCell.textContent = item.rank;
                    row.appendChild(rankCell);
                    
                    missingEnglishWordsTable.appendChild(row);
                }
            } else {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 2;
                cell.textContent = 'All top English words have definitions in Sesowi.';
                row.appendChild(cell);
                missingEnglishWordsTable.appendChild(row);
            }
        })
        .catch(error => {
            console.error("Error loading top_english.txt:", error);
            
            // Show error in the table
            const missingEnglishWordsTable = document.getElementById('missing-english-words-table').querySelector('tbody');
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.textContent = `Error loading top_english.txt: ${error.message}`;
            row.appendChild(cell);
            missingEnglishWordsTable.appendChild(row);
        });
}

// Function to find missing glosses and unrecognized compounds in tutorial files
async function findMissingGlosses(missingGlosses, unrecognizedCompounds) {
    const tutorialFiles = [
        'tutorial_part_1.html',
        'tutorial_part_2.html',
        'tutorial_part_3.html',
        'tutorial_part_4.html',
        'tutorial_part_5.html'
    ];
    
    // Process each tutorial file
    for (const file of tutorialFiles) {
        try {
            // Fetch the tutorial file content with cache-busting parameter
            const response = await fetch(file + '?v=' + Date.now()); // Add cache-busting param
            if (!response.ok) {
                console.error(`Error loading tutorial file: ${file}`);
                continue;
            }
            
            const htmlContent = await response.text();
            
            // Create a temporary DOM element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Find all spans with the 'gloss' and 'gloss-emph' classes
            const glossSpans = tempDiv.querySelectorAll('span.gloss, span.gloss-emph');
            
            // Process each gloss span
            glossSpans.forEach(span => {
                const glossText = span.textContent.trim();
                
                // Check if it's a compound (contains dashes)
                if (glossText.includes('-')) {
                    // Handle compound word
                    const parts = glossText.split('-');
                    let allPartsFound = true;
                    let missingPart = '';
                    
                    // Process each part
                    for (const part of parts) {
                        const trimmedPart = part.trim().toLowerCase();
                        if (!window.atomgloss_to_surface || !(trimmedPart in window.atomgloss_to_surface)) {
                            // Found a missing part
                            allPartsFound = false;
                            missingPart = trimmedPart;
                            missingGlosses.push({
                                gloss: glossText,
                                location: file,
                                missingPart: trimmedPart
                            });
                            // Only report each gloss once
                            break;
                        }
                    }
                    
                    // If all parts are found but the compound is not in the dictionary
                    if (allPartsFound && !(glossText.toLowerCase() in window.compounds)) {
                        // Generate surface form for the compound
                        let surfaceForm = '';
                        for (const part of parts) {
                            const trimmedPart = part.trim().toLowerCase();
                            if (window.atomgloss_to_surface && trimmedPart in window.atomgloss_to_surface) {
                                surfaceForm += window.atomgloss_to_surface[trimmedPart];
                            }
                        }
                        
                        // Add to unrecognized compounds
                        unrecognizedCompounds.push({
                            gloss: glossText,
                            location: file,
                            surface: surfaceForm
                        });
                    }
                } else {
                    // Handle atomic word
                    const gloss = glossText.toLowerCase();
                    
                    if (!window.atomgloss_to_surface || !(gloss in window.atomgloss_to_surface)) {
                        // Found a missing gloss
                        missingGlosses.push({
                            gloss: glossText,
                            location: file,
                            missingPart: gloss
                        });
                    }
                }
            });
            
        } catch (error) {
            console.error(`Error processing tutorial file ${file}:`, error);
        }
    }
    
    // Remove duplicates (same gloss and missing part)
    const uniqueMissingGlosses = [];
    const seen = new Set();
    
    missingGlosses.forEach(item => {
        const key = `${item.gloss}|${item.missingPart}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMissingGlosses.push(item);
        }
    });
    
    // Clear the array and add unique items back
    missingGlosses.length = 0;
    uniqueMissingGlosses.forEach(item => missingGlosses.push(item));
}



// Initialize the Todo tab when the dictionary is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add tab switching event for Todo tab
    const todoTab = document.querySelector('.tab[data-tab="todo"]');
    if (todoTab) {
        todoTab.addEventListener('click', function() {
            // Make sure dictionary is loaded before populating
            if (window.trevorese_dictionary) {
                populateTodoTab();
            } else {
                console.log("Dictionary not loaded yet, waiting...");
                // Try again in a second
                setTimeout(populateTodoTab, 1000);
            }
        });
    }
});

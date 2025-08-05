// Function to populate the Todo tab
function populateTodoTab() {
    console.log("Populating Todo tab...");
    
    // Add lookup section at the top
    addLookupSection();
    
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

// Function to add lookup section at the top of the todo tab
function addLookupSection() {
    const todoContainer = document.querySelector('#todo .todo-container');
    if (!todoContainer) {
        console.error('Could not find todo container');
        return;
    }
    
    // Check if lookup section already exists and remove it
    const existingLookupSection = document.getElementById('lookup-section');
    if (existingLookupSection) {
        existingLookupSection.remove();
    }
    
    // Create the lookup section
    const lookupSection = document.createElement('div');
    lookupSection.id = 'lookup-section';
    lookupSection.className = 'todo-section';
    
    // Create the header
    const header = document.createElement('h2');
    header.textContent = 'Sample Dictionary Lookups';
    lookupSection.appendChild(header);
    
    // Create container for lookup results
    const lookupResults = document.createElement('div');
    lookupResults.id = 'lookup-results';
    lookupResults.className = 'lookup-results';
    lookupSection.appendChild(lookupResults);
    
    // Insert the lookup section at the top of the todo container
    todoContainer.insertBefore(lookupSection, todoContainer.firstChild);
    
    // Perform lookups for the specified words
    const wordsToLookup = [
        { query: "no move", type: "multi-word gloss" },
        { query: "no di", type: "multi-word surface" },
        { query: "egg-life-eat", type: "phonetic gloss" },
        { query: "aisaka", type: "phonetic surface" }
    ];
    
    // Create a container for all results
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'lookup-results-container';
    
    wordsToLookup.forEach((wordInfo, index) => {
        // Create section for this word
        const wordSection = document.createElement('div');
        wordSection.className = 'lookup-word-section';
        
        // Create header for this word
        const wordHeader = document.createElement('h3');
        wordHeader.textContent = `${wordInfo.query} (${wordInfo.type})`;
        wordSection.appendChild(wordHeader);
        
        // Create container for this word's results
        const wordResults = document.createElement('div');
        wordResults.id = `lookup-results-${index}`;
        wordResults.className = 'dictionary-results';
        wordSection.appendChild(wordResults);
        
        resultsContainer.appendChild(wordSection);
        
        // Perform the lookup
        performLookup(wordInfo.query, wordResults);
    });
    
    lookupResults.appendChild(resultsContainer);
}

// Function to perform lookup for a specific word
function performLookup(query, resultsContainer) {
    console.log('Performing lookup for:', query);
    
    // Check if trevorese_dictionary is available
    if (!window.trevorese_dictionary) {
        console.error('trevorese_dictionary is not available!');
        resultsContainer.innerHTML = '<p>Dictionary data is still loading. Please try again in a moment.</p>';
        return;
    }
    
    if (!query || query.trim() === '') {
        resultsContainer.innerHTML = '<p>No query provided.</p>';
        return;
    }

    query = query.trim().toLowerCase();
    console.log('Normalized query:', query);
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Combined results array to store all matches
    let allMatches = [];
    const addedGlosses = new Set(); // Keep track of glosses already added
    
    if (window.trevorese_dictionary && window.trevorese_dictionary.vocabs) {
        for (const gloss in window.trevorese_dictionary.vocabs) {
            const entry = window.trevorese_dictionary.vocabs[gloss];
            let matchFound = false;
            let matchReason = '';
            
            // 1. Check if the gloss contains the query
            if (gloss.toLowerCase().includes(query)) {
                matchFound = true;
                matchReason = 'gloss';
            }
            
            // 2. Check if the surface form contains the query
            if (entry.surface && entry.surface.toLowerCase().includes(query)) {
                matchFound = true;
                matchReason = 'surface';
            }
            
            // 3. Check if any English definition exactly matches the query (highest priority)
            // 4. Check if any English definition contains the query (lowest priority)
            if (entry.facets) {
                for (const field in entry.facets) {
                    // Skip the notes field
                    if (field === 'COMMENTS/TODOS') continue;
                    
                    const definitions = entry.facets[field];
                    if (Array.isArray(definitions)) {
                        for (const definition of definitions) {
                            if (typeof definition === 'string') {
                                const lowerDef = definition.toLowerCase();
                                
                                // Check for exact match (highest priority)
                                if (lowerDef === query) {
                                    matchFound = true;
                                    matchReason = 'exact_definition';
                                    break;
                                }
                                // Check for partial match (lowest priority)
                                else if (lowerDef.includes(query) && matchReason !== 'exact_definition') {
                                    matchFound = true;
                                    matchReason = 'definition';
                                }
                            }
                        }
                    } else if (typeof definitions === 'string') {
                        const lowerDef = definitions.toLowerCase();
                        
                        // Check for exact match (highest priority)
                        if (lowerDef === query) {
                            matchFound = true;
                            matchReason = 'exact_definition';
                        }
                        // Check for partial match (lowest priority)
                        else if (lowerDef.includes(query) && matchReason !== 'exact_definition') {
                            matchFound = true;
                            matchReason = 'definition';
                        }
                    }
                    
                    if (matchFound && matchReason === 'exact_definition') break;
                }
            }
            
            // If a match was found and we haven't added this gloss yet
            if (matchFound && !addedGlosses.has(gloss)) {
                allMatches.push({
                    gloss: gloss,
                    surface: entry.surface || '',
                    definitions: entry.facets,
                    matchReason: matchReason
                });
                addedGlosses.add(gloss); // Mark this gloss as added
            }
        }
        
        // Also search in surface_to_gloss for any surface forms not already in vocabs
        if (window.surface_to_gloss) {
            for (const surface in window.surface_to_gloss) {
                if (surface.toLowerCase().includes(query)) {
                    const gloss = window.surface_to_gloss[surface];
                    if (!addedGlosses.has(gloss) && window.trevorese_dictionary.vocabs[gloss]) {
                        allMatches.push({
                            gloss: gloss,
                            surface: surface,
                            definitions: window.trevorese_dictionary.vocabs[gloss].facets,
                            matchReason: 'surface'
                        });
                        addedGlosses.add(gloss);
                    }
                }
            }
        }
    }
    
    // Display all matches
    if (allMatches.length > 0) {
        // Sort matches: exact definition matches first, then surface matches, then gloss matches, then partial definition matches
        // Within each category, sort by ascending complexity
        allMatches.sort((a, b) => {
            const reasonOrder = { 'exact_definition': 0, 'surface': 1, 'gloss': 2, 'definition': 3 };
            
            // First sort by match reason
            const reasonDiff = reasonOrder[a.matchReason] - reasonOrder[b.matchReason];
            if (reasonDiff !== 0) return reasonDiff;
            
            // If same match reason, sort by complexity (ascending)
            const entryA = window.trevorese_dictionary.vocabs[a.gloss];
            const entryB = window.trevorese_dictionary.vocabs[b.gloss];
            const complexityA = entryA ? entryA.complexity || 0 : 0;
            const complexityB = entryB ? entryB.complexity || 0 : 0;
            
            return complexityA - complexityB;
        });
        
        allMatches.forEach(match => {
            // Use the unified display function
            // Create a proper entry object with facets and descendants for the display function
            const originalEntry = window.trevorese_dictionary.vocabs[match.gloss];
            const entry = {
                facets: match.definitions,
                descendants: originalEntry ? originalEntry.descendants : [],
                complexity: originalEntry ? originalEntry.complexity : 0
            };
            
            const entryDiv = createDictionaryEntryDisplay(entry, {
                gloss: match.gloss,
                surface: match.surface,
                highlightQuery: (match.matchReason === 'definition' || match.matchReason === 'exact_definition') ? query : null
            });
            
            resultsContainer.appendChild(entryDiv);
        });
        
        // Add click listeners to the newly added dictionary entries
        if (typeof addClickListenersToDoc === 'function') {
            console.log('Adding click listeners to lookup results');
            addClickListenersToDoc(document);
        } else {
            console.error('addClickListenersToDoc function not available');
        }
    } else {
        resultsContainer.innerHTML = '<p>No matches found.</p>';
    }
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

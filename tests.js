'use strict';

/**
 * Runs tests on global variables and displays the results
 */
function runGlobalTests() {
    console.log('Running global tests...');
    const testContainer = document.getElementById('globals-tests');
    const loadingElement = document.getElementById('loading-tests');
    const testsContent = document.getElementById('tests-content');
    
    if (!testContainer) {
        console.error('Test container not found');
        return;
    }
    
    // Check if dictionary data is loaded
    if (!window.trevorese_dictionary) {
        console.log('Dictionary not loaded yet, waiting...');
        setTimeout(runGlobalTests, 500); // Try again in 500ms
        return;
    }
    
    // Add lookup section at the top
    addLookupSection();
    
    // Define the tests to run
    const tests = [
        { query: "window.trevorese_dictionary.vocabs['big-plant-place']", accessor: () => window.trevorese_dictionary.vocabs['big-plant-place'] },
        { query: "window.surface_to_gloss['dapwalu']", accessor: () => window.surface_to_gloss['dapwalu'] },
        { query: "window.compounds['big-plant-place']", accessor: () => window.compounds['big-plant-place'] },
        { query: "window.english_to_gloss['forest']", accessor: () => window.english_to_gloss['forest'] },

        { query: "window.atomgloss_to_surface['big']", accessor: () => window.atomgloss_to_surface['big'] },

        { query: "window.gloss_to_supercompound['big-plant-place']", accessor: () => window.gloss_to_supercompound['big-plant-place'] },

        // Display the full contents of gloss_to_supercompound
        { query: "Full window.gloss_to_supercompound object", accessor: () => window.gloss_to_supercompound },
        { query: "Full window.atomgloss_to_surface object", accessor: () => window.atomgloss_to_surface }
    ];
    
    // Clear previous results
    testContainer.innerHTML = '';
    
    // Run each test and display results
    tests.forEach(test => {
        const testElement = document.createElement('div');
        testElement.className = 'test-item';
        
        // Create query display
        const queryElement = document.createElement('div');
        queryElement.className = 'test-query';
        queryElement.textContent = test.query;
        testElement.appendChild(queryElement);
        
        // Create result display
        const resultElement = document.createElement('div');
        resultElement.className = 'test-result';
        
        try {
            const result = test.accessor();
            if (result === undefined) {
                resultElement.textContent = 'undefined';
                resultElement.classList.add('test-undefined');
            } else if (result === null) {
                resultElement.textContent = 'null';
                resultElement.classList.add('test-null');
            } else {
                // Format object results as JSON
                if (typeof result === 'object') {
                    const formattedResult = JSON.stringify(result, null, 2);
                    const pre = document.createElement('pre');
                    pre.textContent = formattedResult;
                    resultElement.appendChild(pre);
                } else {
                    resultElement.textContent = String(result);
                }
                resultElement.classList.add('test-success');
            }
        } catch (error) {
            resultElement.textContent = `Error: ${error.message}`;
            resultElement.classList.add('test-error');
        }
        
        testElement.appendChild(resultElement);
        testContainer.appendChild(testElement);
    });
    
    // Hide loading message and show test results
    if (loadingElement) loadingElement.style.display = 'none';
    if (testsContent) testsContent.style.display = 'block';
    
    console.log('Global tests completed');
}

// Function to add lookup section at the top of the tests tab
function addLookupSection() {
    const testsContainer = document.querySelector('#tests .tests-container');
    if (!testsContainer) {
        console.error('Could not find tests container');
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
    lookupSection.className = 'test-section';
    
    // Create the header
    const header = document.createElement('h3');
    header.textContent = 'Sample Dictionary Lookups';
    lookupSection.appendChild(header);
    
    // Create container for lookup results
    const lookupResults = document.createElement('div');
    lookupResults.id = 'lookup-results';
    lookupResults.className = 'lookup-results';
    lookupSection.appendChild(lookupResults);
    
    // Insert the lookup section at the top of the tests container
    testsContainer.insertBefore(lookupSection, testsContainer.firstChild);
    
    // Perform lookups for the specified words
    const wordsToLookup = [
        { query: "no move", type: "multi-word gloss" },
        { query: "no di", type: "multi-word surface" },
        { query: "egg-life-eat", type: "phonetic gloss" },
        { query: "aisaka", type: "phonetic surface" },
        { query: "ma-omeng", type: "hyphenated surface" },
        { query: "picky", type: "hyphenated surface definition" }
    ];
    
    // Create a container for all results
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'lookup-results-container';
    
    // OPTIMIZATION: Run lookups asynchronously to prevent UI blocking
    wordsToLookup.forEach((wordInfo, index) => {
        // Create section for this word
        const wordSection = document.createElement('div');
        wordSection.className = 'lookup-word-section';
        
        // Create header for this word
        const wordHeader = document.createElement('h4');
        wordHeader.textContent = `${wordInfo.query} (${wordInfo.type})`;
        wordSection.appendChild(wordHeader);
        
        // Create container for this word's results
        const wordResults = document.createElement('div');
        wordResults.id = `lookup-results-${index}`;
        wordResults.className = 'dictionary-results';
        wordResults.innerHTML = '<p>Loading...</p>'; // Show loading state
        wordSection.appendChild(wordResults);
        
        resultsContainer.appendChild(wordSection);
        
        // OPTIMIZATION: Run lookup asynchronously with a small delay to prevent blocking
        setTimeout(() => {
            performLookup(wordInfo.query, wordResults);
        }, index * 50); // Stagger the lookups by 50ms each
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
    
    // OPTIMIZATION: Cache the vocabs object to avoid repeated property access
    const vocabs = window.trevorese_dictionary.vocabs;
    if (!vocabs) {
        resultsContainer.innerHTML = '<p>No vocabulary data available.</p>';
        return;
    }
    
    // OPTIMIZATION: Use Object.keys() once and iterate more efficiently
    const glossKeys = Object.keys(vocabs);
    const queryLength = query.length;
    
    // OPTIMIZATION: Early exit if query is too short
    if (queryLength < 2) {
        resultsContainer.innerHTML = '<p>Query too short for meaningful search.</p>';
        return;
    }
    
    // OPTIMIZATION: Process entries more efficiently
    for (const gloss of glossKeys) {
        const entry = vocabs[gloss];
        let matchFound = false;
        let matchReason = '';
        
        // OPTIMIZATION: Check gloss first (most common case)
        const lowerGloss = gloss.toLowerCase();
        if (lowerGloss.includes(query)) {
            matchFound = true;
            matchReason = 'gloss';
        }
        
        // OPTIMIZATION: Only check surface if gloss didn't match
        if (!matchFound && entry.surface) {
            const lowerSurface = entry.surface.toLowerCase();
            if (lowerSurface.includes(query)) {
                matchFound = true;
                matchReason = 'surface';
            }
        }
        
        // OPTIMIZATION: Only check definitions if no match found yet
        if (!matchFound && entry.facets) {
            // OPTIMIZATION: Use early exit for exact matches
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
    
    // OPTIMIZATION: Only search surface_to_gloss if we have it and haven't found enough matches
    if (window.surface_to_gloss && allMatches.length < 10) {
        const surfaceKeys = Object.keys(window.surface_to_gloss);
        for (const surface of surfaceKeys) {
            if (surface.toLowerCase().includes(query)) {
                const gloss = window.surface_to_gloss[surface];
                if (!addedGlosses.has(gloss) && vocabs[gloss]) {
                    allMatches.push({
                        gloss: gloss,
                        surface: surface,
                        definitions: vocabs[gloss].facets,
                        matchReason: 'surface'
                    });
                    addedGlosses.add(gloss);
                    
                    // OPTIMIZATION: Limit results to prevent overwhelming the UI
                    if (allMatches.length >= 20) break;
                }
            }
        }
    }
    
    // Display all matches
    if (allMatches.length > 0) {
        // OPTIMIZATION: Limit sorting to first 50 matches for performance
        const matchesToSort = allMatches.slice(0, 50);
        
        // Sort matches: exact definition matches first, then surface matches, then gloss matches, then partial definition matches
        // Within each category, sort by ascending complexity
        matchesToSort.sort((a, b) => {
            const reasonOrder = { 'exact_definition': 0, 'surface': 1, 'gloss': 2, 'definition': 3 };
            
            // First sort by match reason
            const reasonDiff = reasonOrder[a.matchReason] - reasonOrder[b.matchReason];
            if (reasonDiff !== 0) return reasonDiff;
            
            // If same match reason, sort by complexity (ascending)
            const entryA = vocabs[a.gloss];
            const entryB = vocabs[b.gloss];
            const complexityA = entryA ? entryA.complexity || 0 : 0;
            const complexityB = entryB ? entryB.complexity || 0 : 0;
            
            return complexityA - complexityB;
        });
        
        // OPTIMIZATION: Limit display to first 10 matches for performance
        const matchesToDisplay = matchesToSort.slice(0, 10);
        
        matchesToDisplay.forEach(match => {
            // Use the unified display function
            // Create a proper entry object with facets and descendants for the display function
            const originalEntry = vocabs[match.gloss];
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

// Initialize tests when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the tests tab
    const testsTab = document.querySelector('.tab[data-tab="tests"]');
    if (testsTab) {
        // Run tests when the tests tab is clicked
        testsTab.addEventListener('click', function() {
            runGlobalTests();
        });
        
        // Also run tests if the tests tab is active by default
        if (testsTab.classList.contains('active')) {
            runGlobalTests();
        }
    }
});

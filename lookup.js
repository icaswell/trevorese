'use strict';

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~ DICTIONARY SEARCH ~~~~~~~~~~~~~~~~~~~~~~~~~~*/

function searchDictionary(query) {
    console.log('lookup.js: Searching for:', query);
    
    // Check if trevorese_dictionary is available
    if (!window.trevorese_dictionary) {
        console.error('lookup.js: trevorese_dictionary is not available!');
        document.getElementById('dictionary-results').innerHTML = '<p>Dictionary data is still loading. Please try again in a moment.</p>';
        return;
    }
    
    if (!query || query.trim() === '') {
        // Clear results if query is empty
        console.log('lookup.js: Empty query, clearing results');
        document.getElementById('dictionary-results').innerHTML = '';
        return;
    }

    query = query.trim().toLowerCase();
    console.log('lookup.js: Normalized query:', query);
    
    // Results container
    const dictionaryResults = document.getElementById('dictionary-results');
    if (!dictionaryResults) {
        console.error('lookup.js: Could not find dictionary-results element!');
        return;
    }
    
    // Clear previous results
    dictionaryResults.innerHTML = '';
    console.log('lookup.js: Cleared previous results');
    
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
        
        // Search for compound surfaces using our precomputed map
        console.log('lookup.js: Searching for compound surfaces that match:', query);
        
        if (window.surface_to_gloss) {
            for (const surface in window.surface_to_gloss) {
                if (surface.toLowerCase().includes(query)) {
                    const gloss = window.surface_to_gloss[surface];
                    if (!addedGlosses.has(gloss) && window.trevorese_dictionary.vocabs[gloss]) {
                        console.log('lookup.js: Found compound match:', gloss, 'with surface:', surface);
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
            console.log('lookup.js: Checked', Object.keys(window.surface_to_gloss).length, 'compound entries');
        } else {
            console.log('lookup.js: Compound surface map not available');
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
        
        console.log('lookup.js: Sorted matches by reason and complexity:', 
            allMatches.map(m => {
                const entry = window.trevorese_dictionary.vocabs[m.gloss];
                return {
                    reason: m.matchReason,
                    gloss: m.gloss,
                    complexity: entry ? entry.complexity : 'N/A'
                };
            }));
        
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
            
            dictionaryResults.appendChild(entryDiv);
        });
        
        // Add click listeners to the newly added dictionary entries
        if (typeof addClickListenersToDoc === 'function') {
            console.log('lookup.js: Adding click listeners to dictionary search results');
            addClickListenersToDoc(document);
        } else {
            console.error('lookup.js: addClickListenersToDoc function not available');
        }
    } else {
        dictionaryResults.innerHTML = '<p>No matches found.</p>';
    }
}

// Build a mapping of compound surfaces to glosses
function buildCompoundSurfaceMap() {
    console.log('lookup.js: Building compound surface map...');
    // Make sure window.surface_to_gloss exists
    if (!window.surface_to_gloss) {
        window.surface_to_gloss = {};
    }
    
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[gloss];
        if (!entry.atomic) {
            // Compute the surface form for this compound
            const glossParts = gloss.split('-');
            const surfaceParts = [];
            let allPartsFound = true;
            
            for (const part of glossParts) {
                const trimmedPart = part.trim().toLowerCase();
                if (window.atomgloss_to_surface && trimmedPart in window.atomgloss_to_surface) {
                    surfaceParts.push(window.atomgloss_to_surface[trimmedPart]);
                } else {
                    allPartsFound = false;
                    surfaceParts.push(part);
                }
            }
            
            if (allPartsFound) {
                const computedSurface = surfaceParts.join('');
                window.surface_to_gloss[computedSurface] = gloss;
            }
        }
    }
    
    // For backward compatibility
    window.compound_surface_to_gloss = window.surface_to_gloss;
    
    console.log('lookup.js: Surface-to-gloss map built with', Object.keys(window.surface_to_gloss).length, 'entries');
}

// Initialize dictionary search when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('lookup.js: DOMContentLoaded event fired');
    
    // Build the compound surface map after the dictionary is loaded
    if (window.trevorese_dictionary) {
        console.log('lookup.js: trevorese_dictionary is available immediately');
        buildCompoundSurfaceMap();
    } else {
        console.log('lookup.js: Waiting for trevorese_dictionary to be available');
        // If dictionary isn't loaded yet, wait for it
        const checkDictionary = setInterval(function() {
            if (window.trevorese_dictionary) {
                console.log('lookup.js: trevorese_dictionary is now available');
                buildCompoundSurfaceMap();
                clearInterval(checkDictionary);
            }
        }, 100);
    }
    
    const searchInput = document.getElementById('dictionary-search');
    console.log('lookup.js: Dictionary search input element:', searchInput);
    
    if (searchInput) {
        console.log('lookup.js: Adding input event listener to dictionary search');
        searchInput.addEventListener('input', function() {
            console.log('lookup.js: Search input event fired with value:', this.value);
            searchDictionary(this.value);
        });
        
        // Also add a focus event listener to help with debugging
        searchInput.addEventListener('focus', function() {
            console.log('lookup.js: Search input focused');
        });
    } else {
        console.error('lookup.js: Could not find dictionary-search element!');
    }
});

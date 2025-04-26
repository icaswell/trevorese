'use strict';

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~ DICTIONARY SEARCH ~~~~~~~~~~~~~~~~~~~~~~~~~~*/

function searchDictionary(query) {
    console.log('Searching for:', query);
    if (!query || query.trim() === '') {
        // Clear results if query is empty
        document.getElementById('dictionary-results').innerHTML = '';
        return;
    }

    query = query.trim().toLowerCase();
    
    // Results container
    const dictionaryResults = document.getElementById('dictionary-results');
    
    // Clear previous results
    dictionaryResults.innerHTML = '';
    
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
            
            // 3. Check if any English definition contains the query
            if (entry.facets) {
                for (const field in entry.facets) {
                    const definitions = entry.facets[field];
                    if (Array.isArray(definitions)) {
                        for (const definition of definitions) {
                            if (typeof definition === 'string' && definition.toLowerCase().includes(query)) {
                                matchFound = true;
                                matchReason = 'definition';
                                break;
                            }
                        }
                    } else if (typeof definitions === 'string' && definitions.toLowerCase().includes(query)) {
                        matchFound = true;
                        matchReason = 'definition';
                    }
                    
                    if (matchFound && matchReason === 'definition') break;
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
        console.log('Searching for compound surfaces that match:', query);
        
        if (window.compound_surface_to_gloss) {
            for (const surface in window.compound_surface_to_gloss) {
                if (surface.toLowerCase().includes(query)) {
                    const gloss = window.compound_surface_to_gloss[surface];
                    if (!addedGlosses.has(gloss) && window.trevorese_dictionary.vocabs[gloss]) {
                        console.log('Found compound match:', gloss, 'with surface:', surface);
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
            console.log('Checked', Object.keys(window.compound_surface_to_gloss).length, 'compound entries');
        } else {
            console.log('Compound surface map not available');
        }
    }
    
    // Display all matches
    if (allMatches.length > 0) {
        // Sort matches: surface matches first, then gloss matches, then definition matches
        allMatches.sort((a, b) => {
            const reasonOrder = { 'surface': 0, 'gloss': 1, 'definition': 2 };
            return reasonOrder[a.matchReason] - reasonOrder[b.matchReason];
        });
        
        allMatches.forEach(match => {
            // Use the unified display function
            // Create a proper entry object with facets and descendants for the display function
            const originalEntry = window.trevorese_dictionary.vocabs[match.gloss];
            const entry = {
                facets: match.definitions,
                descendants: originalEntry ? originalEntry.descendants : []
            };
            
            const entryDiv = createDictionaryEntryDisplay(entry, {
                gloss: match.gloss,
                surface: match.surface,
                highlightQuery: match.matchReason === 'definition' ? query : null
            });
            
            dictionaryResults.appendChild(entryDiv);
        });
    } else {
        dictionaryResults.innerHTML = '<p>No matches found.</p>';
    }
}

// Build a mapping of compound surfaces to glosses
function buildCompoundSurfaceMap() {
    console.log('Building compound surface map...');
    window.compound_surface_to_gloss = {};
    
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[gloss];
        if (!entry.atomic) {
            // Compute the surface form for this compound
            const glossParts = gloss.split('-');
            const surfaceParts = [];
            let allPartsFound = true;
            
            for (const part of glossParts) {
                const trimmedPart = part.trim().toLowerCase();
                if (window.gloss_to_surface && trimmedPart in window.gloss_to_surface) {
                    surfaceParts.push(window.gloss_to_surface[trimmedPart]);
                } else {
                    allPartsFound = false;
                    surfaceParts.push(part);
                }
            }
            
            if (allPartsFound) {
                const computedSurface = surfaceParts.join('');
                window.compound_surface_to_gloss[computedSurface] = gloss;
            }
        }
    }
    
    console.log('Compound surface map built with', Object.keys(window.compound_surface_to_gloss).length, 'entries');
}

// Initialize dictionary search when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Build the compound surface map after the dictionary is loaded
    if (window.trevorese_dictionary) {
        buildCompoundSurfaceMap();
    } else {
        // If dictionary isn't loaded yet, wait for it
        const checkDictionary = setInterval(function() {
            if (window.trevorese_dictionary) {
                buildCompoundSurfaceMap();
                clearInterval(checkDictionary);
            }
        }, 100);
    }
    
    const searchInput = document.getElementById('dictionary-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchDictionary(this.value);
        });
    }
});

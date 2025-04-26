'use strict';

/*----------------------------------------------------------------------*/
/*~~~~~~~~~~~~~~~~~~~~~~~~~~ DICTIONARY DISPLAY ~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// Function to create a standardized dictionary header display
// Returns HTML string for "surface (gloss)" with proper styling
function createDictionaryHeaderDisplay(options = {}) {
    const {
        surface = '',
        gloss = '',
        showIndex = false,
        index = null
    } = options;
    
    let html = '';
    
    // Add surface if available
    if (surface) {
        html += `<span class="surface">${surface}</span> `;
    }
    
    // Add gloss with optional index
    if (gloss) {
        if (showIndex && index !== null) {
            html += `<span class="gloss">(${gloss})</span> <span class="index">#${index}</span>`;
        } else {
            html += `<span class="gloss">(${gloss})</span>`;
        }
    }
    
    return html;
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
    { tsv: "descendants", display: "descendants" },
    { tsv: "cognates", display: "cognates" },
    { tsv: "COMMENTS/TODOS", display: "Notes" }
];

// Function to create a standardized dictionary entry display
// Can be used by both the popup and the dictionary search results
function createDictionaryEntryDisplay(entry, options = {}) {
    const {
        gloss,
        surface,
        highlightQuery = null,
        showIndex = false,
        index = null,
        hideWordHeader = false  // New option to hide the word header
    } = options;
    
    // Create the container for the entry
    const entryDiv = document.createElement('div');
    entryDiv.className = 'dictionary-entry';
    
    // Create word display with surface and gloss (if not hidden)
    if (!hideWordHeader) {
        // Handle compound words properly
        const isCompound = gloss.includes('-');
        let displaySurface = surface;
        
        if (isCompound && !displaySurface) {
            // For compound words, we need to build the surface form from the component atoms
            const glossParts = gloss.split('-');
            const surfaceParts = [];
            
            for (const part of glossParts) {
                const trimmedPart = part.trim().toLowerCase();
                if (window.gloss_to_surface && trimmedPart in window.gloss_to_surface) {
                    surfaceParts.push(window.gloss_to_surface[trimmedPart]);
                } else {
                    surfaceParts.push(part);
                }
            }
            
            displaySurface = surfaceParts.join('');
        }
        
        // Create the word header div
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        
        // Use the standardized header display function
        wordDiv.innerHTML = createDictionaryHeaderDisplay({
            surface: displaySurface,
            gloss: gloss,
            showIndex: showIndex,
            index: index
        });
        
        entryDiv.appendChild(wordDiv);
    }
    
    // Add definitions in the specified order
    if (entry && entry.facets) {
        // Use FIELD_DISPLAY_ORDER to determine the order of fields
        FIELD_DISPLAY_ORDER.forEach(field => {
            const fieldName = field.tsv;
            
            // Special handling for descendants field
            if (fieldName === 'descendants') {
                // For debugging
                console.log(`Checking descendants for ${gloss}`);
                
                // Check if this entry has any descendants directly
                let hasDescendants = window.gloss_to_descendants && 
                                    window.gloss_to_descendants[gloss] && 
                                    window.gloss_to_descendants[gloss].length > 0;
                                    
                // Also check if this entry's supergloss has descendants
                const supergloss = window.compounds && window.compounds[gloss];
                if (supergloss && window.gloss_to_descendants && window.gloss_to_descendants[supergloss]) {
                    console.log(`Found supergloss ${supergloss} for ${gloss}, checking its descendants`);
                    hasDescendants = hasDescendants || window.gloss_to_descendants[supergloss].length > 0;
                }
                
                if (hasDescendants) {
                    const defDiv = document.createElement('div');
                    defDiv.className = 'definition';
                    
                    const posSpan = document.createElement('span');
                    posSpan.className = 'pos';
                    posSpan.textContent = field.display + ': ';
                    defDiv.appendChild(posSpan);
                    
                    // Format descendants as "surface (supergloss)"
                    let descendants = [];
                    
                    // Get direct descendants if any
                    if (window.gloss_to_descendants[gloss] && window.gloss_to_descendants[gloss].length > 0) {
                        descendants = descendants.concat(window.gloss_to_descendants[gloss]);
                    }
                    
                    // Get descendants from supergloss if applicable
                    const supergloss = window.compounds && window.compounds[gloss];
                    if (supergloss && window.gloss_to_descendants[supergloss] && window.gloss_to_descendants[supergloss].length > 0) {
                        descendants = descendants.concat(window.gloss_to_descendants[supergloss]);
                    }
                    
                    console.log(`Found ${descendants.length} descendants for ${gloss}`);
                    
                    // Format each descendant as "surface (supergloss)"
                    const descendantTexts = descendants.map(d => {
                        console.log(`Formatting descendant: ${JSON.stringify(d)}`);
                        if (d.surface && d.supergloss) {
                            return `${d.surface} (${d.supergloss})`;
                        } else if (d.surface) {
                            return `${d.surface} (${d.gloss})`;
                        } else {
                            return d.gloss;
                        }
                    });
                    
                    const defContent = document.createTextNode(descendantTexts.join(', '));
                    defDiv.appendChild(defContent);
                    entryDiv.appendChild(defDiv);
                }
            }
            // Regular handling for other fields
            else if (entry.facets[fieldName] && entry.facets[fieldName].length > 0) {
                const defDiv = document.createElement('div');
                defDiv.className = 'definition';
                
                const posSpan = document.createElement('span');
                posSpan.className = 'pos';
                posSpan.textContent = field.display + ': ';
                defDiv.appendChild(posSpan);
                
                // Highlight the query in the definition if requested
                if (highlightQuery && typeof highlightQuery === 'string') {
                    const defText = entry.facets[fieldName].join(', ');
                    const lowerDefText = defText.toLowerCase();
                    const lowerQuery = highlightQuery.toLowerCase();
                    let lastIndex = 0;
                    let index = lowerDefText.indexOf(lowerQuery);
                    
                    while (index !== -1) {
                        // Add text before match
                        defDiv.appendChild(document.createTextNode(defText.substring(lastIndex, index)));
                        
                        // Add highlighted match
                        const highlight = document.createElement('span');
                        highlight.className = 'highlight';
                        highlight.textContent = defText.substring(index, index + highlightQuery.length);
                        defDiv.appendChild(highlight);
                        
                        lastIndex = index + highlightQuery.length;
                        index = lowerDefText.indexOf(lowerQuery, lastIndex);
                    }
                    
                    // Add remaining text
                    defDiv.appendChild(document.createTextNode(defText.substring(lastIndex)));
                } else {
                    // No highlighting needed
                    const defContent = document.createTextNode(entry.facets[fieldName].join(', '));
                    defDiv.appendChild(defContent);
                }
                
                entryDiv.appendChild(defDiv);
            }
        });
    }
    
    return entryDiv;
}

// Function to find a vocab entry by surface form
function findVocabEntryBySurface(surface) {
    if (!surface || !window.trevorese_dictionary || !window.trevorese_dictionary.vocabs) {
        return null;
    }
    
    surface = surface.toLowerCase();
    
    // First check if it's a direct match in surface_to_gloss
    if (window.surface_to_gloss && surface in window.surface_to_gloss) {
        const gloss = window.surface_to_gloss[surface];
        if (gloss && window.trevorese_dictionary.vocabs[gloss]) {
            return {
                entry: window.trevorese_dictionary.vocabs[gloss],
                gloss: gloss,
                index: window.trevorese_dictionary.vocabs[gloss].index || null
            };
        }
    }
    
    // Then check compound surfaces
    if (window.compound_surface_to_gloss && surface in window.compound_surface_to_gloss) {
        const gloss = window.compound_surface_to_gloss[surface];
        if (gloss && window.trevorese_dictionary.vocabs[gloss]) {
            return {
                entry: window.trevorese_dictionary.vocabs[gloss],
                gloss: gloss,
                index: window.trevorese_dictionary.vocabs[gloss].index || null
            };
        }
    }
    
    // If not found, search through all entries
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[gloss];
        if (entry.surface && entry.surface.toLowerCase() === surface) {
            return {
                entry: entry,
                gloss: gloss,
                index: entry.index || null
            };
        }
    }
    
    return null;
}

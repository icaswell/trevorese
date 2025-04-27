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
    { tsv: "descendants", display: "Descendants" },
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
            if (fieldName === 'descendants' && entry.descendants && entry.descendants.length > 0) {
                const defDiv = document.createElement('div');
                defDiv.className = 'definition';
                
                const posSpan = document.createElement('span');
                posSpan.className = 'pos';
                posSpan.textContent = field.display + ': ';
                defDiv.appendChild(posSpan);
                
                // Get descendants with their entries for sorting
                const descendantsWithEntries = [];
                
                for (const descendantGloss of entry.descendants) {
                    const descendantEntry = window.trevorese_dictionary.vocabs[descendantGloss];
                    if (descendantEntry) {
                        let descendantSurface = descendantEntry.surface;
                        let supergloss = '';
                        
                        // Get supergloss if available
                        if (descendantEntry.facets.supergloss && descendantEntry.facets.supergloss.length > 0) {
                            supergloss = descendantEntry.facets.supergloss[0];
                        }
                        
                        // Store descendant with its entry and formatted display
                        let formattedDescendant = '';
                        if (descendantSurface && supergloss) {
                            formattedDescendant = `${descendantSurface} (${supergloss})`;
                        } else if (descendantSurface) {
                            formattedDescendant = `${descendantSurface} (${descendantGloss})`;
                        } else {
                            formattedDescendant = descendantGloss;
                        }
                        
                        descendantsWithEntries.push({
                            gloss: descendantGloss,
                            entry: descendantEntry,
                            formatted: formattedDescendant,
                            complexity: descendantEntry.complexity || 0
                        });
                    } else {
                        // For entries not found, add with default complexity
                        descendantsWithEntries.push({
                            gloss: descendantGloss,
                            entry: null,
                            formatted: descendantGloss,
                            complexity: 0
                        });
                    }
                }
                
                // Sort descendants by complexity (ascending)
                descendantsWithEntries.sort((a, b) => a.complexity - b.complexity);
                
                // Extract the formatted descendants after sorting
                const formattedDescendants = descendantsWithEntries.map(d => d.formatted);
                
                // Add formatted descendants to the definition
                const defContent = document.createTextNode(formattedDescendants.join(', '));
                defDiv.appendChild(defContent);
                entryDiv.appendChild(defDiv);
            }
            // Regular field handling
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

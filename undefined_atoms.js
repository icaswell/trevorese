/**
 * Script to identify compounds with glosses where individual elements aren't defined atoms
 * This will be used in the todo tab to display a table of such compounds
 */

// Function to find compounds with undefined atom elements
function findCompoundsWithUndefinedAtoms() {
    console.log("Finding compounds with undefined atom elements...");
    
    // Store the results
    const undefinedAtomCompounds = [];
    
    // Check each compound in the dictionary
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const vocab = window.trevorese_dictionary.vocabs[gloss];
        
        // Skip atomic words and proper nouns
        if (vocab.atomic || gloss.startsWith('u_')) {
            continue;
        }
        
        // Get the parts of the gloss (split by hyphens)
        const glossParts = vocab.gloss_parts;
        
        // Check each part to see if it exists as an atomic word
        const undefinedParts = [];
        for (const part of glossParts) {
            // Skip empty parts
            if (!part) continue;
            
            // Check if this part exists as an atomic word in the dictionary
            if (!window.atomgloss_to_surface[part]) {
                undefinedParts.push(part);
            }
        }
        
        // If we found undefined parts, add this compound to our results
        if (undefinedParts.length > 0) {
            undefinedAtomCompounds.push({
                gloss: vocab.gloss,
                surface: vocab.surface,
                undefinedParts: undefinedParts.join(', ')
            });
        }
    }
    
    console.log(`Found ${undefinedAtomCompounds.length} compounds with undefined atom elements`);
    return undefinedAtomCompounds;
}

// Function to populate the table in the todo tab
function populateUndefinedAtomsTable() {
    console.log("Populating undefined atoms table...");
    
    // Get the compounds with undefined atoms
    const undefinedAtomCompounds = findCompoundsWithUndefinedAtoms();
    
    // Get the table body
    const tableBody = document.getElementById('undefined-atoms-table').querySelector('tbody');
    
    // Clear any existing rows
    tableBody.innerHTML = '';
    
    // Add rows for each compound
    undefinedAtomCompounds.forEach(compound => {
        const row = document.createElement('tr');
        
        // Add cells for gloss, surface, and undefined parts
        const glossCell = document.createElement('td');
        glossCell.textContent = compound.gloss;
        glossCell.className = 'gloss';
        row.appendChild(glossCell);
        
        const surfaceCell = document.createElement('td');
        surfaceCell.textContent = compound.surface;
        surfaceCell.className = 'surface';
        row.appendChild(surfaceCell);
        
        const undefinedPartsCell = document.createElement('td');
        undefinedPartsCell.textContent = compound.undefinedParts;
        row.appendChild(undefinedPartsCell);
        
        // Add the row to the table
        tableBody.appendChild(row);
    });
    
    console.log(`Added ${undefinedAtomCompounds.length} rows to the undefined atoms table`);
}

// Initialize when the dictionary is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the dictionary to be fully loaded
    const checkDictionary = setInterval(function() {
        if (window.trevorese_dictionary && 
            window.atomgloss_to_surface && 
            Object.keys(window.atomgloss_to_surface).length > 0) {
            
            clearInterval(checkDictionary);
            console.log("Dictionary loaded, initializing undefined atoms table...");
            
            // Add event listener for the todo tab
            const todoTab = document.querySelector('.tab[data-tab="todo"]');
            if (todoTab) {
                todoTab.addEventListener('click', function() {
                    // Populate the table when the todo tab is clicked
                    setTimeout(populateUndefinedAtomsTable, 100);
                });
                
                // Also populate if the todo tab is active by default
                if (todoTab.classList.contains('active')) {
                    setTimeout(populateUndefinedAtomsTable, 100);
                }
            }
        }
    }, 100);
});

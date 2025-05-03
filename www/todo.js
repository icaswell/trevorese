// Function to populate the Todo tab
function populateTodoTab() {
    console.log("Populating Todo tab...");
    
    // Get the tables
    const superglossProblemsTable = document.getElementById('supergloss-problems-table').querySelector('tbody');
    const todoNotesTable = document.getElementById('todo-notes-table').querySelector('tbody');
    const missingGlossesTable = document.getElementById('missing-glosses-table').querySelector('tbody');
    
    // Clear existing content
    superglossProblemsTable.innerHTML = '';
    todoNotesTable.innerHTML = '';
    missingGlossesTable.innerHTML = '';
    
    // Arrays to store issues
    const superglossIssues = [];
    const todoNotes = [];
    const missingGlosses = [];
    
    // Check if dictionary is loaded
    if (!window.trevorese_dictionary || !window.trevorese_dictionary.vocabs) {
        console.error("Dictionary not loaded yet");
        return;
    }
    
    // Process all entries
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const entry = window.trevorese_dictionary.vocabs[gloss];
        
        // Skip atomic entries, entries with spaces, or entries starting with u_
        if (entry.atomic || gloss.includes(' ') || gloss.startsWith('u_')) continue;
        
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
    
    // Find missing glosses in tutorial files
    findMissingGlosses(missingGlosses).then(() => {
        // Sort missing glosses by gloss
        missingGlosses.sort((a, b) => a.gloss.localeCompare(b.gloss));
        
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
        
        console.log(`Found ${superglossIssues.length} supergloss issues, ${todoNotes.length} TODO notes, and ${missingGlosses.length} missing glosses`);
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

// Function to find missing glosses in tutorial files
async function findMissingGlosses(missingGlosses) {
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
            // Fetch the tutorial file content
            const response = await fetch(file);
            if (!response.ok) {
                console.error(`Error loading tutorial file: ${file}`);
                continue;
            }
            
            const htmlContent = await response.text();
            
            // Create a temporary DOM element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            // Find all spans with the 'gloss' class
            const glossSpans = tempDiv.querySelectorAll('span.gloss');
            
            // Process each gloss span
            glossSpans.forEach(span => {
                const glossText = span.textContent.trim();
                
                // Check if it's a compound (contains dashes)
                if (glossText.includes('-')) {
                    // Handle compound word
                    const parts = glossText.split('-');
                    
                    // Process each part
                    for (const part of parts) {
                        const trimmedPart = part.trim().toLowerCase();
                        if (!window.atomgloss_to_surface || !(trimmedPart in window.atomgloss_to_surface)) {
                            // Found a missing part
                            missingGlosses.push({
                                gloss: glossText,
                                location: file,
                                missingPart: trimmedPart
                            });
                            // Only report each gloss once
                            break;
                        }
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

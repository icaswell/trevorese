// Function to populate the Todo tab
function populateTodoTab() {
    console.log("Populating Todo tab...");
    
    // Get the tables
    const superglossProblemsTable = document.getElementById('supergloss-problems-table').querySelector('tbody');
    const todoNotesTable = document.getElementById('todo-notes-table').querySelector('tbody');
    
    // Clear existing content
    superglossProblemsTable.innerHTML = '';
    todoNotesTable.innerHTML = '';
    
    // Arrays to store issues
    const superglossIssues = [];
    const todoNotes = [];
    
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
    
    console.log(`Found ${superglossIssues.length} supergloss issues and ${todoNotes.length} TODO notes`);
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

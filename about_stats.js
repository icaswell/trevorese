// Script to update the vocabulary statistics on the About page

// Function to check if dictionary data is loaded
function isDictionaryLoaded() {
    return window.atomgloss_to_surface && 
           window.compounds && 
           window.english_to_gloss &&
           Object.keys(window.atomgloss_to_surface).length > 0; // We no longer check for proper_nouns
}

// Function to update the statistics in the about page
function updateVocabStats() {
    // Wait for the dictionary data to be fully loaded
    if (!isDictionaryLoaded()) {
        console.log('about_stats.js: Dictionary data not yet loaded, waiting...');
        setTimeout(updateVocabStats, 500);
        return;
    }
    
    console.log('about_stats.js: Dictionary data loaded, updating statistics...');
    
    // Get the counts from the window variables, ignoring atoms with glosses starting with 'ATOM_'
    let atomCount = 0;
    for (const gloss in window.atomgloss_to_surface) {
        if (!gloss.startsWith('ATOM_')) {
            atomCount++;
        }
    }
    const compoundCount = Object.keys(window.compounds).length;
    
    let properNounCount = 0;
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const vocabEntry = window.trevorese_dictionary.vocabs[gloss];
        if (vocabEntry.is_phonetic_noun) {
            properNounCount++;
        }
    }
    
    // Count unique English words by splitting definition fields on punctuation
    const uniqueEnglishWords = new Set();
    
    // Definition fields to check
    const definitionFields = [
        "noun/pronoun", "phonetic noun", "adj/adv", "verb", "quantifier", "conjunction",
        "preposition", "affix", "interjection", "fn"
    ];
    
    // Process each vocabulary entry
    for (const gloss in window.trevorese_dictionary.vocabs) {
        const vocabEntry = window.trevorese_dictionary.vocabs[gloss];
        
        // Check each definition field
        for (const field of definitionFields) {
            if (vocabEntry.facets && vocabEntry.facets[field]) {
                // Process each definition in the field
                for (const definition of vocabEntry.facets[field]) {
                    // Split on punctuation and spaces
                    const words = definition.toLowerCase()
                        .split(/[\s.,;:!?()\[\]{}"'\-_]+/)
                        .filter(word => word.length > 0);
                    
                    // Add each word to the set
                    for (const word of words) {
                        uniqueEnglishWords.add(word);
                    }
                }
            }
        }
    }
    
    const englishWordCount = uniqueEnglishWords.size;
    
    console.log(`about_stats.js: Stats: ${atomCount} atoms, ${compoundCount} compounds, ${properNounCount} proper nouns, ${englishWordCount} unique English words`);
    
    // Find the placeholder text in the about page
    const introText = document.querySelector('.sesowi-intro-text');
    if (introText) {
        // Replace the placeholder text with actual counts
        const statsText = introText.innerHTML;
        var updatedText = statsText.replace(
            RegExp(/AAA/, 'g'),
            atomCount); 
        updatedText = updatedText.replace(
            RegExp(/CCCC/, 'g'),
            compoundCount); 
        updatedText = updatedText.replace(
            RegExp(/PPP/, 'g'),
            properNounCount); 
        updatedText = updatedText.replace(
            RegExp(/EEEE/, 'g'),
            englishWordCount); 
        
        //     `Sesowi currently has ${atomCount} atoms, ${compoundCount} defined compound words, and ${properNounCount} proper nouns, covering a total of ${englishWordCount} English words.`
        // );
        
        introText.innerHTML = updatedText;
        console.log('about_stats.js: Statistics updated successfully');
    } else {
        console.error('about_stats.js: Could not find .sesowi-intro-text element');
    }
}

// Start checking for dictionary data as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateVocabStats);
} else {
    // If DOMContentLoaded has already fired, start immediately
    updateVocabStats();
}

// Also add a backup check in case dictionary.js loads after our script
window.addEventListener('load', function() {
    // If stats haven't been updated yet, try again
    const introText = document.querySelector('.sesowi-intro-text');
    if (introText && introText.innerHTML.includes('X atoms')) {
        console.log('about_stats.js: Stats not updated after page load, trying again...');
        updateVocabStats();
    }
    
    // Add an additional check after a delay to catch late-loading proper nouns
    setTimeout(function() {
        const properNounCount = Object.keys(window.proper_nouns || {}).length;
        const currentText = document.querySelector('.sesowi-intro-text')?.innerHTML || '';
        
        // If the text shows 0 proper nouns but we now have some, update again
        if (properNounCount > 0 && currentText.includes('0 proper nouns')) {
            console.log('about_stats.js: Proper nouns loaded after initial update, refreshing stats...');
            updateVocabStats();
        }
    }, 2000); // Check again after 2 seconds
});

// Script to update the vocabulary statistics on the About page

// Function to check if dictionary data is loaded
function isDictionaryLoaded() {
    return window.atomgloss_to_surface && 
           window.compounds && 
           window.proper_nouns && 
           window.english_to_gloss &&
           Object.keys(window.atomgloss_to_surface).length > 0;
}

// Function to update the statistics in the about page
function updateVocabStats() {
    // Wait for the dictionary data to be fully loaded
    if (!isDictionaryLoaded()) {
        console.log('Dictionary data not yet loaded, waiting...');
        setTimeout(updateVocabStats, 500);
        return;
    }
    
    console.log('Dictionary data loaded, updating statistics...');
    
    // Get the counts from the window variables
    const atomCount = Object.keys(window.atomgloss_to_surface).length;
    const compoundCount = Object.keys(window.compounds).length;
    const properNounCount = Object.keys(window.proper_nouns).length;
    
    // Count unique English words by splitting definition fields on punctuation
    const uniqueEnglishWords = new Set();
    
    // Definition fields to check
    const definitionFields = [
        "noun/pronoun", "adj/adv", "verb", "quantifier", "conjunction",
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
    
    console.log(`Stats: ${atomCount} atoms, ${compoundCount} compounds, ${properNounCount} proper nouns, ${englishWordCount} unique English words`);
    
    // Find the placeholder text in the about page
    const introText = document.querySelector('.sesowi-intro-text');
    if (introText) {
        // Replace the placeholder text with actual counts
        const statsText = introText.innerHTML;
        const updatedText = statsText.replace(
            /Sesowi currently has X atoms, Y defined compound words, and Z proper nouns, covering a total of K English words./,
            `Sesowi currently has ${atomCount} atoms, ${compoundCount} defined compound words, and ${properNounCount} proper nouns, covering a total of ${englishWordCount} English words.`
        );
        
        introText.innerHTML = updatedText;
        console.log('Statistics updated successfully');
    } else {
        console.error('Could not find .sesowi-intro-text element');
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
        console.log('Stats not updated after page load, trying again...');
        updateVocabStats();
    }
});

'use strict';
/**
 * Parse TSV data with proper handling of quoted fields that may contain newlines
 * @param {string} tsvData - The raw TSV data as a string
 * @returns {Array<Array<string>>} - Array of rows, each row being an array of field values
 */
function parseTSV(tsvData) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    // Add a newline at the end to ensure the last row is processed
    tsvData = tsvData.trim() + '\n';
    
    for (let i = 0; i < tsvData.length; i++) {
        const char = tsvData[i];
        const nextChar = i < tsvData.length - 1 ? tsvData[i + 1] : '';
        
        // Handle quote character (double quote)
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote inside a quoted field
                currentField += '"';
                i++; // Skip the next quote
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        }
        // Handle tab character (field separator)
        else if (char === '\t' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        }
        // Handle newline character (row separator)
        else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') {
                i++; // Skip the next \n in \r\n sequence
            }
            
            // Add the last field to the current row
            currentRow.push(currentField);
            currentField = '';
            
            // Add the completed row to the rows array if it has content
            if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
                rows.push(currentRow);
                currentRow = [];
            }
        }
        // Handle all other characters
        else {
            currentField += char;
        }
    }
    
    // Handle any remaining data (should not happen with the added newline)
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    
    return rows;
}

const DEFINITION_FIELDS = [
    "noun/pronoun", "adj/adv", "verb", "quantifier", "conjunction", 
    "preposition", "affix", "interjection", "fn"
];

class VocabEntry {
    /**
     * Represents a vocabulary entry in the Trevorese dictionary
     * Handles both atomic words and compound words (with single or double hyphens)
     * Note: this tries to handle normal compounds ("of-back-go") and phrases ("go so of-back") both.
     * This is WAI, but I think the implementation is wrong.
     * @param {Array<string>} row - Array of strings representing a row from the TSV file
     * @param {Object} indices - Object mapping column names to indices in the row array
     */
    constructor(row, indices) {
        // Check for the target entry right at the beginning
        const rawGloss = (row[indices["gloss"]] || '').trim();
        let direct_debug = false;
        if (rawGloss === "of-back-go--animal") {
            direct_debug = true;
        }

        // facets: Object mapping part of speech to array of definitions
        // e.g., { "noun/pronoun": ["person", "human"], "verb": ["to be"] }
        this.facets = {}; 
        
        // gloss: String representing the Trevorese gloss (e.g., "of-back-go--animal")
        this.gloss = rawGloss;
        
        // Calculate hyphen_indices and gloss_parts
        this.hyphen_indices = this.calculateHyphenIndices(this.gloss);
        this.gloss = this.gloss.replaceAll("--", "-"); // Replace double hyphens with single for gloss_parts calculation
        this.gloss_parts = this.calculateGlossParts(this.gloss, direct_debug);
        

        // atomic: Boolean indicating if this is an atomic word (single gloss part, not starting with u_)
        this.atomic = this.gloss && this.gloss_parts.length === 1 && !this.gloss.startsWith("u_");
        
        // surface: String representing the Trevorese surface form
        // For atomic words, this is set directly from the TSV
        // For compounds, this will be calculated later in Dictionary.surface_all_molecules()
        this.surface = "";
        if (this.atomic) {
            this.surface = row[indices["surface"]] || "";
        }

    
        // add in facets
        for (const col_name in indices) {
            if (col_name === 'gloss') continue;
            const i = indices[col_name];
            if (i === null || i === undefined || !row[i]) continue;
            
            if (!this.facets[col_name]) {
                this.facets[col_name] = [];
            }
            
            // entries: Array of strings after splitting by semicolons and cleaning
            const entries = row[i].split(';').map(s => s.trim()).filter(s => s);
            
            // Add each entry to the facet array if it's not already there
            for (const sub_element of entries) {
                 if (!this.facets[col_name].includes(sub_element)) {
                    this.facets[col_name].push(sub_element);
                 }
            }
        }
        
        // Calculate complexity after all facets are processed
        // todo this should be done by the dictionary after errthing is loaded
        this.complexity = 0;
        this.calculateComplexity();
         // Verify the result
        // if (direct_debug) {
        //     console.log("DIRECT_DEBUG: Final gloss:", this.gloss);
        //     console.log("DIRECT_DEBUG: Final gloss_parts:", this.gloss_parts);
        //     console.log("DIRECT_DEBUG: surface:", this.surface);
        //     console.log("DIRECT_DEBUG: atomic:", this.atomic);
        //     console.log("DIRECT_DEBUG: complexity:", this.complexity);
        //     console.log("DIRECT_DEBUG: hyphen_indices:", this.hyphen_indices);
        //     console.log("DIRECT_DEBUG: facets:", this.facets);
        //     console.log("DIRECT_DEBUG: Final gloss_parts:", this.gloss_parts);
        //     console.log("DIRECT_DEBUG: Is gloss_parts defined?", this.gloss_parts !== undefined);
        //     console.log("DIRECT_DEBUG: Is gloss_parts an array?", Array.isArray(this.gloss_parts));
        //     console.log("DIRECT_DEBUG: gloss_parts length:", this.gloss_parts.length);
        // }
                   
        // Enhanced debugging for "of-back-go--animal"
        // Check if the raw gloss contains the target string regardless of exact match
        if (direct_debug) {
            console.log("DIRECT_DEBUG:%c FINAL SUMMARY FOR of-back-go--animal ", "background: #ff9800; color: white; font-weight: bold");
            console.log("DIRECT_DEBUG:EXACT MATCH?", row[indices["gloss"]] === "of-back-go--animal");
            console.log("DIRECT_DEBUG:raw gloss (with quotes):", JSON.stringify(row[indices["gloss"]]));
            console.log("DIRECT_DEBUG:trimmed gloss (with quotes):", JSON.stringify(row[indices["gloss"]].trim()));
            console.log("DIRECT_DEBUG:this.gloss (with quotes):", JSON.stringify(this.gloss));
            console.log("DIRECT_DEBUG: complexity:", this.complexity);
            
            // More detailed gloss_parts logging
            console.log("DIRECT_DEBUG:gloss_parts:", this.gloss_parts);
            console.log("DIRECT_DEBUG:gloss_parts type:", typeof this.gloss_parts);
            console.log("DIRECT_DEBUG:Is gloss_parts defined?", this.gloss_parts !== undefined);
            console.log("DIRECT_DEBUG:Is gloss_parts an array?", Array.isArray(this.gloss_parts));
            console.log("DIRECT_DEBUG:gloss_parts length:", this.gloss_parts ? this.gloss_parts.length : "undefined");
            console.log("DIRECT_DEBUG:gloss_parts stringified:", JSON.stringify(this.gloss_parts));
            
            console.log("DIRECT_DEBUG:hyphen_indices:", this.hyphen_indices);
            console.log("DIRECT_DEBUG:facets:", JSON.stringify(this.facets, null, 2));
            console.log("DIRECT_DEBUG:atomic:", this.atomic);
            console.log("DIRECT_DEBUG:surface:", this.surface);
        }
        

    }
    
    /**
     * Calculates the indices in gloss_parts where double hyphens occur
     * For "of-back-go--animal", this would return [2] (after "go")
     * 
     * @param {string} gloss - The gloss string to analyze
     * @returns {Array<number>} Array of indices where double hyphens occur
     */
    calculateHyphenIndices(gloss) {
        const hyphenIndices = [];
        
        if (!gloss) return hyphenIndices;
        
        // Find double hyphens in the gloss and track their positions
        for (let i = 0; i < gloss.length - 1; i++) {
            if (gloss[i] === '-' && gloss[i + 1] === '-') {
                // Double hyphen found, calculate the corresponding index in gloss_parts
                // Count how many parts we've seen up to this point
                const textBeforeDoubleHyphen = gloss.substring(0, i);
                
                // Array of parts split by single hyphens
                const partsBeforeDoubleHyphen = textBeforeDoubleHyphen.split('-');
                const partIndex = partsBeforeDoubleHyphen.length - 1;
                  
                // Calculate the adjusted index in the final gloss_parts array
                // This accounts for parts that might contain spaces
                let adjustedIndex = 0;
                for (let j = 0; j < partIndex; j++) {
                    // Count space-separated parts
                    const spaceParts = partsBeforeDoubleHyphen[j].trim().split(' ').filter(p => p);
                    adjustedIndex += spaceParts.length;
                }
                
                // Add the index to hyphenIndices
                hyphenIndices.push(adjustedIndex);
                  
                // Skip the second hyphen
                i++;
            }
        }
        
        return hyphenIndices;
    }
    
    /**
     * Calculates the gloss_parts array by splitting the gloss by hyphens and spaces
     * For "of-back-go--animal" this would return ["of", "back", "go", "animal"]
     * 
     * @param {string} gloss - The gloss string to split into parts
     * @param {boolean} debug - Whether to output debug information
     * @returns {Array<string>} Array of individual word parts
     */
    calculateGlossParts(gloss, debug) {
        if (!gloss) return [];
        
        // Check if this gloss contains double hyphens
        const hasDoubleHyphens = gloss.includes('--');
        
        if (hasDoubleHyphens && debug) {
            console.log(`Processing entry with double hyphens: ${gloss}`);
        }
        
        if (hasDoubleHyphens) {
            // First split by single hyphens (this will create empty strings for double hyphens)
            const parts = gloss.split('-');
            
            // Filter out empty parts (which come from double hyphens)
            const nonEmptyParts = parts.filter(part => part.trim() !== '');
            
            // Split by spaces and flatten
            const finalParts = [];
            for (const part of nonEmptyParts) {
                const spaceParts = part.split(' ').filter(p => p.trim() !== '');
                for (const spacePart of spaceParts) {
                    finalParts.push(spacePart);
                }
            }
            
            return finalParts;
        } else {
            // Standard calculation for entries without double hyphens
            return gloss.split('-')
                .filter(part => part.trim() !== '') // Skip any empty parts
                .flatMap(part => part.split(' ')) // Split parts that contain spaces
                .filter(p => p);  // Filter out any empty strings
        }
    }
    
    /**
     * Calculates the complexity of this vocabulary entry
     * Used largely for sorting descendants in display order (simpler words first)
     */
    calculateComplexity() {
        // Calculate complexity as sum(log_2(atom["a"])) for each atom in gloss
        // Default value of 100 for atoms without an "a" field
        if (!window.trevorese_dictionary) {
            // Dictionary not loaded yet, will be calculated later
            return;
        }
        
        let totalComplexity = 0;
        
        if (this.atomic) {
            // For atomic words, use their own 'a' value
            const aValue = this.facets['a'] && this.facets['a'][0] ? parseInt(this.facets['a'][0]) : 100;
            totalComplexity = Math.log2(aValue);
        } else if (this.gloss_parts && this.gloss_parts.length > 0) {
            // For compound words, sum the log2 of each atom's 'a' value
            for (const part of this.gloss_parts) {
                const atomEntry = window.trevorese_dictionary.vocabs[part];
                let aValue = 100; // Default value
                
                if (atomEntry && atomEntry.facets && atomEntry.facets['a'] && atomEntry.facets['a'][0]) {
                    aValue = parseInt(atomEntry.facets['a'][0]);
                }
                
                totalComplexity += Math.log2(aValue);
            }
        }
        
        this.complexity = totalComplexity;
    }

    toString() { // Equivalent to Python's __repr__
        let out = [];
        for (const field in this.facets) {
            let aspect_as_str;
            const aspect = this.facets[field];
            if (Array.isArray(aspect)) {
                aspect_as_str = aspect.join('; ');
            } else {
                aspect_as_str = String(aspect);
            }
            if (aspect_as_str) { // Only add if there's content
                 out.push(field + ": " + aspect_as_str);
            }
        }

        // Custom sorter logic
        out.sort((a, b) => {
            const keyA = a.split(':')[0];
            const keyB = b.split(':')[0];
            const valA = keyA.startsWith("gloss") ? "," : (keyA.startsWith("surface") ? ",," : keyA);
            const valB = keyB.startsWith("gloss") ? "," : (keyB.startsWith("surface") ? ",," : keyB);
            return valA.localeCompare(valB);
        });

        return `V(${out.join("; ")})`;
    }

    short_def() {
        // Returns the supergloss if applicable, and otherwise (for a phrase) some short def
        const fieldsToCheck = ["supergloss", ...DEFINITION_FIELDS];
        for (const facet_to_repr of fieldsToCheck) {
            const facetValue = this.facets[facet_to_repr];
            if (facetValue && facetValue.length > 0) {
                return facetValue[0];
            }
        }
        return '?';
    }

    update(new_vocab) {
        if (this.surface && new_vocab.surface) {
            if (this.surface !== new_vocab.surface) {
                console.warn(`Warning: conflicting surfaces ${this.surface} and ${new_vocab.surface} for ${this.gloss}`);
            }
        }
        if (!this.surface) {
            this.surface = new_vocab.surface;
        }
        for (const facet in new_vocab.facets) {
             if (!this.facets[facet]) {
                 this.facets[facet] = [];
             }
             const currentFacet = this.facets[facet];
             for (const x of new_vocab.facets[facet]) {
                 if (!currentFacet.includes(x)) {
                     currentFacet.push(x);
                 }
             }
        }
    }
}

/**
 * Represents the complete Trevorese dictionary
 * Manages vocabulary entries and provides methods for lookup, surface generation, and more
 */
class Dictionary {
    constructor() {
        // vocabs: Object mapping gloss strings to VocabEntry objects
        // e.g., { "of-back-go--animal": VocabEntry, "do": VocabEntry }
        this.vocabs = {};
        
        // surfaces_map: Object mapping gloss strings to surface forms for atomic words only
        // e.g., { "do": "du", "go": "go" }
        // This is used for quick lookup of atomic word surfaces
        this.surfaces_map = {};
    }

    /**
     * Adds a vocabulary entry to the dictionary
     * If an entry with the same gloss already exists, it updates that entry
     * 
     * @param {VocabEntry} vocab - The vocabulary entry to add
     */
    add_vocab(vocab) {
        if (!vocab.gloss) {
            console.warn(`Empty vocab entry: ${vocab}`);
            return;
        }
        if (this.vocabs[vocab.gloss]) {
            this.vocabs[vocab.gloss].update(vocab);
        } else {
            this.vocabs[vocab.gloss] = vocab;
        }
        if (vocab.atomic && vocab.surface) {
            this.surfaces_map[vocab.gloss] = vocab.surface;
        }
    }

    toString() { // Equivalent to Python's __repr__
        let n_surfaces = 0;
        let definitions = new Set();
        for (const gloss in this.vocabs) {
            const vocab = this.vocabs[gloss];
            if (vocab.facets["surface"] && vocab.facets["surface"].length > 0) {
                n_surfaces += 1;
            }
            for (const definition_type of DEFINITION_FIELDS) {
                 const defs = vocab.facets[definition_type] || [];
                 for (const definition of defs) {
                     definitions.add(definition_type + definition);
                 }
            }
        }
        return `Dictionary with ${Object.keys(this.vocabs).length} entries, ${n_surfaces} surfaces, and ${definitions.size} definitions`;
    }

    /**
     * Creates a mapping from atomic words to the compound words that use them
     * This is used for finding related words and building the descendants list
     * 
     * @returns {Object} Mapping of atom glosses to arrays of VocabEntry objects
     */
    get_atoms_to_molecules() {
        // atomic: Object mapping atom glosses to arrays of VocabEntry objects that use them
        // e.g., { "do": [VocabEntry("do-thing"), VocabEntry("do-go")] }
        const atomic = {};
        
        // Iterate through all vocabulary entries
        for (const gloss in this.vocabs) {
            const vocab = this.vocabs[gloss];
            if (vocab.atomic) {
                if (!(vocab.gloss in atomic)) {
                    atomic[vocab.gloss] = [];
                }
            } else { // let's add this molecule to each atom that uses it
                const unique_sub_glosses = [...new Set(vocab.gloss_parts)];
                for (const sub_gloss of unique_sub_glosses) {
                     if (!atomic[sub_gloss]) atomic[sub_gloss] = [];
                     atomic[sub_gloss].push(vocab);
                }
            }
        }
        return atomic;
    }

    get_atoms() {
        // Returns a list of all atoms (VocabEntries)
        const atoms = [];
        for (const gloss in this.vocabs) {
            const vocab = this.vocabs[gloss];
            if (vocab.atomic) {
                atoms.push(vocab);
            }
        }
        return atoms;
    }

    get_dictionary_lines_inverted_dict() {
        // Aka get English -> Trevorese entries
        const english_to_trevor = {}; // { english_def: [ "(pos) gloss", ... ] }
        for (const gloss in this.vocabs) {
            const vocab = this.vocabs[gloss];
            for (const def_field of DEFINITION_FIELDS) {
                 const englishDefs = vocab.facets[def_field] || [];
                 for (const english of englishDefs) {
                     if (!english_to_trevor[english]) {
                         english_to_trevor[english] = [];
                     }
                     english_to_trevor[english].push(`(${def_field}) ${vocab.gloss}`);
                 }
            }
        }
        return english_to_trevor;
    }

    /**
     * Helper method for regex splitting while keeping delimiters
     * Adapted from: https://stackoverflow.com/a/21350614
     * 
     * @param {string} str - The string to split
     * @param {RegExp} splitter - Regular expression to split on
     * @returns {Array<string>} Array containing parts and delimiters
     */
    splitKeep(str, splitter) {
        let result = [];
        let lastIndex = 0;
        str.replace(splitter, function(match, index) {
            result.push(str.substring(lastIndex, index));
            result.push(match);
            lastIndex = index + match.length;
        });
        result.push(str.substring(lastIndex));
        return result;
    }

    /**
     * Combines words and punctuation arrays back into a single string
     * 
     * @param {Array<string>} words - Array of word tokens
     * @param {Array<string>} punct - Array of punctuation tokens (one longer than words)
     * @returns {string} Combined string with words and punctuation interleaved
     */
    interleave_words_and_punct(words, punct) {
        // Note: JS split behavior differs slightly from Python's re.split for start/end
        // The tokenize function handles this adjustment.
        let result = '';
        for (let i = 0; i < words.length; i++) {
            result += (punct[i] || '') + words[i];
        }
        
        // Add final punctuation (if any)
        result += punct[words.length] || '';
        return result;
    }

    /**
     * Tokenizes a string into words and punctuation
     * Handles both compound words with hyphens and regular words
     * 
     * @param {string} s - The string to tokenize
     * @returns {Array} A tuple of [words array, punctuation array]
     */
    tokenize(s) {
        // Special case for hyphenated compound words (e.g., 'love-dirt-animal' or 'person like have self-talk')
        if (s.includes('-')) {
            // For compound words, we need to treat each part as a separate word
            // First, split by hyphens to get the main parts
            const parts = s.split('-');
            const words = [];
            
            // Process each part, handling spaces within parts
            for (const part of parts) {
                // Each part may contain spaces (e.g., "person like" in "person like-have")
                // We treat each part as a single unit regardless of spaces
                words.push(part.trim());
            }
            
            // Create punctuation array with proper structure:
            // - Empty string at the beginning
            // - Hyphen between each word
            // - Empty string at the end
            const punct = [''];
            for (let i = 0; i < words.length - 1; i++) {
                punct.push('-');
            }
            punct.push(''); // Add final empty string to match Python behavior
            return [words, punct];
        }
        
        // Regular tokenization for non-compound words
        // Split text into tokens and in-between spans.
        // JS regex differs from Python's unicode handling slightly, using \w for simplicity
        // Using splitKeep helper to mimic Python's re.split behavior better
        s = ` ${s} `; // Add padding like Python code
        
        // Split by non-word characters to get delimiters (punctuation)
        const punct = this.splitKeep(s, /\W+/).filter((_, i) => i % 2 !== 0); // Keep only delimiters
        
        // Split by word characters to get words
        const words = this.splitKeep(s, /\w+/).filter((_, i) => i % 2 !== 0); // Keep only words
            
        // Adjust first/last punct based on padding
        punct[0] = (s.startsWith(' ') ? '' : punct[0]) || '';
        punct[punct.length - 1] = (s.endsWith(' ') ? '' : punct[punct.length - 1]) || '';
        
        // Python code asserts len(punct) == len(words) + 1. Let's ensure structure is similar.
        // If s starts with non-word, punct will have extra empty string at start
        if (s.match(/^\W/)) {
            punct.shift();
        }
        // If s ends with non-word, punct will have extra empty string at end
         if (s.match(/\W$/)) {
            punct.pop();
        }
        // Ensure punct has one more element than words for interleaving
        while (punct.length < words.length + 1) {
             punct.push('');
        }
        if (punct.length > words.length + 1) {
             console.warn("Punct array too long after tokenization", s, words, punct);
             punct.length = words.length + 1; // Truncate if needed
        }

        return [words, punct];
    }

    /**
     * Converts a Trevorese gloss to its surface form
     * Handles both atomic words and compound words with special handling for double hyphens
     * 
     * @param {string|VocabEntry} sentence - The gloss or VocabEntry to convert to surface form
     * @returns {string} The Trevorese surface form
     */
    get_surface(sentence) {
        // hyphenIndices: Array of indices in the gloss_parts where double hyphens occur
        // Used to add hyphens to the surface form at the correct positions
        let hyphenIndices = [];
        
        // isTargetEntry: Boolean flag for special debug logging of "of-back-go--animal"
        let isTargetEntry = false;
        
        if (sentence instanceof VocabEntry) {
            // If we're getting the surface for a VocabEntry, use its hyphen_indices
            hyphenIndices = sentence.hyphen_indices || [];
            isTargetEntry = sentence.gloss === "of-back-go--animal";
            
            if (isTargetEntry) {
                console.log("get_surface called for of-back-go--animal");
                console.log("hyphen_indices:", hyphenIndices);
            }
            
            sentence = sentence.gloss;
        }
        
        if (sentence === "of-back-go--animal") {
            isTargetEntry = true;
            console.log("get_surface called with of-back-go--animal string");
        }
        
        // Handle compound words with spaces in their parts
        if (isTargetEntry) {
            console.log("Tokenizing of-back-go--animal:");
        }
        const [words, punct] = this.tokenize(sentence);
        if (isTargetEntry) {
            console.log("Tokenization result - words:", words);
            console.log("Tokenization result - punct:", punct);
        }
        
        // surfs: Array to store the surface form for each word in the gloss
        const surfs = [];
        
        for (let i = 0; i < words.length; i++) {
            let word = words[i].toLowerCase();
            
            // Check if this is a multi-word part (e.g., "person like have self")
            if (word.includes(' ')) {
                // For multi-word parts, look up each word individually
                const wordParts = word.split(' ');
                let surfaceParts = [];
                
                for (const part of wordParts) {
                    // Skip empty parts
                    if (part.trim() === '') continue;
                    
                    // Look up each word in the surfaces map
                    if (this.surfaces_map[part] !== undefined) {
                        surfaceParts.push(this.surfaces_map[part]);
                    } else {
                        // If not found, keep the original word
                        surfaceParts.push(`<${part}>`);
                    }
                }
                
                // Join the surface parts with spaces preserved
                surfs.push(surfaceParts.join(' '));
            } else {
                // For single words, look up directly
                surfs.push(this.surfaces_map[word] !== undefined ? this.surfaces_map[word] : `<${word}>`);
            }
        }
        
        // Handle double hyphens (--) by adding a hyphen to the surface at specified indices
        // For example, in "of-back-go--animal", a hyphen is added after "go"
        for (const index of hyphenIndices) {
            if (index >= 0 && index < surfs.length) {
                surfs[index] = surfs[index] + '-';
            }
        }
        
        // Combine the surface forms with punctuation to create the complete surface string
        // This step interleaves the surface forms of words with their corresponding punctuation
        let surface = this.interleave_words_and_punct(surfs, punct);
        surface = surface.replace(/([a-z])-([a-z])/g, "$1$2"); // Join for single -
        
        // // Clean up any empty parts that might have been created
        // surface = surface.replace(/<>-/g, ''); // Remove empty placeholders with hyphens
        // surface = surface.replace(/-<>/g, ''); // Remove empty placeholders with hyphens
        // surface = surface.replace(/<>/g, ''); // Remove any remaining empty placeholders
        
        return surface;
    }

    surface_all_molecules() {
        for (const gloss in this.vocabs) {
            const vocab = this.vocabs[gloss];
            if (vocab.atomic) continue;
            vocab.surface = this.get_surface(vocab);
        }
    }

    calculateAllComplexities() {
        // Calculate complexity for all vocab entries after dictionary is fully loaded
        console.log("Calculating complexities for all dictionary entries...");
        for (const gloss in this.vocabs) {
            this.vocabs[gloss].calculateComplexity();
        }
    }
    
    computeDescendants() {
        console.log("ENTER: computeDescendants method");
        
        // Create supergloss_to_v map
        const supergloss_to_v = {};
        
        for (const gloss in this.vocabs) {
            const v = this.vocabs[gloss];
            if (v.facets.supergloss && v.facets.supergloss.length > 0) {
                supergloss_to_v[v.facets.supergloss[0]] = v;
            } else {
                supergloss_to_v[v.gloss] = v;
            }
        }
        
        // Create gloss_to_supercompound map
        console.log('Creating gloss_to_supercompound map...');
        const gloss_to_supercompound = {};
        let supercompoundCount = 0;
        let vocabsCount = Object.keys(this.vocabs).length;
        console.log(`Checking ${vocabsCount} vocab entries for supercompound facets...`);
        
        // Debug: Check a few vocab entries to see if they have supercompound facets
        const sampleVocabs = Object.entries(this.vocabs).slice(0, 5);
        for (const [gloss, v] of sampleVocabs) {
            console.log(`Sample vocab '${gloss}':`, {
                hasFacets: !!v.facets,
                facetKeys: v.facets ? Object.keys(v.facets) : 'none',
                hasSupercompound: v.facets && v.facets.supercompound,
                supercompoundValue: v.facets && v.facets.supercompound ? v.facets.supercompound : 'none'
            });
        }
        
        for (const gloss in this.vocabs) {
            const v = this.vocabs[gloss];
            if (v.facets && v.facets.supercompound && v.facets.supercompound.length > 0) {
                gloss_to_supercompound[gloss] = v.facets.supercompound[0];
                supercompoundCount++;
                
                // Log the first few entries we find
                if (supercompoundCount <= 3) {
                    console.log(`Found supercompound for '${gloss}':`, v.facets.supercompound[0]);
                }
            }
        }
        
        // Assign to window variable for global access
        window.gloss_to_supercompound = gloss_to_supercompound;
        console.log(`Created gloss_to_supercompound map with ${supercompoundCount} entries:`, 
                   supercompoundCount > 0 ? Object.keys(gloss_to_supercompound).slice(0, 10) : 'EMPTY');
        
        if (supercompoundCount === 0) {
            console.warn('WARNING: No supercompound facets found in any vocab entries!');
        }
        
        // Initialize gloss_to_descendants map
        const gloss_to_descendants = {};
        for (const gloss in this.vocabs) {
            gloss_to_descendants[gloss] = new Set();
        }
        
        // Function to expand supercompound recursively
        const expand_supercompound = (v, depth = 0) => {
            if (depth > 6) {
                console.warn(`ERROR[Depth, ${v.gloss}]`);
                return `ERROR[Depth, ${v.gloss}]`;
            }
            
            if (v.atomic) {
                return v.gloss;
            }
            
            const supercomp = v.facets.supercompound && v.facets.supercompound.length > 0 
                ? v.facets.supercompound[0] 
                : v.gloss;
            
            // console.log(`Expanding supercompound for ${v.gloss}: ${supercomp} (depth: ${depth})`);
            
            const ancestors = [];
            const subglosses = supercomp.split('-');
            
            // console.log(`Children of ${v.gloss}: ${JSON.stringify(subglosses)}`);
            
            for (const subgloss of subglosses) {
                if (!supergloss_to_v[subgloss]) {
                    console.warn(`ERROR[Undefined ${subgloss}]`);
                    ancestors.push(`ERROR[Undefined ${subgloss}]`);
                } else {
                    const ancestor = expand_supercompound(supergloss_to_v[subgloss], depth + 1);
                    ancestors.push(ancestor);
                }
            }
            
            // Add this vocab entry as a descendant to all its ancestors
            for (const ancestor of ancestors) {
                if (gloss_to_descendants[ancestor]) {
                    // console.log(`Adding ${v.gloss} as descendant to ${ancestor}`);
                    gloss_to_descendants[ancestor].add(v.gloss);
                }
            }
            
            return ancestors.join('-');
        };
        
        // Process all non-atomic entries with supercompound
        let correct = 0;
        let incorrect = 0;
        
        for (const gloss in this.vocabs) {
            const v = this.vocabs[gloss];
            
            // Skip atomic entries, entries with spaces, or entries starting with u_
            if (v.atomic || gloss.includes(' ') || gloss.startsWith('u_')) continue;
            
            // Skip entries without supercompound
            if (!v.facets.supercompound || v.facets.supercompound.length === 0) continue;
            
            const sc = expand_supercompound(v);
            
            if (sc.replace('--', '-') === v.gloss.replace('--', '-')) {
                correct++;
            } else {
                incorrect++;
                console.warn(`Mismatch for ${v.gloss}: ${sc}`);
            }
        }
        
        console.log(`Supercompound validation: ${correct} correct, ${incorrect} incorrect`);
        
        // Special logging for 'dirt-time-one'
        if (this.vocabs['dirt-time-one']) {
            console.log("Special logging for 'dirt-time-one':");
            expand_supercompound(this.vocabs['dirt-time-one']);
        }
        
        // Log descendants of 'dirt'
        if (gloss_to_descendants['dirt']) {
            console.log("Descendants of 'dirt':", Array.from(gloss_to_descendants['dirt']));
        }
        
        // Store the descendants in each vocab entry
        for (const gloss in gloss_to_descendants) {
            if (this.vocabs[gloss]) {
                this.vocabs[gloss].descendants = Array.from(gloss_to_descendants[gloss]);
            }
        }
        
        console.log("Descendants computation complete.");
        return gloss_to_descendants;
    }
}

// --- Data Loading and Processing ---

async function loadDictionaryData() {
    console.log("Fetching trevorese.tsv...");
    try {
        const response = await fetch('./trevorese.tsv?v=' + Date.now()); // Cache bust
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const tsvData = await response.text();
        console.log("TSV data fetched.");
        
        // Parse TSV with proper handling of quoted fields that may contain newlines
        const rows = parseTSV(tsvData);
        console.log(`Parsed ${rows.length} rows from TSV.`);

        const all_vocabs = new Dictionary();
        let indices = {};
        let headerFound = false;

        for (const row of rows) {
            // Simple header check (adjust if needed based on actual header content)
            if (!headerFound && row.includes("gloss")) {
                 console.log("Header found");
                 indices = {}; // Reset indices for safety
                 row.forEach((col, index) => {
                     if (col.trim()) { // Only map non-empty column names
                         indices[col.trim()] = index;
                     }
                 });
                 // Sanity check essential columns
                 if (indices['gloss'] === undefined) {
                     console.error("Header row missing essential 'gloss' column.");
                     throw new Error("Invalid TSV header: missing 'gloss'.");
                 }
                 headerFound = true;
                 console.log("Indices mapped:", indices);
            } else if (headerFound) {
                 // This is a vocab entry row
                 if (indices["gloss"] === undefined || !row[indices["gloss"]]) continue; // Skip rows without a gloss
                 if (row[indices["gloss"]].startsWith("<")) {
                     // entries starting with "<" are ignored.
                     continue;
                 }
                 const vocab = new VocabEntry(row, indices);
                 all_vocabs.add_vocab(vocab);
            }
        }
        
        if (!headerFound) {
             console.error("Header row not found in trevorese.tsv");
             throw new Error("Could not parse TSV header.");
        }
        
        console.log("Initial dictionary populated:", all_vocabs.toString());
        all_vocabs.surface_all_molecules();
        console.log("Molecule surfaces calculated.");

        // Assign to window variables (mirroring Python JSON creation)
        window.trevorese_dictionary = all_vocabs;
        
        window.atomgloss_to_surface = {};
        for (const gloss in all_vocabs.vocabs) {
            const v = all_vocabs.vocabs[gloss];
            if (v.atomic) {
                window.atomgloss_to_surface[gloss] = v.surface;
            }
        }
        
        // Compute descendants for all vocabulary entries
        console.log("About to compute descendants...");
        try {
            all_vocabs.computeDescendants();
            console.log("computeDescendants completed successfully");
        } catch (error) {
            console.error("Error in computeDescendants:", error);
        }
        
        // Verify gloss_to_supercompound was populated
        console.log(`After computeDescendants, window.gloss_to_supercompound has ${Object.keys(window.gloss_to_supercompound).length} entries`);
        if (Object.keys(window.gloss_to_supercompound).length > 0) {
            console.log('Sample entries:', Object.entries(window.gloss_to_supercompound).slice(0, 5));
        } else {
            console.warn('WARNING: window.gloss_to_supercompound is empty after computeDescendants!');
        }

        // Build compounds map (gloss -> supergloss)
        window.compounds = {}; // Initialize as an empty object
        for (const vocab of Object.values(all_vocabs.vocabs)) {
            const superglossValue = vocab.facets.supergloss ? vocab.facets.supergloss[0] : null;
            if (!vocab.atomic && vocab.gloss && superglossValue) {
                window.compounds[vocab.gloss] = superglossValue; // Assign the actual string value
            }
        }

        // Create reverse mapping (surface to gloss) for all words (both atomic and compound)
        window.surface_to_gloss = {};
        
        // First add atomic words from atomgloss_to_surface mapping
        for (const gloss in window.atomgloss_to_surface) {
            const surface = window.atomgloss_to_surface[gloss];
            if (surface && !surface.startsWith("__")) { // Ensure surface exists and isn't special
                // Only add atomic words here - these are single tokens
                window.surface_to_gloss[surface] = gloss;
            }
        }
        
        // Then add all words (including compounds) from vocabs
        // We don't add these to surface_to_gloss because they may contain spaces
        // and would interfere with the token-by-token lookup in the FSA
        
        // For backward compatibility, keep compound_surface_to_gloss as a reference to surface_to_gloss
        window.compound_surface_to_gloss = window.surface_to_gloss;

        const raw_english_to_gloss = all_vocabs.get_dictionary_lines_inverted_dict();
        window.english_to_gloss = {};
         for (const en in raw_english_to_gloss) {
             // Clean up keys and take the first gloss definition (like Python code seems to do)
             const cleanedEn = en.replace(/"/g, "'"); // Replace double quotes
             const firstGloss = raw_english_to_gloss[en][0].replace("((pro)noun)", "(noun)"); // Clean up POS tag
             window.english_to_gloss[cleanedEn] = firstGloss;
         }

        // Hypertrevorese Calculation
        const ONSETS = 'wmpktnsy';
        const VOWELS_IU = 'iu';
        const VOWELS_A = 'a';
        const MONO_ATOMS = [];
        for (const c of ONSETS) { for (const v of VOWELS_IU) { MONO_ATOMS.push(c + v); } }
        const HYPERCODES = [];
        for (const c of ONSETS) { for (const v of VOWELS_A) { HYPERCODES.push(c + v); } }
        const HYPERORDER = [...MONO_ATOMS];
        for (const h of HYPERCODES) {
            for (const a of [...HYPERCODES, ...MONO_ATOMS]) {
                HYPERORDER.push(h + a);
            }
        }
        
        window.atomgloss_to_surface_hypertrevorese = {};
        const atomsSorted = all_vocabs.get_atoms().sort((a, b) => {
            const numA = parseInt((a.facets['a'] && a.facets['a'][0]) || '0');
            const numB = parseInt((b.facets['a'] && b.facets['a'][0]) || '0');
            return numA - numB;
        });
        
        atomsSorted.forEach((a, i) => {
            if (i < HYPERORDER.length) {
                 window.atomgloss_to_surface_hypertrevorese[a.gloss] = HYPERORDER[i];
            } else {
                 console.warn(`Ran out of hyperorder codes for atom: ${a.gloss}`);
            }
        });

        // Debug: Check if supercompound column is being recognized in the TSV
        console.log('TSV column indices:', indices);
        console.log('Does indices contain supercompound?', 'supercompound' in indices);
        if ('supercompound' in indices) {
            console.log('supercompound column index:', indices.supercompound);
        }
        
        // Sample a few rows from the parsed TSV to check supercompound values
        console.log('Sampling a few rows to check for supercompound data:');
        for (let i = 1; i < Math.min(5, rows.length); i++) {
            const row = rows[i];
            if (indices.supercompound !== undefined && row[indices.supercompound]) {
                console.log(`Row ${i} has supercompound:`, {
                    gloss: row[indices.gloss],
                    supercompound: row[indices.supercompound]
                });
            }
        }
        
        // Initialize and populate window.gloss_to_supercompound directly from vocab entries
        window.gloss_to_supercompound = {};
        let supercompoundCount = 0;
        
        // Debug: Check a sample of vocab entries
        console.log('Checking sample vocab entries for supercompound facets:');
        const sampleVocabs = Object.entries(all_vocabs.vocabs).slice(0, 5);
        for (const [gloss, v] of sampleVocabs) {
            console.log(`Sample vocab '${gloss}':`, {
                hasFacets: !!v.facets,
                facetKeys: v.facets ? Object.keys(v.facets) : 'none',
                hasSupercompound: v.facets && v.facets.supercompound,
                supercompoundValue: v.facets && v.facets.supercompound ? v.facets.supercompound : 'none'
            });
        }
        
        // Directly populate from vocab entries
        for (const gloss in all_vocabs.vocabs) {
            const v = all_vocabs.vocabs[gloss];
            if (v.facets && v.facets.supercompound && v.facets.supercompound.length > 0) {
                window.gloss_to_supercompound[gloss] = v.facets.supercompound[0];
                supercompoundCount++;
                
                // Log a few examples for debugging
                if (supercompoundCount <= 3) {
                    console.log(`Found supercompound for '${gloss}':`, v.facets.supercompound[0]);
                }
            }
        }
        
        console.log(`Populated window.gloss_to_supercompound with ${supercompoundCount} entries`);
        if (supercompoundCount > 0) {
            console.log('Sample entries:', Object.entries(window.gloss_to_supercompound).slice(0, 5));
        } else {
            console.warn('WARNING: No supercompound facets found in any vocab entries!');
        }

        const topBox = document.getElementById('topBox'); // Ensure topBox is defined here
        if (topBox) {
            topBox.addEventListener("input", () => {
                const inputText = topBox.value.trim();
                const inputType = detectInputType(inputText);
                const inputBoxTitle = document.getElementById("input-box-title");

                if (inputType === "gloss") {
                    inputBoxTitle.textContent = "Input (Gloss - Detected)";
                    const notFoundWords =[];
                    const notFoundCompounds =[];
                    get_surface(inputText.toLowerCase(), notFoundWords, notFoundCompounds, false);
                    get_surface(inputText.toLowerCase(), notFoundWords, notFoundCompounds, true);
                } else if (inputType === "surface") {
                    inputBoxTitle.textContent = "Input (Surface - Detected)";
                    surface_to_atomgloss_to_surface(inputText);
                }
            });
        } else {
            console.error("Could not find topBox element to attach listener.");
        }

        console.log("Trevorese dictionary and related data loaded and assigned to window.");
        console.log("window.trevorese_dictionary:", window.trevorese_dictionary);
        console.log("window.atomgloss_to_surface count:", Object.keys(window.atomgloss_to_surface).length);
        console.log("window.compounds count:", Object.keys(window.compounds).length);
        console.log("window.english_to_gloss count:", Object.keys(window.english_to_gloss).length);
        console.log("window.atomgloss_to_surface_hypertrevorese count:", Object.keys(window.atomgloss_to_surface_hypertrevorese).length);
        
        // Calculate complexity for all entries after dictionary is fully loaded
        window.trevorese_dictionary.calculateAllComplexities();
        console.log("Complexities calculated for all dictionary entries.");

    } catch (error) {
        console.error('Failed to load or process dictionary data:', error);
        // Optionally, set default empty values on window to prevent errors later
        window.trevorese_dictionary = new Dictionary();
        window.atomgloss_to_surface = {};
        window.compounds = {};
        window.english_to_gloss = {};
        window.atomgloss_to_surface_hypertrevorese = {};
        window.gloss_to_supercompound = {};
    }
}

// Load the dictionary data when the script is parsed
loadDictionaryData();

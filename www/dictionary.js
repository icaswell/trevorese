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
    constructor(row, indices) {
        // facets: the meanings of this word in different parts of speech
        this.facets = {}; // Using plain object instead of defaultdict
        this.gloss = (row[indices["gloss"]] || '').trim();
        this.gloss_parts = this.gloss 
            ? this.gloss.split('-').flatMap(part => part.split(' ')).filter(p => p) 
            : [];
        this.atomic = this.gloss && this.gloss_parts.length === 1 && !this.gloss.startsWith("u_");
        this.surface = "";
        if (this.atomic) {
            this.surface = row[indices["surface"]] || "";
        }
        
        // Initialize complexity to 0, will be calculated after all facets are processed
        this.complexity = 0;

        for (const col_name in indices) {
            const i = indices[col_name];
            if (i === null || i === undefined || !row[i]) continue;
            
            if (!this.facets[col_name]) {
                this.facets[col_name] = [];
            }
            
            const entries = row[i].split(';').map(s => s.trim()).filter(s => s);
            for (const sub_element of entries) {
                 if (!this.facets[col_name].includes(sub_element)) {
                    this.facets[col_name].push(sub_element);
                 }
            }
        }
        
        // Calculate complexity after all facets are processed
        this.calculateComplexity();
    }
    
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

class Dictionary {
    constructor() {
        // mapping of gloss (str) to vocab entry
        this.vocabs = {}; // { gloss: VocabEntry }
        this.surfaces_map = {}; // { gloss: surface } for atomic words
    }

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

    get_atoms_to_molecules() {
        // Returns a mapping from atoms [strings] to words using them
        const atomic = {}; // { atom_gloss: [VocabEntry, ...] }
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

    // Helper for JS regex splitting while keeping delimiter
    // From: https://stackoverflow.com/a/21350614
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

    interleave_words_and_punct(words, punct) {
        // Note: JS split behavior differs slightly from Python's re.split for start/end
        // The tokenize function handles this adjustment.
        let result = '';
        for (let i = 0; i < words.length; i++) {
            result += (punct[i] || '') + words[i];
        }
        result += punct[words.length] || '';
        return result;
    }

    tokenize(s) {
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

    get_surface(sentence) {
        // Get Trevorese surface of gloss or sentence of glosses.
        if (sentence instanceof VocabEntry) {
            sentence = sentence.gloss;
        }
        const [words, punct] = this.tokenize(sentence);
        const surfs = [];
        for (let word of words) {
            word = word.toLowerCase();
            surfs.push(this.surfaces_map[word] !== undefined ? this.surfaces_map[word] : `<${word}>`);
        }
        let surface = this.interleave_words_and_punct(surfs, punct);
        surface = surface.replace(/([a-z])-([a-z])/g, "$1$2"); // Join for single -
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
        
        window.gloss_to_surface = {};
        for (const gloss in all_vocabs.vocabs) {
            const v = all_vocabs.vocabs[gloss];
            if (v.atomic) {
                window.gloss_to_surface[gloss] = v.surface;
            }
        }

        // Build compounds map (gloss -> supergloss)
        window.compounds = {}; // Initialize as an empty object
        for (const vocab of Object.values(all_vocabs.vocabs)) {
            const superglossValue = vocab.facets.supergloss ? vocab.facets.supergloss[0] : null;
            if (!vocab.atomic && vocab.gloss && superglossValue) {
                window.compounds[vocab.gloss] = superglossValue; // Assign the actual string value
            }
        }

        // Create reverse mapping (surface to gloss) for atomic words
        window.surface_to_gloss = {};
        for (const gloss in window.gloss_to_surface) {
            const surface = window.gloss_to_surface[gloss];
            if (surface && !surface.startsWith("__")) { // Ensure surface exists and isn't special
                window.surface_to_gloss[surface] = gloss;
            }
        }

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
        
        window.gloss_to_surface_hypertrevorese = {};
        const atomsSorted = all_vocabs.get_atoms().sort((a, b) => {
            const numA = parseInt((a.facets['a'] && a.facets['a'][0]) || '0');
            const numB = parseInt((b.facets['a'] && b.facets['a'][0]) || '0');
            return numA - numB;
        });
        
        atomsSorted.forEach((a, i) => {
            if (i < HYPERORDER.length) {
                 window.gloss_to_surface_hypertrevorese[a.gloss] = HYPERORDER[i];
            } else {
                 console.warn(`Ran out of hyperorder codes for atom: ${a.gloss}`);
            }
        });

        // Placeholder for missing definitions from Python code
        window.gloss_to_supergloss = {}; 
        window.gloss_to_supercompound = {}; 

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
                    surface_to_gloss_to_surface(inputText);
                }
            });
        } else {
            console.error("Could not find topBox element to attach listener.");
        }

        console.log("Trevorese dictionary and related data loaded and assigned to window.");
        console.log("window.trevorese_dictionary:", window.trevorese_dictionary);
        console.log("window.gloss_to_surface count:", Object.keys(window.gloss_to_surface).length);
        console.log("window.compounds count:", Object.keys(window.compounds).length);
        console.log("window.english_to_gloss count:", Object.keys(window.english_to_gloss).length);
        console.log("window.gloss_to_surface_hypertrevorese count:", Object.keys(window.gloss_to_surface_hypertrevorese).length);
        
        // Calculate complexity for all entries after dictionary is fully loaded
        window.trevorese_dictionary.calculateAllComplexities();
        console.log("Complexities calculated for all dictionary entries.");

    } catch (error) {
        console.error('Failed to load or process dictionary data:', error);
        // Optionally, set default empty values on window to prevent errors later
        window.trevorese_dictionary = new Dictionary();
        window.gloss_to_surface = {};
        window.compounds = {};
        window.english_to_gloss = {};
        window.gloss_to_surface_hypertrevorese = {};
        window.gloss_to_supergloss = {};
        window.gloss_to_supercompound = {};
    }
}

// Load the dictionary data when the script is parsed
loadDictionaryData();

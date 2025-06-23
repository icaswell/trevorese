
// --- FSA Implementation ---
class Node {
    constructor(surface) {
        this.surface = surface;
        this.children = {};
    }

    addChild(surface) {
        const child = (typeof surface === 'string') ? new Node(surface) : surface;
        this.children[child.surface] = child;
        return child;
    }
}

let ROOT;

function buildFSA() {
    const initials = "wymbgdnspktl";
    const have_w = 'bgdspktm';
    const have_y = 'n';
    const vowels = 'aeiou';
    // Diphthongs are now represented as full strings
    const diphthongs = ['ai', 'au', 'oi'];
    const forbidden = [
        ['y', 'i'],
        ['y', 'e'],
        ['w', 'u'],
        ['w', 'o']
    ];

    ROOT = new Node("^");
    const END = new Node("$");
    const NG = new Node('ŋ');
     NG.addChild(END);
    // const NG_G = NG.addChild('g');
    //   NG_G.addChild(END);

    const vowelNodes = [];
    for (const ch of vowels) {
        const n = new Node(ch);
        n.addChild(END);
        n.addChild(NG);
        vowelNodes.push(n);
    }
    // Add diphthong nodes
    for (const diph of diphthongs) {
        const n = new Node(diph);
        n.addChild(END);
        n.addChild(NG); // Diphthongs can also end in 'n'
        vowelNodes.push(n);
    }


    const consonantNodes = [];
    for (const ch of initials) {
        const n = new Node(ch);
        if (have_w.includes(ch)) {
            n.addChild(new Node('w'));
        }
        if (have_y.includes(ch)) {
            n.addChild(new Node('y'));
        }
        for (const n_c of [n, ...Object.values(n.children)]) {
            for (const n_v of vowelNodes) {
                if (!forbidden.some(([c, v]) => c === n_c.surface && v === n_v.surface)) {
                    n_c.addChild(n_v);
                }
            }
        }
        consonantNodes.push(n);
    }

    for (const n of [...consonantNodes, ...vowelNodes]) {
        ROOT.addChild(n);
    }
}

/**
 * Check if a string is a proper noun
 * @param {string} s - The string to check
 * @returns {boolean} True if the string is a proper noun
 */
function isProperNoun(s) {
    // Check if the string exists in the proper_nouns mapping
    if (window.proper_nouns && s in window.proper_nouns) {
        console.log(`Found proper noun: '${s}' -> '${window.proper_nouns[s]}'`);
        return true;
    }
    return false;
}

/**
 * Get the gloss for a proper noun
 * @param {string} s - The proper noun surface form
 * @returns {string|null} The gloss for the proper noun, or null if not found
 */
function getProperNounGloss(s) {
    if (window.proper_nouns && s in window.proper_nouns) {
        return window.proper_nouns[s];
    }
    return null;
}

/**
 * Tokenize a string into Sesowi tokens, handling proper nouns
 * @param {string} s - The string to tokenize
 * @param {boolean} checkProperNouns - Whether to check for proper nouns
 * @returns {Array<string>} Array of tokens
 */
function chomp_tokens(s, checkProperNouns = true) {
    // First check if the entire string is a proper noun
    if (checkProperNouns && isProperNoun(s)) {
        console.log(`Tokenizing proper noun as a whole: '${s}'`);
        return [s]; // Return the proper noun as a single token
    }
    
    s = s.replaceAll("ng", "ŋ");  // rather than dealing with making an FSA that can backtrack, just remove digraphs lol
    let cur = ROOT;
    const tokenized = [''];
    let i = 0;

    while (i < s.length) {
        // Check if the remaining substring is a proper noun
        if (checkProperNouns && i > 0) {
            const remainingString = s.substring(i).replace(/ŋ/g, 'ng');
            if (isProperNoun(remainingString)) {
                console.log(`Found proper noun in substring: '${remainingString}'`);
                // If we have a partial token, complete it first
                if (tokenized[tokenized.length - 1] !== '') {
                    if (!("$" in cur.children)) {
                        const errorPos = i - tokenized[tokenized.length - 1].length;
                        throw new Error(`Unparseable: incomplete token '${tokenized[tokenized.length - 1]}' at position ${errorPos} before proper noun. Input: "${s}"`);
                    }
                }
                // Add the proper noun as a new token
                tokenized.push(remainingString);
                i = s.length; // Skip to the end
                break;
            }
        }
        
        let ch = s[i];
        let nextCh = s[i + 1] || ''; // Get next char, or '' if at end
        let combined = ch + nextCh;

        // Prioritize diphthongs: check if combined is a child
        if (combined in cur.children) {
            cur = cur.children[combined];
            tokenized[tokenized.length - 1] += combined;
            i += 2; // Advance by 2
        } else if (ch in cur.children) {
            cur = cur.children[ch];
            tokenized[tokenized.length - 1] += ch;
            i += 1;
        } else {
            if (tokenized[tokenized.length - 1] === '') {
                // Check if the current position starts a proper noun
                if (checkProperNouns) {
                    let foundProperNoun = false;
                    // Try different lengths of substrings starting at current position
                    for (let j = s.length; j > i; j--) {
                        const potentialProperNoun = s.substring(i, j).replace(/ŋ/g, 'ng');
                        if (isProperNoun(potentialProperNoun)) {
                            console.log(`Found proper noun at position ${i}: '${potentialProperNoun}'`);
                            tokenized[tokenized.length - 1] = potentialProperNoun;
                            i = j; // Skip to the end of the proper noun
                            foundProperNoun = true;
                            break;
                        }
                    }
                    if (foundProperNoun) {
                        // Start a new token
                        tokenized.push('');
                        cur = ROOT;
                        continue;
                    }
                }
                
                // Error: Character cannot start a token
                const errorPos = i;
                throw new Error(`Unparseable: character '${ch}' at position ${errorPos} cannot start a token. Input: "${s}"`);
            }
            if (!("$" in cur.children)) {
                // Error: Incomplete token
                const errorPos = i - tokenized[tokenized.length - 1].length;
                throw new Error(`Unparseable: incomplete token '${tokenized[tokenized.length - 1]}' at position ${errorPos}. Input: "${s}"`);
            }
            // Start a new token
            tokenized.push('');
            cur = ROOT;
        }
    }

    // Check if the last token is complete
    if (tokenized[tokenized.length - 1] && !("$" in cur.children)) {
        const errorPos = i - tokenized[tokenized.length - 1].length;
        throw new Error(`Unparseable: incomplete token '${tokenized[tokenized.length - 1]}' at position ${errorPos}. Input: "${s}"`);
    }
    
    return tokenized
    .map(token => token.replace(/ŋ/g, 'ng'))
    .filter(token => token.trim() !== '');
}

// Initialize the FSA
buildFSA();

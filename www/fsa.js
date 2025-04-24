
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

function chomp_tokens(s) {
    s = s.replaceAll("ng", "ŋ");  // rather than dealing with making an FSA that can backtrack, just remove digraphs lol
    let cur = ROOT;
    const tokenized = [''];
    let i = 0;

    while (i < s.length) {
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

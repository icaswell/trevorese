// --- Gloss to Surface ---
function get_surface_single_word(word, notFoundWords) {
    const glosses = word.split("-");
    const subsurfaces = glosses.map(gloss => {
        let subsurface;
        if (gloss in window.gloss_to_surface) {
            const surfaceValue = window.gloss_to_surface[gloss];
            if (surfaceValue.startsWith("__")) {
                subsurface = `<span class="nosurface">${surfaceValue}</span>`;
            } else {
                subsurface = `<span class="gloss">${surfaceValue}</span>`;
            }
        } else {
            if (word.startsWith("u")) {
                subsurface = `<span class="propernoun">${gloss}</span>`;
            } else {
                subsurface = `<span class="highlight">${gloss}</span>`;
                notFoundWords.push(get_suggestion(gloss)); // Use get_suggestion
            }
        }
        return subsurface;
    });
    return subsurfaces.join("");
}

function get_surface(gloss, notFoundWords, notFoundCompounds) {
    const regex = /([-a-zA-Z]+|^)|([^-a-zA-Z]*)/g;
    const lines = gloss.split("\n");
    const resultLines = lines.map(line => {
        const matches = line.matchAll(regex);
        const surfaces = [];
        const punctuation = [];
        for (const match of matches) {
            const [_, word, punct] = match;
            if (word) {
                let surf = get_surface_single_word(word, notFoundWords);
                if (word.includes("-") && !window.compounds.includes(word) && !notFoundCompounds.includes(word)) {
                    notFoundCompounds.push(word);
                    surf = `${surf}<span class="not-found-compound-asterisk">*</span>`;
                }
                surfaces.push(surf);
            } else if (punct) {
                punctuation.push(punct);
            }
        }

        let result = "";
        for (let i = 0; i < surfaces.length; i++) {
            result += surfaces[i];
            result += (punctuation[i] || ""); // Append punctuation safely
        }

        return result.trim();
    });
    return resultLines.join("<br>");
}

function get_suggestion(word) {
    var suggestion = window.english_to_gloss[word.toLowerCase()];
    if (suggestion) {
        suggestion = `<span class="bold">${word}:</span> ${suggestion}`;
    } else if (word) {
        suggestion = `<span class="bold">${word}:</span> no suggestions found`
    } else {
        suggestion = "";
    }
    return suggestion;
}


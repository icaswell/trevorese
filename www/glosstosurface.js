// --- Gloss to Surface ---
function get_surface_single_word(word, notFoundWords) {
    const glosses = word.split("-");
    const data = (window.currentFlavor === 'hypertrevorese') ? window.atomgloss_to_surface_hypertrevorese : window.atomgloss_to_surface;

    const subsurfaces = glosses.map(gloss => {
        let subsurface;
        if (gloss in data) {
            const surfaceValue = data[gloss];
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
    const data = (window.currentFlavor === 'hypertrevorese') ? window.atomgloss_to_surface_hypertrevorese : window.atomgloss_to_surface;

    const resultLines = lines.map(line => {
        const matches = line.matchAll(regex);
        const surfaces = [];
        const punctuation = [];
        for (const match of matches) {
            const [_, word, punct] = match;
            if (word) {
                let surf = get_surface_single_word(word, notFoundWords);

                if (window.showAnnotations) {
                    let annotation = "";
                    const supergloss = window.gloss_to_supergloss[word] || "?";
                    const supercompound = window.gloss_to_supercompound[word];
                    const fullGloss = word;

                    if (word.includes("-")) { // Compound word
                        if (supercompound) {
                            if (supergloss != supercompound && supercompound != fullGloss) {
                                annotation = `(${supergloss} > ${supercompound} > ${fullGloss})`;
                            } else if (supergloss != fullGloss) {
                                annotation = `(${supergloss} > ${fullGloss})`;
                            }
                             else {
                                annotation = `(${fullGloss})`;
                            }
                        } else if (supergloss) {
                            annotation = `(${supergloss} > ${fullGloss})`;
                        }
                        else {
                          annotation = `(? > ${fullGloss})`;
                        }

                    } else { // Atomic word
                        annotation = `(${fullGloss})`;
                    }
                    surf = `${surf}<span class="annotation">${annotation}</span>`;
                }

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

// Helper function to detect input type
function detectInputType(inputText) {
  return inputText.includes("-") ? "gloss" : "surface";
}

// --- Gloss to Surface (Modified to handle all three output boxes) ---
function get_surface_single_word(word, notFoundWords) {
  const glosses = word.split("-");
  const data = (window.currentFlavor === 'hypertrevorese') ? window.gloss_to_surface_hypertrevorese : window.gloss_to_surface;

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
        const suggestion = get_suggestion(gloss); // Get the suggestion
        // Check if the suggestion is already in notFoundWords
        if (!notFoundWords.includes(suggestion)) {
          notFoundWords.push(suggestion);
        }
      }
    }
    return subsurface;
  });
  return subsurfaces.join("");
}

function get_surface(gloss, notFoundWords, notFoundCompounds, showAnnotations) {
  const regex = /([-a-zA-Z]+|^)|([^-a-zA-Z]*)/g;
  const lines = gloss.split("\n");
  const data = (window.currentFlavor === 'hypertrevorese') ? window.gloss_to_surface_hypertrevorese : window.gloss_to_surface;
  let surfaceResult = "";
  let annotatedSurfaceResult = "";

  const resultLines = lines.map(line => {
    const matches = line.matchAll(regex);
    const surfaces =[];
    const annotatedSurfaces =[];
    const originalGlosses =[]; // To store the original gloss tokens for bottomBoxGloss
    const punctuation =[];
    for (const match of matches) {
      const [_, word, punct] = match;
      if (word) {
        originalGlosses.push(`<span class="gloss">${word}</span>`); // Default gloss representation

        let surf = get_surface_single_word(word, notFoundWords);
        surfaces.push(surf);

        let annotatedSurf = surf;
        if (showAnnotations) {
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
          annotatedSurf = `${annotatedSurf}<span class="annotation">${annotation}</span>`;
        }

        if (word.includes("-") && !window.compounds.includes(word) && !notFoundCompounds.includes(word)) {
          notFoundCompounds.push(word);
          annotatedSurf = `${annotatedSurf}<span class="not-found-compound-asterisk">*</span>`;
        }
        annotatedSurfaces.push(annotatedSurf);
      } else if (punct) {
        punctuation.push(punct);
      }
    }

    let surfaceLine = "";
    let annotatedSurfaceLine = "";
    let glossLine = "";
    for (let i = 0; i < surfaces.length; i++) {
      surfaceLine += surfaces[i];
      annotatedSurfaceLine += annotatedSurfaces[i];
      glossLine += originalGlosses[i];
      surfaceLine += (punctuation[i] || ""); // Append punctuation safely
      annotatedSurfaceLine += (punctuation[i] || ""); // Append punctuation safely
      glossLine += (punctuation[i] || ""); // Append punctuation safely
    }

    surfaceResult += surfaceLine.trim() + "<br>";
    annotatedSurfaceResult += annotatedSurfaceLine.trim() + "<br>";
    return glossLine.trim(); // Return the processed gloss line for bottomBoxGloss
  });

  document.getElementById('bottomBoxGloss').innerHTML = resultLines.join("<br>");
  document.getElementById('bottomBoxSurface').innerHTML = surfaceResult;
  document.getElementById('bottomBoxSurfaceAnnotated').innerHTML = annotatedSurfaceResult;
  document.getElementById('sideBox').innerHTML = notFoundWords.join("\n");
  document.getElementById('bottomSideBox').innerHTML = "* " + notFoundCompounds.join("<br> * ");
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

// --- New wrapper function for surface to gloss then surface ---
function surface_to_gloss_to_surface(surfaceInput) {
  /* Uses FSA to parse surface input into gloss and then calls get_surface.*/
  const notFoundCompounds =[];
  const lines = surfaceInput.split("\n");
  let generatedGloss =[]; // Store an array of glosses

  const resultLines = lines.map(line => {
    const regex = /([a-zA-Z]+|^)|([^a-zA-Z]*)/g;
    const matches = line.matchAll(regex);
    const lineGlosses =[];
    const punctuation =[];

    for (const match of matches) {
      const [_, word, punct] = match;

      if (word) {
        let tokenized;
        try {
          tokenized = chomp_tokens(word);
        } catch (error) {
          lineGlosses.push(word); // Push the original unparseable word
          continue; // Skip to the next match
        }

        // Build raw gloss (no HTML) for compound check and processing
        const rawGlosses = tokenized.map(token => {
          return window.surface_to_gloss[token] || token;
        });
        const combinedGloss = rawGlosses.join("-");
        lineGlosses.push(combinedGloss);

        if (combinedGloss.length > 0
          && combinedGloss.includes('-')
          && !window.compounds.includes(combinedGloss)
          && !notFoundCompounds.includes(combinedGloss)) {
          notFoundCompounds.push(combinedGloss);
        }
      } else if (punct) {
        punctuation.push(punct);
      }
    }

    let result = "";
    let glossTokens =[];
    let punctIndex = 0;
    for (let i = 0; i < lineGlosses.length; i++) {
        glossTokens.push(lineGlosses[i]);
        if (punctuation[punctIndex] && punctuation[punctIndex] !== "-") {
            result += punctuation[punctIndex];
        }
        punctIndex++;
    }
    generatedGloss.push(glossTokens.join(" ")); // Join gloss tokens for each line
    return lineGlosses.join(" "); // Return for potential future use (though not directly used now)
  });

  const finalGeneratedGloss = generatedGloss.join("\n");
  const notFoundWords =[];
  get_surface(finalGeneratedGloss.toLowerCase(), notFoundWords, notFoundCompounds, false);
  get_surface(finalGeneratedGloss.toLowerCase(), notFoundWords, notFoundCompounds, true);

  let decoratedNotFoundCompounds = notFoundCompounds.map(compound => " * " + compound);
  document.getElementById('bottomSideBox').innerHTML = decoratedNotFoundCompounds.join("<br>");
}

// Gloss to Surface Input Event Listener (Modified)
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

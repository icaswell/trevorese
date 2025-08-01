// Helper function to detect input type
function detectInputType(inputText) {
  return inputText.includes("-") ? "gloss" : "surface";
}

// --- Gloss to Surface (Modified to handle all three output boxes) ---
function get_surface_single_word(word, notFoundWords) {
  const glosses = word.split("-");
  const data = window.atomgloss_to_surface;

  // Check if this is a proper noun using is_phonetic_noun property
  if (window.trevorese_dictionary && window.trevorese_dictionary.vocabs && 
      window.trevorese_dictionary.vocabs[word] && 
      window.trevorese_dictionary.vocabs[word].is_phonetic_noun) {
    console.log(`typing_tools.js: Found proper noun with phonetic noun facet: '${word}'`); // DEBUG
    // For proper nouns, use the gloss as is with propernoun styling
    return `<span class="propernoun">${word}</span>`;
  }

  const subsurfaces = glosses.map(gloss => {
    let subsurface;
    // Check if this part is a proper noun using is_phonetic_noun property
    if (window.trevorese_dictionary && window.trevorese_dictionary.vocabs && 
        window.trevorese_dictionary.vocabs[gloss] && 
        window.trevorese_dictionary.vocabs[gloss].is_phonetic_noun) {
      console.log(`typing_tools.js: Found proper noun part with phonetic noun facet: '${gloss}'`); // DEBUG
      // For proper nouns, use the gloss as is with propernoun styling
      return `<span class="propernoun">${gloss}</span>`;
    }
    
    if (gloss in data) {
      const surfaceValue = data[gloss];
      if (surfaceValue.startsWith("__")) {
        subsurface = `<span class="nosurface">${surfaceValue}</span>`;
      } else {
        subsurface = `<span class="surface">${surfaceValue}</span>`;
      }
    } else {
      // Check if this is a proper noun using is_phonetic_noun property
      if (window.trevorese_dictionary && window.trevorese_dictionary.vocabs && 
          window.trevorese_dictionary.vocabs[gloss] && 
          window.trevorese_dictionary.vocabs[gloss].is_phonetic_noun) {
        console.log(`typing_tools.js: Found proper noun in else branch with phonetic noun facet: '${gloss}'`); // DEBUG
        // For proper nouns, use the gloss as is with propernoun styling
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
  // Updated regex to include underscores for proper nouns like 'u_raman'
  const regex = /([-a-zA-Z_]+|^)|([^-a-zA-Z_]*)/g;
  const lines = gloss.split("\n");
  console.log(`typing_tools.js: Processing gloss: '${gloss}'`); // DEBUG
  const data = window.atomgloss_to_surface;
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
        // Check if this is a proper noun using is_phonetic_noun property
        const isProperNoun = window.trevorese_dictionary && 
                           window.trevorese_dictionary.vocabs && 
                           window.trevorese_dictionary.vocabs[word] && 
                           window.trevorese_dictionary.vocabs[word].is_phonetic_noun;
        console.log(`typing_tools.js: Checking if '${word}' is a proper noun: ${isProperNoun}`); // DEBUG
        
        originalGlosses.push(`<span class="gloss">${word}</span>`); // Default gloss representation

        let surf;
        
        // Handle proper noun specially
        if (isProperNoun) {
          // For proper nouns, use the gloss as is with propernoun styling
          surf = `<span class="propernoun">${word}</span>`;
        } else {
          surf = get_surface_single_word(word, notFoundWords);
        }
        
        surfaces.push(surf);

        let annotatedSurf = surf; // Declare and initialize with base surface
        let annotation = "";
        const isCompound = word.includes('-');

        // --- Annotation Logic --- START ---
        const fullGloss = word; // Use the original word (gloss)

        // Special handling for proper nouns in annotation
        if (isProperNoun) {
          // For proper nouns, use a simpler annotation that doesn't split the word
          annotation = `(${word})`; // Just use the gloss as annotation
        } else if (isCompound) {
          const superCompoundGloss = window.compounds[fullGloss] || "?";
          const superSuperCompound = window.gloss_to_supercompound[fullGloss];
          if (superSuperCompound && superCompoundGloss !== '?' && superSuperCompound !== fullGloss) {
            annotation = `(${superCompoundGloss} > ${superSuperCompound} > ${fullGloss})`;
          } else if (superCompoundGloss !== '?') {
            annotation = `(${superCompoundGloss} > ${fullGloss})`;
          } else {
            annotation = `(? > ${fullGloss})`;
          }
        } else { // Atomic word logic: Annotate with the gloss itself
          if (fullGloss) { // Check gloss exists
            annotation = `(${fullGloss})`; // Simple annotation: (gloss)
          } else {
            annotation = ""; // Should not happen if gloss exists
          }
        }
        // --- Annotation Logic --- END ---

        if (showAnnotations) {
          if (annotation) { // Only add annotation span if annotation is not empty
            annotatedSurf = `${surf}<span class="annotation">${annotation}</span>`;
          } else {
            // No annotation to apply
          }
        }

        if (word.includes("-") && !(word in window.compounds) && !notFoundCompounds.includes(word)) {
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
  // Structure to hold matching results
  let matches = [];
  let englishDefinitions = [];
  
  // First try exact match
  const exactMatch = window.english_to_gloss[word.toLowerCase()];
  if (exactMatch) {
    // If found exact match, save it
    englishDefinitions.push(word.toLowerCase());
    matches.push(exactMatch);
  } else {
    // Look for partial matches as fallback
    const wordLower = word.toLowerCase();
    for (const englishDef in window.english_to_gloss) {
      // Check if the English definition contains our word as a complete word
      const wordBoundaryRegex = new RegExp(`\\b${wordLower}\\b`, 'i');
      if (englishDef.match(wordBoundaryRegex)) {
        englishDefinitions.push(englishDef);
        matches.push(window.english_to_gloss[englishDef]);
      }
    }
  }
  
  // Format the suggestions
  let suggestion = "";
  if (matches.length > 0) {
    // Begin with the word and colon
    suggestion = `<span class="bold">${word}:</span>\n    `;
    
    // Add each match with proper formatting
    for (let i = 0; i < matches.length; i++) {
      const englishDef = englishDefinitions[i];
      const treveroseGloss = matches[i];
      
      // Extract parts of speech if present (assuming format like "talk direction over-truth (verb)")
      let glossText = treveroseGloss;
      let partOfSpeech = "";
      
      console.log(`typing_tools.js: DEBUG: treveroseGloss='${treveroseGloss}'`); // Debug log
      
      // The format might be different than expected - try to manually split
      // Look for common part of speech patterns like (verb), (noun), etc.
      const posPattern = /\((\w+)\)/; // Simplified pattern to match (verb), (noun), etc.
      const posMatch = treveroseGloss.match(posPattern);
      
      console.log(`typing_tools.js: DEBUG: posMatch=`, posMatch); // Debug log
      
      if (posMatch && posMatch[1]) {
        // Extract the part of speech tag (e.g., "verb") from group 1
        const posTag = posMatch[1];
        // Reconstruct the span with parentheses
        partOfSpeech = `<span class="partofspeech">(${posTag})</span>`;
        // Remove the original tag from glossText
        glossText = treveroseGloss.replace(posPattern, "").trim();
        
        console.log(`typing_tools.js: DEBUG: extracted posTag='${posTag}', glossText='${glossText}'`); // Debug log
      } else {
        // Fallback: try to manually split at the last parenthesis
        const lastOpenParen = treveroseGloss.lastIndexOf('(');
        if (lastOpenParen > 0) {
          const lastCloseParen = treveroseGloss.lastIndexOf(')');
          if (lastCloseParen > lastOpenParen) {
            const posTag = treveroseGloss.substring(lastOpenParen + 1, lastCloseParen);
            partOfSpeech = `<span class="partofspeech">(${posTag})</span>`;
            glossText = treveroseGloss.substring(0, lastOpenParen).trim();
            console.log(`typing_tools.js: DEBUG: fallback extracted posTag='${posTag}', glossText='${glossText}'`); // Debug log
          }
        }
      }
      
      // Add properly formatted entry
      suggestion += `[${englishDef}] <span class="gloss">${glossText}</span>${partOfSpeech}`;
      
      // Add separator if there are more matches
      if (i < matches.length - 1) {
        suggestion += "<br>";
      }
    }
  } else if (word) {
    // No suggestions found
    suggestion = `<span class="bold">${word}:</span> no suggestions found`;
  }
  
  return suggestion;
}

// --- New wrapper function for surface to gloss then surface ---
function surface_to_atomgloss_to_surface(surfaceInput) {
  console.log(`typing_tools.js: --- Entering surface_to_atomgloss_to_surface with: '${surfaceInput}'`); // DEBUG ENTRY
  /* Uses FSA to parse surface input into gloss and then calls get_surface.*/
  const notFoundCompounds =[];
  const lines = surfaceInput.split("\n");
  let generatedGloss =[]; // Store an array of glosses

  const resultLines = lines.map(line => {
    // Updated regex to match only alphabetic characters for tokenization
    const regex = /([a-zA-Z]+|^)|([^a-zA-Z]*)/g;
    const matches = line.matchAll(regex);
    const lineGlosses =[];
    const punctuation =[];

    for (const match of matches) {
      const [_, word, punct] = match;

      if (word) {
        
        let tokenized;
        try {
          // Use chomp_tokens with proper noun checking enabled
          tokenized = chomp_tokens(word, true);
          console.log(`typing_tools.js: Tokenized '${word}' into: [${tokenized.join(', ')}]`); // DEBUG
        } catch (error) {
          console.error(`Error in chomp_tokens for word '${word}':`, error); // DEBUG ERROR
          lineGlosses.push(word); // Push the original unparseable word
          continue; // Skip to the next match
        }

        // Build raw gloss (no HTML) for compound check and processing
        const rawGlosses = tokenized.map(token => {
          // We no longer need to check for proper nouns in window.proper_nouns
          return window.surface_to_gloss[token] || token;
        });
        console.log(`typing_tools.js: Lookup surface '${tokenized.join(',')}': Got gloss(es) '${rawGlosses.join(',')}'`); // DEBUG
        const combinedGloss = rawGlosses.join("-");
        lineGlosses.push(combinedGloss);

        if (combinedGloss.length > 0
          && combinedGloss.includes('-')
          && !(combinedGloss in window.compounds)
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

// Ensure bottomSideBox exists on the page

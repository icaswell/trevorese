# Trevorese Dictionary Technical Documentation

This document provides a comprehensive overview of the Trevorese Dictionary application codebase.

## Introduction to Trevorese

Trevorese is a constructed language designed to be the simplest possible language to learn while remaining fully capable of expressing any idea. The language features an uninflecting grammar that relies on word order and part-of-speech markers. Important terminology:


- **Atoms**: The basic building blocks of Trevorese vocabulary, consisting of under 200 core words from which all other words are built. Atoms typically have the form consonant+vowel[+optional ng], such as `ma`, `su`, or more complex forms like `yau`, `kwe`, or `nang`. Atoms function as a cloud of meaning that can serve as verbs, nouns, or adjectives depending on context.

- **Compounds**: Most Trevorese words are compounds composed of multiple atoms. For example, the word for "dog" (`deyagoboi`) is a compound of the atoms for "of", "back", "go", and "animal", conceptually meaning "a following/loyal animal". Compounds are written with hyphens in the gloss form, but the surface form is written without hyphens -- except for compounds longer than four atoms, where hyphens are often introduced to improve readability. In such cases, the gloss will have a double dash, e.g. `big-plant-place--of-back-go-animal`.

- **Gloss**: The representation of Trevorese words using English approximations. For example, the gloss `of-back-go-animal` represents the Trevorese word for "dog". Glosses make it easier to understand the meaning and structure of Trevorese words.

- **Surface**: The actual phonetic form of Trevorese words as they would be spoken or written in the language. For example, the surface form of the gloss `of-back-go-animal` is `deyagoboi`.

## Website Features

The Trevorese Dictionary application consists of several tabs, each serving a specific purpose in helping users learn and interact with the language:

Throughout the website, any Trevorese word in a span of class "surface" or "gloss" is clickable, bringing up a box showing its meaning, pronuncuation, etc.

### About
Provides an introduction to the Trevorese language, explaining its principles, phonology, and design philosophy.

### Periodic Table
Displays a visual representation of the atomic words in Trevorese, organized in a format similar to the periodic table of elements.

### Tutorial
Offers a step-by-step guide to learning Trevorese, divided into multiple parts covering sounds, atoms, compounds, grammar, and more.

### Dictionary
Allows users to search for words in Trevorese (either surface or gloss form) and English. The dictionary displays comprehensive information about each entry, including its surface form, gloss, part of speech, and usage examples.

### Typing Tool
Provides a conversion tool that allows users to input text in either gloss or surface form and see the corresponding outputs. The tool displays:
- Surface (Annotated): Shows the surface form with annotations explaining compound words
- Gloss: Shows the gloss representation
- Surface: Shows the plain surface form without annotations

The tool also suggests potential glosses for non-gloss words entered and identifies compound words not in the dictionary.

### Todo
Displays issues and notes related to the development of the Trevorese language, including supergloss decomposition problems and words with pending notes. This tab is primarily for developers and contributors to the language.

### Stories
Presents stories written in Trevorese, allowing users to practice reading and understanding the language in context.

## JavaScript Files

### dictionary.js

The core module of the Trevorese Dictionary application, responsible for parsing and managing the dictionary data.

#### Key Components:

- **`parseTSV(tsvData)`**: Parses trevorese.tsv, which contains core data about the Trevorese language

- **`VocabEntry` Class**: Represents a vocabulary entry in the Trevorese dictionary.
  - Handles both atomic words and compound words (with single or double hyphens)
  - Key methods:
    - `calculateHyphenIndices(gloss)`: Calculates indices where double hyphens occur
    - `calculateGlossParts(gloss, debug)`: Splits gloss into parts by hyphens and spaces
    - `calculateComplexity()`: Calculates word complexity for sorting
    - `toString()`: String representation of the entry
    - `short_def()`: Returns a short definition
    - `update(new_vocab)`: Updates the entry with new data

- **`Dictionary` Class**: Represents the complete Trevorese dictionary.
  - Key methods:
    - `add_vocab(vocab)`: Adds a vocabulary entry to the dictionary
    - `get_atoms_to_molecules()`: Maps atomic words to compound words that use them
    - `get_atoms()`: Returns all atomic words
    - `tokenize(s)`: Tokenizes a string into words and punctuation
    - `get_surface(sentence)`: Converts a Trevorese gloss to its surface form
    - `surface_all_molecules()`: Generates surface forms for all compound words
    - `calculateAllComplexities()`: Calculates complexity for all entries
    - `computeDescendants()`: Computes descendant relationships between words
    - `expand_supercompound(v, depth)`: Recursively expands supercompounds

- **`loadDictionaryData()`**: Loads dictionary data from TSV files and initializes global window variables.

### io.js

Handles input/output operations for the dictionary, including text processing and display.

#### Key Components:

- **`detectInputType(inputText)`**: Detects whether input is gloss or surface form.

- **`get_surface_single_word(word, notFoundWords)`**: Converts a single gloss word to its surface form.

- **`get_surface(gloss, notFoundWords, notFoundCompounds, showAnnotations)`**: Converts gloss text to surface form with annotations.
  - Handles both atomic and compound words
  - Adds annotations showing the meaning hierarchy for compounds
  - Marks unknown compounds with asterisks

- **`get_suggestion(word)`**: Finds suggestions for unknown English words.
  - Searches in the English-to-gloss mapping
  - Formats results with proper CSS classes for word, gloss, and part of speech

- **`surface_to_gloss_to_surface(surfaceInput)`**: Converts surface input to gloss and then back to annotated surface.
  - Uses FSA to parse surface input
  - Displays both raw and annotated versions

### fsa.js

Implements a Finite State Automaton (FSA) for parsing Trevorese surface forms.

#### Key Components:

- **`Node` Class**: Represents a node in the FSA.
  - Methods:
    - `addChild(surface)`: Adds a child node

- **`buildFSA()`**: Builds the FSA for parsing Trevorese words.
  - Defines valid phonological patterns
  - Creates a tree structure of possible syllables

- **`chomp_tokens(s)`**: Tokenizes a surface string into valid Trevorese syllables.
  - Uses the FSA to validate and segment input
  - Handles special cases like "ng" digraph

### surfacetogloss.js

Handles conversion from Trevorese surface forms to gloss representations.

#### Key Components:

- **`Node` Class and `buildFSA()`**: Similar to fsa.js but optimized for surface-to-gloss conversion.

- **`chomp_tokens(s)`**: Tokenizes surface forms into valid Trevorese syllables.

- **`get_gloss(surfaceInput)`**: Converts surface text to gloss representation.
  - Tokenizes input using the FSA
  - Looks up each token in the surface-to-gloss mapping
  - Handles compound words and formatting

### glosstosurface.js

Handles conversion from gloss to surface forms (complementary to surfacetogloss.js).

#### Key Components:

- **`get_surface_single_word(word, notFoundWords)`**: Converts a single gloss word to surface form.

- **`get_surface(gloss, notFoundWords, notFoundCompounds)`**: Converts gloss text to surface form.
  - Similar to the function in io.js but with different annotation handling

- **`get_suggestion(word)`**: Provides suggestions for unknown words.
  - Simpler version than the one in io.js

### display.js

Manages the UI display of dictionary entries and search results.

#### Key Components:

- **`createDictionaryHeaderDisplay(options)`**: Creates a standardized dictionary header display.
  - Formats "surface (gloss)" with proper styling

- **`FIELD_DISPLAY_ORDER`**: Defines the order of fields to display in dictionary entries.

- **`createDictionaryEntryDisplay(entry, options)`**: Creates a standardized dictionary entry display.
  - Used by both popup and dictionary search results
  - Handles compound words
  - Supports highlighting search terms

- **`findVocabEntryBySurface(surface)`**: Finds a vocabulary entry by its surface form.
  - Checks direct matches in surface_to_gloss
  - Checks compound surfaces
  - Falls back to searching through all entries

### stories.js

Manages the loading and display of stories written in Trevorese.

#### Key Components:

- **`parseStories(tsvContent)`**: Parses stories from TSV format.
  - Organizes stories into title, lines, and notes

- **`createStoryHTML(story, index)`**: Creates HTML for a story.
  - Formats each word as a clickable surface span
  - Handles compound words and punctuation

- **`loadStories()`**: Loads and displays stories.
  - Fetches stories.tsv
  - Parses and renders stories

- **`setupCollapsibles()`**: Sets up collapsible functionality for stories.

- **`setupLongPressHandlers()`**: Sets up long-press functionality for showing translations.
  - `showTranslationPopup(event, storyLine)`: Shows the translation popup
  - `hideTranslationPopup()`: Hides the translation popup
  - `addSurfaceEventListeners()`: Adds event listeners to all surface spans

## Window Variables

The application uses several global window variables to store and access dictionary data across different modules:

| Variable | Description |
|----------|-------------|
| `window.trevorese_dictionary` | Instance of the Dictionary class containing all vocabulary entries and methods for lookup and conversion. |
| `window.gloss_to_surface` | Object mapping gloss strings to their surface forms. Used for converting gloss to surface. |
| `window.surface_to_gloss` | Object mapping surface strings to their gloss forms. Used for converting surface to gloss. |
| `window.compounds` | Object mapping compound glosses to their supergloss (meaning). Contains annotations for compound words showing their meaning. |
| `window.english_to_gloss` | Object mapping English words to their Trevorese gloss equivalents. Used for suggestions when unknown words are entered. |
| `window.gloss_to_surface_hypertrevorese` | Alternative mapping for the "hypertrevorese" flavor of the language. |
| `window.gloss_to_supergloss` | Object mapping glosses to their supergloss (meaning at a higher level). |
| `window.gloss_to_supercompound` | Object mapping glosses to their supercompound forms. Used for showing the hierarchy of compound words. |
| `window.currentFlavor` | String indicating the current flavor of Trevorese being used (standard or hypertrevorese). |
| `window.showAnnotations` | Boolean flag indicating whether to show annotations for words. |
| `window.compound_surface_to_gloss` | Object mapping compound surface forms to their gloss representations. |

These window variables are initialized in the `loadDictionaryData()` function in dictionary.js and are used throughout the application for various conversion and display operations.


## Special instructions (largely for AI cosing agent)

 * no need to start a server up; there is already one running.
 * if you need to use python, use `python3` instead of `python`

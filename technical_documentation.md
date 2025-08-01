# Sesowi Dictionary Technical Documentation

This document provides a comprehensive overview of the Sesowi Dictionary application codebase.

## Word Popups

Throughout the website, Sesowi words are made interactive through a popup system that displays detailed information when users click on words. This system provides immediate access to word definitions, grammatical information, and related data without requiring navigation to the dictionary page.

### Popup Implementation

#### Triggering Popups
- **Click Events**: Popups are triggered when users click on elements with the classes `.surface`, `.surface-emph`, or `.gloss`. The `spanClickHandler` function in `general.js` processes these clicks.
- **Event Flow**: When a word is clicked, the click event is captured, the text content is extracted (with parentheses removed for gloss spans), and the `showWordInfoPopup` function is called.

#### Popup Content Generation
1. **Word Lookup**: The `generateWordInfoContent` function uses `findVocabEntryBySurface` to locate the word in the dictionary.
2. **Header Creation**: The popup header is generated using `createDictionaryHeaderDisplay`, which shows:
   - For atoms: The surface form and gloss (or display gloss if available)
   - For compounds: The surface form and a hierarchical display of glosses (supergloss > supercompound > gloss)
3. **Content Creation**: The popup content is generated using `createDictionaryEntryDisplay`, which displays all available facets of the word according to the `FIELD_DISPLAY_ORDER` defined in `display.js`.

#### Display Fields
The popup displays the following information when available:
- Surface form (the Sesowi word)
- Gloss (for atoms) or display gloss if specified
- Part of speech information (noun/pronoun, verb, adj/adv, etc.)
- Definitions and usage examples
- Related words (descendants, cognates)
- Notes (from the COMMENTS/TODOS field, if present)

#### Differences Between Atoms and Compounds
- **Atoms**: For atomic words, the popup displays the surface form and the gloss (or display gloss if available). The display gloss field takes precedence over the regular gloss for atoms.
- **Compounds**: For compound words, the popup shows a hierarchical representation of glosses: supergloss > supercompound > gloss, helping users understand the word's composition.

#### Mobile vs. Desktop Differences
- **Mobile Periodic Table**: When popups are triggered from the mobile periodic table view, special styling is applied:
  - White background
  - Enhanced box shadow
  - Green border to match the table theme
- **Positioning**: On mobile devices, popups are positioned differently to ensure they remain visible on smaller screens.

### Implementation Files
- **general.js**: Contains the core popup functionality:
  - `initPopupElements`: Initializes popup DOM elements
  - `showWordInfoPopup`: Displays and positions the popup
  - `hideWordInfoPopup`: Hides the popup
  - `populateWordInfoPopup`: Populates the popup with content
  - `generateWordInfoContent`: Generates the content for the popup
  - `spanClickHandler`: Handles clicks on words
  - `addClickListenersToDoc`: Adds click listeners to words
- **display.js**: Contains functions for creating dictionary displays:
  - `createDictionaryHeaderDisplay`: Creates the header for dictionary entries
  - `createDictionaryEntryDisplay`: Creates the content for dictionary entries
  - `findVocabEntryBySurface`: Finds a vocabulary entry by surface form
- **stories.js**: Contains additional popup functionality for the stories tab:
  - `setupWordClickHandlers`: Sets up click handlers for words in stories

## Introduction to Sesowi

Sesowi is a constructed language designed to be the simplest possible language to learn while remaining fully capable of expressing any idea. The language features an uninflecting grammar that relies on word order and part-of-speech markers. Important terminology:


- **Atoms**: The basic building blocks of Sesowi vocabulary, consisting of under 200 core words from which all other words are built. Atoms typically have the form consonant+vowel[+optional ng], such as `ma`, `su`, or more complex forms like `yau`, `kwe`, or `nang`. Atoms function as a cloud of meaning that can serve as verbs, nouns, or adjectives depending on context.

- **Compounds**: Most Sesowi words are compounds composed of multiple atoms. For example, the word for "dog" (`deyagoboi`) is a compound of the atoms for "of", "back", "go", and "animal", conceptually meaning "a following/loyal animal". Compounds are written with hyphens in the gloss form, but the surface form is written without hyphens -- except for compounds longer than four atoms, where hyphens are often introduced to improve readability. In such cases, the gloss will have a double dash, e.g. `big-plant-place--of-back-go-animal`.

- **Gloss**: The representation of Sesowi words using English approximations. For example, the gloss `of-back-go-animal` represents the Sesowi word for "dog". Glosses make it easier to understand the meaning and structure of Sesowi words.

- **Surface**: The actual phonetic form of Sesowi words as they would be spoken or written in the language. For example, the surface form of the gloss `of-back-go-animal` is `deyagoboi`.

## Website Features

The Sesowi Dictionary application consists of several tabs, each serving a specific purpose in helping users learn and interact with the language:

Throughout the website, any Sesowi word in a span of class "surface" or "gloss" is clickable, bringing up a box showing its meaning, pronuncuation, etc.

### About
Provides an introduction to the Sesowi language, explaining its principles, phonology, and design philosophy.

### Periodic Table
Displays a visual representation of the atomic words in Sesowi, organized in a format similar to the periodic table of elements.

### Tutorial
Offers a step-by-step guide to learning Sesowi, divided into multiple parts covering sounds, atoms, compounds, grammar, and more.

### Dictionary
Allows users to search for words in Sesowi (either surface or gloss form) and English. The dictionary displays comprehensive information about each entry, including its surface form, gloss, part of speech, and usage examples.

### Typing Tool
Provides a conversion tool that allows users to input text in either gloss or surface form and see the corresponding outputs. The tool displays:
- Surface (Annotated): Shows the surface form with annotations explaining compound words
- Gloss: Shows the gloss representation
- Surface: Shows the plain surface form without annotations

The tool also suggests potential glosses for non-gloss words entered and identifies compound words not in the dictionary.

### Todo
Displays issues and notes related to the development of the Sesowi language, including supergloss decomposition problems and words with pending notes. This tab is primarily for developers and contributors to the language.

### Stories
Presents stories written in Sesowi, allowing users to practice reading and understanding the language in context.

## JavaScript Files

### dictionary.js

The core module of the Sesowi Dictionary application, responsible for parsing and managing the dictionary data.

#### Key Components:

- **`parseTSV(tsvData)`**: Parses sesowi.tsv, which contains core data about the Sesowi language

- **`VocabEntry` Class**: Represents a vocabulary entry in the Sesowi dictionary.
  - Handles both atomic words and compound words (with single or double hyphens)
  - Key methods:
    - `calculateHyphenIndices(gloss)`: Calculates indices where double hyphens occur
    - `calculateGlossParts(gloss, debug)`: Splits gloss into parts by hyphens and spaces
    - `calculateComplexity()`: Calculates word complexity for sorting
    - `toString()`: String representation of the entry
    - `short_def()`: Returns a short definition
    - `update(new_vocab)`: Updates the entry with new data

- **`Dictionary` Class**: Represents the complete Sesowi dictionary.
  - Key methods:
    - `add_vocab(vocab)`: Adds a vocabulary entry to the dictionary
    - `get_atoms_to_molecules()`: Maps atomic words to compound words that use them
    - `get_atoms()`: Returns all atomic words
    - `tokenize(s)`: Tokenizes a string into words and punctuation
    - `get_surface(sentence)`: Converts a Sesowi gloss to its surface form
    - `surface_all_molecules()`: Generates surface forms for all compound words
    - `calculateAllComplexities()`: Calculates complexity for all entries
    - `computeDescendants()`: Computes descendant relationships between words
    - `expand_supercompound(v, depth)`: Recursively expands supercompounds

- **`loadDictionaryData()`**: Loads dictionary data from TSV files and initializes global window variables.

### typing_tools.js

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

- **`surface_to_atomgloss_to_surface(surfaceInput)`**: Converts surface input to gloss and then back to annotated surface.
  - Uses FSA to parse surface input
  - Displays both raw and annotated versions

### fsa.js

Implements a Finite State Automaton (FSA) for parsing Sesowi surface forms.

#### Key Components:

- **`Node` Class**: Represents a node in the FSA.
  - Methods:
    - `addChild(surface)`: Adds a child node

- **`buildFSA()`**: Builds the FSA for parsing Sesowi words.
  - Defines valid phonological patterns
  - Creates a tree structure of possible syllables

- **`chomp_tokens(s)`**: Tokenizes a surface string into valid Sesowi syllables.
  - Uses the FSA to validate and segment input
  - Handles special cases like "ng" digraph

### display.js

Manages the UI display of dictionary entries and search results.

#### Key Components:

- **`createDictionaryHeaderDisplay(options)`**: Creates a standardized dictionary header display.

### general.js

Handles general UI functionality and interactions across the application, including the tutorial system.

#### Key Components:

- **Tab Navigation**: Manages switching between different tabs (About, Dictionary, Typing Tool, etc.)
- **Collapsible Sections**: Handles expanding and collapsing sections in the UI
- **Tutorial Content Processing**: 
  - The tutorial.html file loads content from tutorial_part_1.html through tutorial_part_5.html using fetch requests
  - `processSurfaceMode(doc, isSurfaceMode)`: Converts between gloss and surface representations in the tutorial content
    - Finds all spans with gloss-related classes in the document
    - For compound words (containing hyphens), splits by hyphen and looks up each part in `window.atomgloss_to_surface`
    - For atomic words, looks up the gloss directly in `window.atomgloss_to_surface`
    - Applies appropriate CSS classes based on lookup results:
      - `surface` or `surface-emph`: When a gloss is successfully converted to surface form
      - `gloss-notfound`: When a gloss cannot be found in the mapping (shown in red)
    - Stores original content and classes to allow toggling between gloss and surface modes
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

### tests.js

displays unit tests to user

### stories.js

Manages the loading and display of stories written in Sesowi.

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
| `window.atomgloss_to_surface` | Object mapping gloss strings to their surface forms. Used for converting gloss to surface. |
| `window.surface_to_gloss` | Object mapping surface strings to their gloss forms. Used for converting surface to gloss. |
| `window.compounds` | Object mapping compound glosses to their supergloss (meaning). Contains annotations for compound words showing their meaning. |
| `window.english_to_gloss` | Object mapping English words to their Sesowi gloss equivalents. Used for suggestions when unknown words are entered. |
| `window.atomgloss_to_surface_hypertrevorese` | Alternative mapping for the "hypertrevorese" flavor of the language. |
| `window.gloss_to_supercompound` | Object mapping glosses to their supercompound forms. Used for showing the hierarchy of compound words. |
| `window.currentFlavor` | String indicating the current flavor of Sesowi being used (standard or hypertrevorese). |
| `window.showAnnotations` | Boolean flag indicating whether to show annotations for words. |

These window variables are initialized in the `loadDictionaryData()` function in dictionary.js and are used throughout the application for various conversion and display operations.


## Special instructions (largely for AI coding agent)

 * no need to start a server up; there is already one running.
 * if you need to use python, use `python3` instead of `python`
 * any styles should be put in styles.css; rmember that many styles are already defined (gloss, surface, etc) and don't need to be reinvented.
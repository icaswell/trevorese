
CORRECTION_PROMPT_STRUCTURED = f"""You can find a detailed description of the constructed language Sesowi at sesowi.com.  Read this website in great detail, and then detail any mistakes you find in the construction of the language, and give instructions for how to improve Sesowi. Include the following sections:

1. Errors/Inconsistencies: the stories or examples in the tutorial might contradict the written grammar or rules of the language.
2. TODOs: for any of the TODOs or "?"s I have, provide suggestions on how to resolve them.
3. problems in the lexicon
3a: bad compounds: are there compounds composed of sub-parts that don't make sense given the final meaning? What would a better compound be?
3b: overly broad compounds: are there words that still mean too many things and will cause confusion in speech?
3c: redundancies: Are there multiple words that have too much semantic overlap? How can this be resolved?
3d. missing or extra atoms: are there any atoms that seem redundant given other atoms or compounds, and can be removed? Are there any atoms that are trying to do too much and would benefit from being split into two new atoms?
3e. Surfaces: are the surface forms of the atoms (e.g. "di" for "move:) good? are there any improvements you'd suggest?
4. Grammar:
4a. is the grammar as outlined good? Are there problems or room for improvement?
4b. Are there any major parts missing from the tutorial?
5. General comments and suggestions for improvement?
"""



with open("overall_corrections_structured_from_website.txt", "w") as f:
  f.write(CORRECTION_PROMPT_STRUCTURED)

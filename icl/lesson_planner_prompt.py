
DELIM="~"*80

with open("dictionary.txt", "r") as f:
  full_dictionary = f.read()
with open("tutorial_combined.txt", "r") as f:
  full_tutorial = f.read()
with open("../stories.tsv", "r") as f:
  stories = ""
  for line in f:
    if "images:" in line: continue
    parts = line.split("\t")
    if len(parts) >= 3:
      parts[2] = "Note: "+parts[2]
    stories += "\t".join(parts)


FORMAT = """
Each lesson should be output in the following json format:
{{
  "new_atoms": 2-6 new atoms to introduce to the user.
  "new_atom_compounds": For every new atom, introduce 1-2 new compounds using it.
  "old_atom_compounds": 4-8 new compounds composed of previous atoms
  "grammar_points": 1-2 grammar points that will be covered this lesson. Lessons near the end may not have any 
  "story_plot": a sentence summarizing the plot of the story for this section The story will be 1-3 paragraphs, and will be made later.
}}
"""


FORMAT = """
Output an html file. Each lesson outline should be a simple title and a bulleted list, like follows:

<h3>Title of lesson</h3>
<ul>
    <li><b>new_atoms:</b> 2-6 new atoms to introduce to the user.</li>
    <li><b>new_atom_compounds:</b>  For every new atom, introduce 1-2 new compounds using it.</li>
    <li><b>old_atom_compounds:</b>  4-8 new compounds composed of previous atoms</li>
    <li><b>grammar_points:</b>  1-2 grammar points that will be covered this lesson. Lessons near the end may not have any</li>
    <li><b>story_plot:</b>  a sentence summarizing the plot of the story for this section The story will be 1-3 paragraphs, and will be made later.</li>
</ul>
"""


LESSON_PLANNER_PROMPT = f"""You are going to make a outlines of lessons for learning the Sesowi language. Each lesson introduces 10-20 vocab words, 1-2 grammar points, and has a story using those words and grammar.

I'm going to give you a tutorial introducing the language and its grammar, a full dictionary, and finally some stories in the language. Let's start with the tutorial:

{DELIM}
{full_tutorial}
{DELIM}


Now, here is the full dictionary of Sesowi words and definitions:


{DELIM}
{full_dictionary}
{DELIM}


Here are some example stories written in Sesowi:



{DELIM}
{stories}
{DELIM}



Now, you are going to make a outlines of lessons for learning Sesowi. Each lesson introduces 10-20 vocab words, 1-2 grammar points, and has a story using those words and grammar. For earlier lessons you will likely need to introduce more atoms and fewer compounds; as the lessons progress you may just introduce 2 atoms a lesson and many more compounds. For earlier lessons most of the compounds will be in the new_compounds section, and there may be very few review_compounds.  All compounds should only use atoms from this lesson or previous lessons. Remember that in the first few lessons, the learner won't have enough vocabulary for a real "story" per se.

{FORMAT}

Now, output a list of the first 100 lessons in Sesowi:
"""






LESSON_PLANNER_PROMPT = f"""You are going to make lessons for learning the Sesowi language. Each lesson introduces 10-20 vocab words, 1-2 grammar points, and has a short story using those words and grammar.

I'm going to give you a tutorial introducing the language and its grammar, a full dictionary, and finally some stories in the language. Let's start with the tutorial:

{DELIM}
{full_tutorial}
{DELIM}


Now, here is the full dictionary of Sesowi words and definitions:


{DELIM}
{full_dictionary}
{DELIM}


Here are some example stories written in Sesowi:



{DELIM}
{stories}
{DELIM}



Now, you are going to make the lessons for learning Sesowi. Each lesson introduces 10-20 vocab words, 1-2 grammar points, and has a story using those words and grammar. For earlier lessons you will likely need to introduce more atoms and fewer compounds; as the lessons progress you may just introduce 2 atoms a lesson and many more compounds. All compounds should only use atoms from this lesson or previous lessons. Remember that in the first few lessons, the learner won't have enough vocabulary for a real "story" per se.

Now, output a list of the first 20 lessons in Sesowi, as an HTML page:
"""





with open("lesson_planner_prompt.txt", "w") as f:
  f.write(LESSON_PLANNER_PROMPT)


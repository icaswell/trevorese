
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



PROMPT = f"""You are going to make lessons for learning the Sesowi language. Each lesson introduces 10-20 vocab words, 1-2 grammar points, and has a short story using those words and grammar.

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



Now, you are going to make the lessons for learning Sesowi. Each lesson should end with a short paragraph of text in Sesowi that practices any new words or grammar learned in this lesson (and uses only words/grammar that the learner has already learned from previous lessons).


Output the lessons as HTML. import styles.css and assume that all styles are already defined in there. Whenever you write in Sesowi, enclose each word in the "surface" class, and if you need to emphasize a word, use "surface-emph", like so:  <span class="surface">mau</span> <span class="surface-emph">so</span> <span class="surface">niyang</span>

Now, output the full HTML page with as many lessons as you think are necessary to learn the whole language (this will be a lot):


"""





with open("e2e_lesson_prompt.txt", "w") as f:
  f.write(PROMPT)


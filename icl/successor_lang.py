
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


GENERAL_INTRO = """Sesowi is a language for everyone, everywhere, to learn. Unlike previous attempts at this, which are largely European languages in disguise, Sesowi is a universal common denominator, equally easy for people of all backgrounds. All Sesowi words are composed of only 115 atomic concepts -- for instance, "snake" is langboi (long animal), lizard is kolangboi (arm-snake), and salamander is lokolangboi (water-lizard) -- and yet Sesowi is a complete language. Finally, Sesowi does not take itself too seriously.

Sesowi is meant to be the simplest possible language to learn, that is nonetheless fully capable of expressing any idea. It rides on the principles of simplicity and neutrality: not only is it easy to learn (simplicity), but it is easy to learn for speakers of all languages, and doesn't give an advantage to people with a particular native language (neutrality/universality).

Wait, Hasn’t this been tried before? There have been a variety of attempted IALs (International Auxiliary Languages) over the years, most famously Esperanto. However, these all do not satisfy the basic criteria of universalty and neutrality. Well known IALs include Esperanto, Volupek, Interlingua, Interlingue, Ido, Novial, Lingua Franca Nova, and Idiom Neutral, all of which are essentially simplified versions of Latin. They have their own beauty, but they are far from universal. Even ones attempting to be more global, like Lingwa di Planeta, still have a fundamentally Indo-European phonology and structure. And Lojban is explicitly stated to be impossible to earn perfectly. All of these leave non European speakers — namely the majority of the world — at a heavy social disadvantage. Sesowi is a more global middle ground, positioned somewhere between Indo-European and Sinitic languages, with influence from Dravidian languages.

There is, however, one language that does satisfy all these criteria, and very well at that: Toki Pona. Toki pona is a work of art done by someone with a deep and universal understanding of languages. However, it has no intention of being an IAL. Toki Pona is not capable of expressing many basic concepts (like “seven”), and its goal is more personal discovery than communication -- for example, it cannot express the concept of a "bad friend", sine a "friend" is just a "good person".

Sesowi grammar is uninflecting and relies on word order and part-of-speech markers. It does away with any grammatical element that is not deemed necessary for communication, e.g. tenses, moods like the conditional, animacy, case systems, and gender. It is phonologically simple, lacking tricky elements like consonant clusters, final consonants, or rhotics. Needless to say, there are no grammatical exceptions, or nonsense around spelling.

Much of the beauty of Sesowi is in its lexicon. Sesowi words themselves are more like a vague cloud of meaning, having a wide range of meanings, and a single word is often not clear without context. Importantly, these words do not have a specific part of speech, functioning as verb, noun, or adjective depending on grammatical role. There are only a few hundred of these atoms, but the language makes extensive use of compounding to make more complex concepts."""


PROMPT = f"""Languages are very hard to create, so as a result, the first versions are often not the best. Constructed languages like Esperanto end up with many children like Ido and Volupek, that hone and improve on the original. You are going to do this for the Sesowi language. I'm going to give you a tutorial introducing the language and its grammar, a full dictionary, and finally some stories in the language, and you will repond with a carefully constructed, improved version of the language.

Let's start with the mission and description of Sesowi:

{GENERAL_INTRO}

Now, here is  the tutorial:

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



You will now come up with a new langauge based on Sesowi that hones and improves it as a unversal language. Your language can be as close or far from Sesowi as you think is necessary. For example, you might choose to keep almost all of the words, structure, and grammar, and make only slight changes to streamline things; but you may also decide that it wants large changes, and make significant changes in many aspects of the language.
"""



with open("successor_lang.txt", "w") as f:
  f.write(PROMPT)

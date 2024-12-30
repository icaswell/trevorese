from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, os


low_letters = "qpgjy"
high_letters = "tfhklbd"
smol_letters = "weasunmiorzxcv"

def word_height(w):
  t = ""
  for l in w:
    if l in low_letters:
      t += "l"
    elif l in high_letters:
      t += "h"
  t = "".join(sorted(list(set(t))))
  return t

def atom_offset(w):
  t = word_height(w)
  if t == "":
    return 6*SCALE_TEXT
  elif t == "l":
    return 4*SCALE_TEXT
  elif t == "h":
    return 0
  elif t == "hl":
    return -3*SCALE_TEXT
  else:
    print(w, t)
    assert False

SCALE = 10
SCALE_TEXT = SCALE//10
WIDTH = 15*SCALE
HEIGHT = 10*SCALE
BORDER = SCALE
LINEWEIGHT = SCALE_TEXT
Y_OFFSET_ATOM = -8*SCALE_TEXT
Y_OFFSET_DEF = 7*SCALE_TEXT

def save_img (atom_text, def_text, box_color, dirpath) :
  # Create a new image with a teal background
  img = Image.new('RGB', (WIDTH, HEIGHT), color=(0, 128, 128))
  draw = ImageDraw.Draw(img)
  
  # Define font properties
  font_path = '/System/Library/Fonts/Palatino.ttc'
  font_atom = ImageFont.truetype(font_path, 50*SCALE_TEXT)
  font_def = ImageFont.truetype(font_path, 24*SCALE_TEXT)
  
  # Draw rounded rectangle
  draw.rounded_rectangle([(SCALE, SCALE), (WIDTH - BORDER, HEIGHT - BORDER)], radius=15*SCALE_TEXT, fill=box_color, outline="black", width=LINEWEIGHT)
  
  # Get text bounding boxes
  bbox_atom = draw.textbbox((0, 0), atom_text, font=font_atom)
  w_atom = bbox_atom[2] - bbox_atom[0]  # Calculate width from bbox
  h_atom = bbox_atom[3] - bbox_atom[1]  # Calculate height from bbox
  
  bbox_def = draw.textbbox((0, 0), def_text, font=font_def)
  w_def = bbox_def[2] - bbox_def[0]
  h_def = bbox_def[3] - bbox_def[1]
  
  x_atom = (img.width - w_atom) / 2
  y_atom = (img.height - h_atom - h_def) / 2 + Y_OFFSET_ATOM  - atom_offset(atom_text)
  
  x_def = (img.width - w_def) / 2
  y_def = y_atom + h_atom + Y_OFFSET_DEF  + 2*atom_offset(atom_text)
  
  # Draw text
  draw.text((x_atom, y_atom), atom_text, fill="black", font=font_atom)
  draw.text((x_def, y_def), def_text, fill="grey", font=font_def)
 

  # Save the image
  img.save(f'{dirpath}/{atom_text}.png')


# def save_rgb(r, g, b):
#   text = f"{r}_{g}_{b}"
#   save_img(text, text, (r, g, b))
# 
# step = 64
# for r in range(0, 257, step):
#   for g in range(0, 257, step):
#     for b in range(0, 257, step):
#       save_rgb(r, g, b)
# 

# colors = {
#   "orange": (256, 128, 0),
#   "deeporange": (256, 96, 0),
#   "pink": (256, 96, 256),
#   "coral": (256, 96, 128),
#   "lime": (224 224 0),
#   "magenta": (224 54 128),
#   "red": (224, 0 0),
#   "grey": (160 160 160),
#   "orangy brown": (160 96 0),
#   "yellow": (192, 192, 0),
#   "blue": (0, 0, 256),
#   "light teal": (0, 192, 192),
# }

# "adjectives": "",
# "adjectives: objects": "",
# "basic parts": "",
# "conjunctions": "",
# "basic parts: body": "",
# "basic parts: prepositions": "",
# "elements": "",
# "humans": "",
# "humans: superatomic": "",
# "numbers": "",
# "proper nouns": "",
# "relations": "",
# "sensation:sound": (192, 64, 256),
# "sensation:taste": (192, 0, 256),
# "sensation:touch": (128, 64, 128),
# "sensation:vision": (128, 64, 192),
# "abstract": "",
# "universe": "",
# "wh": "",
# "verbs 2: modals": "",
# "verbs": "",
# "verbs: human": "",

data_raw = """surface	diagram	collisions	alt_surface	surfacedness	gloss
pwi	abstract			1	please
dwe	abstract			1	truth
mo	abstract			1.5	mark
se	abstract			2	talk
le	abstract		la	0.5	law
meng	abstract			0.5	think
ma	abstract		nya	1.5	love
ming	abstract			0.5	meaning
gwa	adjectives		deng; swing (ko)	0.5	easy
kwi	adjectives			1.5	fast
nu	adjectives			1	new
ga	adjectives		bang	0.5	good
da	adjectives: objects			2	big
wi	adjectives: objects			3	small
ku	adjectives: objects			1.5	hard
gi	adjectives: objects			0.5	high
long	adjectives: objects			0	long
kwang	adjectives: objects			1	wide
ping	adjectives: objects		salang	0.5	flat
dai	basic parts		te (terminé; tip); dau	0.5	end
be	basic parts			2	front
sai	basic parts			0.5	side
mwe	basic parts			0.5	middle
kwai	basic parts			1	part
gwai	basic parts		gau	1	bend
bwa	basic parts		gwang	2	opening
bau	basic parts		bau	2	container
nau	basic parts: body			1	nose
pi	basic parts: body			1	surface
bo	basic parts: body			0.5	body
ko	basic parts: body		sho	0.5	arm
to	basic parts: body		ko (kopf, kapeza, gosdfgdsfg, etc)	0.5	head
ta	basic parts: prepositions		shang	1	over
ne	basic parts: prepositions		li is the best tbh	1	inside
la	elements		ko	1	hot
kang	elements			2	metal
ki	elements	seven	loi:lisa0.5		air
lo	elements		su (turkic)	2	water
swe	elements		soi	0.5	soil
gu	elements		bu	0.5	stuff
li	elements		chi	2	energy
pwa	elements		pwa; mo		plant
boi	humans			2	animal
sa	humans			0.5	life
yang	humans		moi, yang	1	male
mu	humans		shi; nyu	1	female
mi	humans			1	me
yu	humans			1	you
mang	humans			1	person
mau	humans: superatomic			2	cat
kau	humans: superatomic			0.5	cow
ai	humans: superatomic				egg
au	numbers			1.5	all
na	numbers		di; su	1.5	number
wa	numbers			0.5	one
do	numbers			0.5	two
ti	numbers			0.5	three
kwa	numbers		k*	0	four
pai	numbers			0	five
lu	numbers	place		0.5	six
ki	numbers	air		0	seven
bang	numbers			0.5	eight
noi	numbers			0.5	nine
u	proper nouns			4	foreign_particle
i	relations			2	this
a	relations			2	that
e	relations			2	what
lai	relations		ling	1	other
ya	relations		la	0.5	back
leng	relations			0.5	link
tu	relations			2	direction
de	relations			0.5	of
nai	relations		cha	0	distance
tong	relations		gu (udm)	0	through
geng	relations				against
song	sensation:sound			1.5	sound
tang	sensation:taste			0	tongue
swang	sensation:taste			1	sour
swi	sensation:taste			0	sugar
moi	sensation:taste			1	salt
mwa	sensation:touch			1	touch
bai	sensation:vision		bai	2	light
ni	sensation:vision		doi; nwa: 1 but deemed too hard to say	0.5	dark
lang	sensation:vision			1	color
si	sensation:vision		ga (see in Chechen)	2	see
mai	universe		naye	0	but
bi	universe			1	be
du	universe			2	do
swa	universe			2	self
so	universe			0.5	like
no	universe			2	no
kwe	universe			0.5	order
ba	universe			0.75	with
pe	verbs		kele	0.5	play
yo	verbs			1	have
pu	verbs			0	put
gau	verbs				get
ge	verbs		de (indo-european)	1	give
go	verbs			1	go
te	verbs			0.5	specific
kai	verbs		ne (birth in Latin); ga (open in Yoruba)	0.5	start
dong	verbs			0.5	move
ke	verbs		po; hwai; sang	1	break
yau	verbs 2: modals			0.5	want
yong	verbs 2: modals			0.5	use
dwa	verbs 2: modals			2	must
nang	verbs 2: modals			2	can
me	verbs 2: modals			1	possibility
bu	verbs 2: modals		soi	0.5	seek
kong	verbs 2: modals			0.5	continue
nya	verbs: human			1	bite
tau	verbs: human			0.5	jump
ka	verbs: human			1	eat
dau	verbs: human			0.5	sleep
ting	wh			2	thing
lu	wh	six		2	place
wai	wh			2	reason
we	wh			2	way
pa	wh		pala	1.5	fruit
tai	wh			0.5	time
twi	wh			0.5	kind""".split("\n")

data = []
for d in data_raw:
  parts = d.split("\t")
  datum = {
      'surface': parts[0],
      'cat': parts[1].replace(":", "_").replace(" ", "_"),
      'gloss': parts[5],
      }
  data.append(datum)

cats = {datum['cat'] for datum in data}
bycat = {cat:[datum for datum in data if datum['cat'] == cat] for cat in cats}

for cat, data_i in bycat.items():
  d = f"/Users/icaswell/Desktop/tvr_img/{cat}"
  # os.system(f"mkdir {d}")
  r  = random.randint(0, 256)
  g  = random.randint(0, 256)
  b  = random.randint(0, 256)
  print(f"{cat}: ({r}, {g}, {b})")
  for datum in data_i:
    # if datum["surface"] != "li":
    #   continue
    save_img (atom_text=datum['surface'], def_text=datum['gloss'], box_color=(r, g, b), dirpath=d)

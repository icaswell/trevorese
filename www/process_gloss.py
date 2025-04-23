# process_gloss.py (v3 - No Prettify)
import re
from bs4 import BeautifulSoup, NavigableString, Tag
import os

# --- Configuration ---
script_dir = os.path.dirname(os.path.abspath(__file__))
input_html_file = os.path.join(script_dir, 'tutorial.html')
output_html_file = os.path.join(script_dir, 'tutorial_processed_final.html') # New output filename
# --- End Configuration ---

print(f"Reading input file: {input_html_file}")

# Read the HTML file
try:
    with open(input_html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
except FileNotFoundError:
    print(f"Error: Input file not found at {input_html_file}")
    exit(1)
except Exception as e:
    print(f"Error reading input file: {e}")
    exit(1)

print("Parsing HTML...")
soup = BeautifulSoup(html_content, 'html.parser')

tables = soup.find_all('table')
print(f"Found {len(tables)} tables. Processing...")
processed_cells = 0

for table_index, table in enumerate(tables):
    header = table.find('thead')
    if not header:
        header_row = table.find('tr')
        if not header_row: continue
        headers = header_row.find_all('th')
    else:
        headers = header.find_all('th')

    gloss_col_index = -1
    for i, th in enumerate(headers):
        if th.get_text(strip=True).lower() == 'gloss':
            gloss_col_index = i
            break

    if gloss_col_index != -1:
        body = table.find('tbody')
        if not body:
            all_rows = table.find_all('tr')
            rows = all_rows[1:] if len(all_rows) > 0 and headers and all_rows[0] == header_row else all_rows
        else:
            rows = body.find_all('tr')

        for row_index, row in enumerate(rows):
            cells = row.find_all(['td', 'th']) # Also check th cells in body if any
            if gloss_col_index < len(cells):
                target_cell = cells[gloss_col_index]
                original_contents = list(target_cell.contents) # Make a copy to iterate
                new_cell_contents = [] # Build the new content for the cell
                content_changed = False

                for item in original_contents:
                    if isinstance(item, NavigableString):
                        # Process text nodes, preserving spaces and punctuation
                        text = str(item)
                         # Find words (including hyphens) OR any non-whitespace character sequences
                        tokens = re.findall(r'([\w-]+)|(\S+)|(\s+)', text)
                        for word_token, non_word_token, space_token in tokens:
                            if word_token: # It's a word
                                new_span = soup.new_tag("span", **{'class': 'gloss'})
                                new_span.string = word_token
                                new_cell_contents.append(new_span)
                                content_changed = True
                            elif non_word_token: # It's punctuation or other non-word, non-space
                                new_cell_contents.append(NavigableString(non_word_token))
                            elif space_token: # It's whitespace
                                new_cell_contents.append(NavigableString(space_token))
                    elif isinstance(item, Tag) and item.name == 'b':
                        # Process bold tags, preserving spaces and punctuation within
                        text = item.decode_contents() # Get inner HTML/text
                        tokens = re.findall(r'([\w-]+)|(\S+)|(\s+)', text)
                        for word_token, non_word_token, space_token in tokens:
                            if word_token: # Word inside <b>
                                new_span = soup.new_tag("span", **{'class': 'gloss-emph'})
                                new_span.string = word_token
                                new_cell_contents.append(new_span)
                                content_changed = True
                            elif non_word_token: # Punctuation inside <b>
                                new_cell_contents.append(NavigableString(non_word_token))
                            elif space_token: # Whitespace inside <b>
                                new_cell_contents.append(NavigableString(space_token))
                    else:
                        # Keep other tags/elements as they are
                        new_cell_contents.append(item)


                # Replace cell content only if something was actually changed (spans added)
                if content_changed:
                    target_cell.clear() # Remove old content
                    for new_item in new_cell_contents:
                        target_cell.append(new_item) # Add new processed items
                    processed_cells += 1


print(f"Processed {processed_cells} cells in gloss columns.")

# Write the modified HTML to the output file
print(f"Writing output file: {output_html_file}")
try:
    with open(output_html_file, 'w', encoding='utf-8') as f:
        # Use str(soup) instead of soup.prettify()
        f.write(str(soup))
    print("-" * 20)
    print(f"Processing complete.")
    print(f"IMPORTANT: The modified HTML has been saved to:")
    print(f"  {output_html_file}")
    print(f"Please review this new file carefully.")
    print(f"If it looks correct, you can manually replace '{os.path.basename(input_html_file)}' with '{os.path.basename(output_html_file)}'.")
    print("-" * 20)
except Exception as e:
    print(f"Error writing output file: {e}")
    exit(1)

#!/usr/bin/env python3
"""
Dictionary to Text Converter

This script reads the sesowi.tsv file and outputs a text form of the dictionary
that matches the display format in the popups.
"""

import os
import csv
import re
import sys
from collections import defaultdict

def load_dictionary(tsv_path):
    """Load the dictionary data from TSV file"""
    entries = {}
    descendants_map = defaultdict(list)
    
    try:
        with open(tsv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            headers = next(reader)  # Get header row
            
            # Map column indices to their names
            col_indices = {name: i for i, name in enumerate(headers)}
            
            for row in reader:
                if not row or not any(row):  # Skip empty rows
                    continue
                
                # Extract basic entry information
                entry = {
                    'surface': row[col_indices.get('surface', 0)].strip() if col_indices.get('surface', 0) < len(row) else '',
                    'gloss': row[col_indices.get('gloss', 1)].strip() if col_indices.get('gloss', 1) < len(row) else '',
                    'supergloss': row[col_indices.get('supergloss', 2)].strip() if col_indices.get('supergloss', 2) < len(row) else '',
                    'supercompound': row[col_indices.get('supercompound', 3)].strip() if col_indices.get('supercompound', 3) < len(row) else '',
                    'display_gloss': row[col_indices.get('display gloss', 4)].strip() if col_indices.get('display gloss', 4) < len(row) else '',
                    'facets': {}
                }
                
                # Extract facets (parts of speech, etc.)
                for field in ['noun/pronoun', 'verb', 'adj/adv', 'quantifier', 'conjunction', 
                             'preposition', 'affix', 'interjection', 'fn', 'cognates', 'COMMENTS/TODOS']:
                    if field in col_indices and col_indices[field] < len(row):
                        value = row[col_indices[field]].strip()
                        if value:
                            entry['facets'][field] = value
                
                # Skip entries without a gloss
                if not entry['gloss']:
                    continue
                
                # Store the entry
                entries[entry['gloss']] = entry
                
                # If this is a compound word, record it as a descendant of its components
                if '-' in entry['gloss']:
                    components = entry['gloss'].split('-')
                    for component in components:
                        component = component.strip()
                        if component:
                            descendants_map[component].append(entry['gloss'])
        
        # Add descendants to each entry
        for gloss, descendants in descendants_map.items():
            if gloss in entries:
                entries[gloss]['descendants'] = descendants
        
        print(f"Loaded {len(entries)} dictionary entries")
        return entries
        
    except Exception as e:
        print(f"Error loading dictionary: {e}")
        return {}

def format_entry(entry):
    """Format a dictionary entry as text"""
    lines = []
    
    # Format the header: surface (gloss)
    if entry['surface']:
        # Use the existing surface form
        header = entry['surface']
    elif '-' in entry['gloss']:
        # For compounds without a surface form, construct it from components
        components = entry['gloss'].split('-')
        surface_parts = []
        for component in components:
            component = component.strip()
            if component in all_entries and all_entries[component]['surface']:
                surface_parts.append(all_entries[component]['surface'])
            # Skip empty components (like in 'plant-egg')
            elif component:
                surface_parts.append(component)
        
        header = ''.join(surface_parts)
    elif ' ' in entry['gloss']:
        # For multiword entries like "all of", look up each word's surface form
        words = entry['gloss'].split(' ')
        surface_parts = []
        for word in words:
            word = word.strip()
            if word in all_entries and all_entries[word]['surface']:
                surface_parts.append(all_entries[word]['surface'])
            else:
                surface_parts.append(word)
        
        header = ' '.join(surface_parts)
    else:
        # Fallback to gloss if no surface form can be constructed
        header = entry['gloss']
    
    # Determine what to show in parentheses
    if entry['display_gloss']:
        header += f" ({entry['display_gloss']})"
    elif entry['supergloss']:
        if entry['supercompound'] and entry['supercompound'] != entry['gloss']:
            header += f" ({entry['supergloss']} > {entry['supercompound']} > {entry['gloss']})"
        else:
            header += f" ({entry['supergloss']} > {entry['gloss']})"
    else:
        header += f" ({entry['gloss']})"
    
    lines.append(header)
    
    # Add each facet
    field_order = [
        ('noun/pronoun', 'noun'),
        ('verb', 'verb'),
        ('adj/adv', 'adj/adv'),
        ('quantifier', 'quantifier'),
        ('conjunction', 'conjunction'),
        ('preposition', 'preposition'),
        ('affix', 'affix'),
        ('interjection', 'interjection'),
        ('fn', 'function word')
    ]
    
    for tsv_field, display_name in field_order:
        if tsv_field in entry['facets'] and entry['facets'][tsv_field]:
            lines.append(f"  * {display_name}: {entry['facets'][tsv_field]}")
    
    # Add descendants
    if 'descendants' in entry and entry['descendants']:
        formatted_descendants = []
        for desc_gloss in entry['descendants']:
            if desc_gloss in all_entries:
                desc_entry = all_entries[desc_gloss]
                # Always use surface form for descendants
                if desc_entry['surface']:
                    formatted_descendants.append(desc_entry['surface'])
                else:
                    # If no surface form exists, construct one for compounds
                    if '-' in desc_gloss:
                        # Build surface form from components
                        components = desc_gloss.split('-')
                        surface_parts = []
                        for component in components:
                            component = component.strip()
                            if component in all_entries and all_entries[component]['surface']:
                                surface_parts.append(all_entries[component]['surface'])
                            elif component:
                                surface_parts.append(component)
                        formatted_descendants.append(''.join(surface_parts))
                    else:
                        # Fallback to gloss if no surface form can be constructed
                        formatted_descendants.append(desc_gloss)
            else:
                formatted_descendants.append(desc_gloss)
        
        lines.append(f"  * Descendants: {', '.join(formatted_descendants)}")
    
    # Add cognates
    if 'cognates' in entry['facets'] and entry['facets']['cognates']:
        lines.append(f"  * cognates: {entry['facets']['cognates']}")
    
    # Add notes
    if 'COMMENTS/TODOS' in entry['facets'] and entry['facets']['COMMENTS/TODOS']:
        lines.append(f"  * Notes: {entry['facets']['COMMENTS/TODOS']}")
    
    return '\n'.join(lines)

def sort_entries(entries):
    """Sort entries by atom/compound/phrase and then by complexity"""
    # Separate atoms, compounds, and phrases
    atoms = []
    compounds = []
    phrases = []
    
    for gloss, entry in entries.items():
        if '-' in gloss:
            compounds.append(entry)
        elif ' ' in gloss:
            phrases.append(entry)
        else:
            atoms.append(entry)
    
    # Sort atoms by surface form
    atoms.sort(key=lambda e: e['surface'] if e['surface'] else e['gloss'])
    
    # Sort compounds by complexity (number of components) and then by surface form
    compounds.sort(key=lambda e: (
        len(e['gloss'].split('-')),
        e['surface'] if e['surface'] else e['gloss']
    ))
    
    # Sort phrases by length and then by surface form
    phrases.sort(key=lambda e: (
        len(e['gloss'].split(' ')),
        e['surface'] if e['surface'] else e['gloss']
    ))
    
    return atoms, compounds, phrases

def generate_dictionary_text(entries):
    """Generate the full dictionary text"""
    atoms, compounds, phrases = sort_entries(entries)
    
    # Create the header with description
    lines = [
        "# Sesowi Dictionary",
        "",
        "## How to Read This Dictionary",
        "",
        "Each entry in this dictionary follows this format:",
        "",
        "```",
        "surface_form (gloss)",
        "  * noun: meaning of this word as a noun",
        "  * verb: meaning of this word as a verb",
        "  * [...]",
        "  * Descendants: words derived from this entry",
        "```",
        "",
        "The dictionary is organized into three sections:",
        "1. **Atoms**: Basic, indivisible words",
        "2. **Compounds**: Words formed by combining two or more atoms",
        "3. **Phrases**: Multi-word expressions",
        "",
        "## Atoms",
        ""
    ]
    
    # Add atoms
    for entry in atoms:
        lines.append(format_entry(entry))
        lines.append("")
    
    # Add compounds
    lines.append("## Compounds")
    lines.append("")
    
    for entry in compounds:
        lines.append(format_entry(entry))
        lines.append("")
    
    # Add phrases
    lines.append("## Phrases")
    lines.append("")
    
    for entry in phrases:
        lines.append(format_entry(entry))
        lines.append("")
    
    return '\n'.join(lines)

if __name__ == "__main__":
    # Load the dictionary
    # Use the main project directory for the TSV file
    tsv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sesowi.tsv')
    all_entries = load_dictionary(tsv_path)
    
    if all_entries:
        # Generate the dictionary text
        dictionary_text = generate_dictionary_text(all_entries)
        
        # Write to output file
        output_path = os.path.join(os.path.dirname(__file__), 'dictionary.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(dictionary_text)
        
        print(f"Successfully created dictionary.txt with {len(all_entries)} entries")
    else:
        print("Failed to generate dictionary text")

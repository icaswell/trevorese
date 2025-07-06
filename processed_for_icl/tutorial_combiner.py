#!/usr/bin/env python3
"""
Tutorial Combiner Script

This script processes all tutorial_part_* files and outputs a single text file
called "tutorial_combined.txt" with the following transformations:
1. Replaces gloss spans with their surface forms from the dictionary
2. Removes all HTML tags
3. Converts tables to bullet lists
"""

import os
import re
import csv
import sys
from html.parser import HTMLParser

# Global variables to store dictionary mappings
atom_gloss_to_surface = {}
surface_to_gloss = {}

def load_dictionary(tsv_path):
    """Load the dictionary data from TSV file"""
    global atom_gloss_to_surface, surface_to_gloss
    
    try:
        with open(tsv_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Split into lines and process
            lines = content.split('\n')
            header = None
            gloss_idx = -1
            surface_idx = -1
            
            for line in lines:
                if not line.strip():
                    continue
                    
                fields = line.split('\t')
                
                if header is None:
                    # Process header row
                    header = fields
                    for i, field in enumerate(header):
                        if field.strip() == 'gloss':
                            gloss_idx = i
                        elif field.strip() == 'surface':
                            surface_idx = i
                    continue
                
                if gloss_idx >= 0 and surface_idx >= 0 and len(fields) > max(gloss_idx, surface_idx):
                    gloss = fields[gloss_idx].strip()
                    surface = fields[surface_idx].strip()
                    
                    if gloss and surface:
                        # Store mapping from gloss to surface
                        atom_gloss_to_surface[gloss] = surface
                        
                        # Store mapping from surface to gloss
                        surface_to_gloss[surface] = gloss
        
        print(f"Loaded {len(atom_gloss_to_surface)} dictionary entries")
    except Exception as e:
        print(f"Error loading dictionary: {e}")

def get_surface_for_gloss(gloss):
    """Get surface form for a gloss"""
    if not gloss:
        return ''
    
    # Check if it's a direct match
    if gloss in atom_gloss_to_surface:
        return atom_gloss_to_surface[gloss]
    
    # Check if it's a compound (contains hyphens)
    if '-' in gloss:
        parts = gloss.split('-')
        surface_parts = []
        for part in parts:
            trimmed_part = part.strip()
            if trimmed_part in atom_gloss_to_surface:
                surface_parts.append(atom_gloss_to_surface[trimmed_part])
            else:
                surface_parts.append(trimmed_part)
        return ''.join(surface_parts)
    
    # Return the original if no match found
    return gloss

def extract_tables(html_content):
    """Extract tables from HTML content"""
    tables = []
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL)
    
    for table_match in table_pattern.finditer(html_content):
        table_html = table_match.group(1)
        
        # Extract headers
        headers = []
        th_pattern = re.compile(r'<th[^>]*>(.*?)</th>', re.DOTALL)
        for th_match in th_pattern.finditer(table_html):
            header_text = re.sub(r'<[^>]*>', '', th_match.group(1)).strip()
            headers.append(header_text)
        
        # Extract rows
        rows = []
        tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
        for tr_match in tr_pattern.finditer(table_html):
            row_html = tr_match.group(1)
            
            # Skip header rows
            if '<th' in row_html:
                continue
                
            # Extract cells
            cells = []
            td_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
            for td_match in td_pattern.finditer(row_html):
                cell_html = td_match.group(1)
                
                # Process cell content - replace gloss spans with surface forms
                cell_content = cell_html
                
                # Find all gloss spans in the cell
                span_pattern = re.compile(r'<span class="gloss(?:-emph)?">(.*?)</span>', re.DOTALL)
                for span_match in span_pattern.finditer(cell_html):
                    gloss_text = span_match.group(1).strip()
                    surface_form = get_surface_for_gloss(gloss_text)
                    
                    # Replace the span with the surface form
                    cell_content = cell_content.replace(span_match.group(0), surface_form)
                
                # Remove any remaining HTML tags
                cell_text = re.sub(r'<[^>]*>', '', cell_content).strip()
                cells.append(cell_text)
            
            rows.append(cells)
        
        tables.append({
            'headers': headers,
            'rows': rows
        })
    
    return tables

def process_html_file(file_path):
    """Process a single HTML file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We'll process the HTML in order of appearance to maintain the correct flow
        # First, let's extract all relevant elements in order
        elements = []
        
        # Extract headers
        header_pattern = re.compile(r'<div class="collapsible-header">(.*?)</div>', re.DOTALL)
        for header_match in header_pattern.finditer(content):
            header_text = re.sub(r'<[^>]*>', '', header_match.group(1)).strip()
            pos = header_match.start()
            
            # Determine if it's a main header or subheader
            if f'<div class="section-h2">\s*<div class="collapsible-header">{re.escape(header_text)}' in content:
                elements.append({
                    'type': 'header',
                    'level': 1,
                    'text': header_text,
                    'position': pos
                })
            else:
                elements.append({
                    'type': 'header',
                    'level': 2,
                    'text': header_text,
                    'position': pos
                })
        
        # Extract paragraphs
        paragraph_pattern = re.compile(r'<p>(.*?)</p>', re.DOTALL)
        for p_match in paragraph_pattern.finditer(content):
            p_content = p_match.group(1)
            pos = p_match.start()
            
            # Process gloss spans in paragraph
            span_pattern = re.compile(r'<span class="gloss(?:-emph)?">(.*?)</span>', re.DOTALL)
            for span_match in span_pattern.finditer(p_content):
                gloss_text = span_match.group(1).strip()
                surface_form = get_surface_for_gloss(gloss_text)
                
                # Replace the span with the surface form
                p_content = p_content.replace(span_match.group(0), surface_form)
            
            # Remove any remaining HTML tags
            p_text = re.sub(r'<[^>]*>', '', p_content).strip()
            if p_text:
                elements.append({
                    'type': 'paragraph',
                    'text': p_text,
                    'position': pos
                })
        
        # Extract tables
        table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL)
        for table_match in table_pattern.finditer(content):
            table_html = table_match.group(0)  # Get the full table HTML
            pos = table_match.start()
            
            # Extract headers
            headers = []
            th_pattern = re.compile(r'<th[^>]*>(.*?)</th>', re.DOTALL)
            for th_match in th_pattern.finditer(table_html):
                header_text = re.sub(r'<[^>]*>', '', th_match.group(1)).strip()
                headers.append(header_text)
            
            # Extract rows
            rows = []
            tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
            for tr_match in tr_pattern.finditer(table_html):
                row_html = tr_match.group(1)
                
                # Skip header rows
                if '<th' in row_html:
                    continue
                    
                # Extract cells
                cells = []
                td_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
                for td_match in td_pattern.finditer(row_html):
                    cell_html = td_match.group(1)
                    
                    # Process cell content - replace gloss spans with surface forms
                    cell_content = cell_html
                    
                    # Find all gloss spans in the cell
                    span_pattern = re.compile(r'<span class="gloss(?:-emph)?">(.*?)</span>', re.DOTALL)
                    for span_match in span_pattern.finditer(cell_html):
                        gloss_text = span_match.group(1).strip()
                        surface_form = get_surface_for_gloss(gloss_text)
                        
                        # Replace the span with the surface form
                        cell_content = cell_content.replace(span_match.group(0), surface_form)
                    
                    # Remove any remaining HTML tags
                    cell_text = re.sub(r'<[^>]*>', '', cell_content).strip()
                    cells.append(cell_text)
                
                rows.append(cells)
            
            elements.append({
                'type': 'table',
                'headers': headers,
                'rows': rows,
                'position': pos
            })
        
        # Sort elements by position to maintain the original order
        elements.sort(key=lambda x: x['position'])
        
        # Generate the output
        output = []
        for element in elements:
            if element['type'] == 'header':
                level_marker = '#' * element['level']
                output.append(f"\n{level_marker} {element['text']}\n")
            elif element['type'] == 'paragraph':
                output.append(element['text'] + "\n\n")
            elif element['type'] == 'table':
                output.append("\n")  # Add spacing before table
                
                for row in element['rows']:
                    for i, cell in enumerate(row):
                        header = element['headers'][i] if i < len(element['headers']) else f"column{i+1}"
                        # Replace 'gloss:' with 'sesowi:' if that's the header
                        if header.lower() == 'gloss':
                            header = 'sesowi'
                        output.append(f"  * {header}: {cell}")
                    output.append("")  # Add blank line between rows
        
        # Combine all content
        combined = '\n'.join(output)
        
        # Clean up the output
        combined = re.sub(r'\n{3,}', '\n\n', combined)  # Remove excessive newlines
        
        return combined
    
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
        return ''

def process_tutorial_files():
    """Process all tutorial files"""
    try:
        # Load dictionary
        load_dictionary(os.path.join(os.path.dirname(__file__), 'sesowi.tsv'))
        
        # Find all tutorial part files
        tutorial_files = [f for f in os.listdir(os.path.dirname(__file__)) 
                         if f.startswith('tutorial_part_') and f.endswith('.html')]
        tutorial_files.sort()  # Sort to ensure correct order
        
        print(f"Found {len(tutorial_files)} tutorial files to process")
        
        combined_content = ""
        
        # Process each file
        for file in tutorial_files:
            print(f"Processing {file}...")
            file_path = os.path.join(os.path.dirname(__file__), file)
            processed_content = process_html_file(file_path)
            combined_content += processed_content + "\n\n"
        
        # Write the combined content to output file
        output_path = os.path.join(os.path.dirname(__file__), 'tutorial_combined.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(combined_content)
        
        print(f"Successfully created tutorial_combined.txt")
    except Exception as e:
        print(f"Error processing tutorial files: {e}")

if __name__ == "__main__":
    process_tutorial_files()

#!/usr/bin/env python3
"""
GEDCOM to JSON parser for the family tree project.
Converts Ancestry GEDCOM export to our custom JSON format.
"""

import re
import json
from datetime import datetime
from pathlib import Path

def parse_gedcom(file_path):
    """Parse a GEDCOM file into structured data."""

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    individuals = {}
    families = {}
    sources = {}

    current_record = None
    current_id = None
    current_level_stack = [{}]

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Parse line: LEVEL [ID] TAG [VALUE]
        match = re.match(r'^(\d+)\s+(@\w+@)?\s*(\w+)\s*(.*)?$', line)
        if not match:
            i += 1
            continue

        level = int(match.group(1))
        xref_id = match.group(2)
        tag = match.group(3)
        value = match.group(4) or ''

        # Level 0 starts a new record
        if level == 0:
            if xref_id:
                if tag == 'INDI':
                    current_record = {'type': 'INDI', 'id': xref_id, 'raw': {}}
                    individuals[xref_id] = current_record
                elif tag == 'FAM':
                    current_record = {'type': 'FAM', 'id': xref_id, 'raw': {}}
                    families[xref_id] = current_record
                elif tag == 'SOUR':
                    current_record = {'type': 'SOUR', 'id': xref_id, 'raw': {}}
                    sources[xref_id] = current_record
                else:
                    current_record = None
            else:
                current_record = None
        elif current_record:
            # Store raw data for each record
            if tag not in current_record['raw']:
                current_record['raw'][tag] = []
            current_record['raw'][tag].append({'value': value, 'sub': {}})

            # Look ahead for sub-tags
            j = i + 1
            current_sub = current_record['raw'][tag][-1]['sub']
            while j < len(lines):
                sub_line = lines[j].strip()
                sub_match = re.match(r'^(\d+)\s+(@\w+@)?\s*(\w+)\s*(.*)?$', sub_line)
                if not sub_match:
                    j += 1
                    continue
                sub_level = int(sub_match.group(1))
                if sub_level <= level:
                    break
                if sub_level == level + 1:
                    sub_tag = sub_match.group(3)
                    sub_value = sub_match.group(4) or ''
                    if sub_tag not in current_sub:
                        current_sub[sub_tag] = []
                    current_sub[sub_tag].append(sub_value)
                j += 1

        i += 1

    return individuals, families, sources


def format_date(date_str):
    """Convert GEDCOM date to our format (March 15, 1892)."""
    if not date_str:
        return None

    # Clean up the date string
    date_str = date_str.strip()

    # Handle "abt", "about", "circa", "bef", "aft" prefixes
    prefix = ''
    for p in ['ABT ', 'ABOUT ', 'CIRCA ', 'BEF ', 'AFT ', 'EST ']:
        if date_str.upper().startswith(p):
            prefix_map = {'ABT ': 'circa ', 'ABOUT ': 'circa ', 'CIRCA ': 'circa ',
                         'BEF ': 'before ', 'AFT ': 'after ', 'EST ': 'circa '}
            prefix = prefix_map.get(p.upper(), '')
            date_str = date_str[len(p):]
            break

    # Try various date formats
    date_formats = [
        '%d %b %Y',      # 15 Mar 1892
        '%d %B %Y',      # 15 March 1892
        '%b %d, %Y',     # Mar 15, 1892
        '%B %d, %Y',     # March 15, 1892
        '%d %b %y',      # 15 Mar 92
        '%Y',            # 1892
        '%b %Y',         # Mar 1892
        '%B %Y',         # March 1892
    ]

    for fmt in date_formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            if fmt == '%Y':
                return f"{prefix}{dt.year}"
            elif fmt in ['%b %Y', '%B %Y']:
                return f"{prefix}{dt.strftime('%B')} {dt.year}"
            else:
                return f"{prefix}{dt.strftime('%B')} {dt.day}, {dt.year}"
        except ValueError:
            continue

    # Return original if we can't parse
    return prefix + date_str if date_str else None


def extract_person(indi_data):
    """Extract person data from GEDCOM INDI record."""
    raw = indi_data['raw']

    person = {
        'id': indi_data['id'].replace('@', ''),
        'firstName': '',
        'middleName': None,
        'lastName': '',
        'maidenName': None,
        'gender': None,
        'birth': {'date': None, 'place': None},
        'death': {'date': None, 'place': None},
        'notes': None,
        'profilePhoto': None,
        'residences': [],
        'ancestryId': indi_data['id']
    }

    # Name
    if 'NAME' in raw:
        name_entry = raw['NAME'][0]
        full_name = name_entry['value']

        # Extract surname from /Surname/ format
        surname_match = re.search(r'/([^/]*)/', full_name)
        if surname_match:
            person['lastName'] = surname_match.group(1)

        # Get given name from GIVN sub-tag or parse from full name
        if 'GIVN' in name_entry['sub']:
            givn = name_entry['sub']['GIVN'][0]
            name_parts = givn.split()
            person['firstName'] = name_parts[0] if name_parts else ''
            if len(name_parts) > 1:
                person['middleName'] = ' '.join(name_parts[1:])
        else:
            # Parse from full name (remove surname)
            given = re.sub(r'/[^/]*/', '', full_name).strip()
            name_parts = given.split()
            person['firstName'] = name_parts[0] if name_parts else ''
            if len(name_parts) > 1:
                person['middleName'] = ' '.join(name_parts[1:])

    # Gender
    if 'SEX' in raw:
        sex = raw['SEX'][0]['value']
        person['gender'] = 'male' if sex == 'M' else 'female' if sex == 'F' else None

    # Birth
    if 'BIRT' in raw:
        birt = raw['BIRT'][0]
        if 'DATE' in birt['sub']:
            person['birth']['date'] = format_date(birt['sub']['DATE'][0])
        if 'PLAC' in birt['sub']:
            person['birth']['place'] = birt['sub']['PLAC'][0]

    # Death
    if 'DEAT' in raw:
        deat = raw['DEAT'][0]
        if 'DATE' in deat['sub']:
            person['death']['date'] = format_date(deat['sub']['DATE'][0])
        if 'PLAC' in deat['sub']:
            person['death']['place'] = deat['sub']['PLAC'][0]

    # Notes
    if 'NOTE' in raw:
        notes = [n['value'] for n in raw['NOTE'] if n['value']]
        if notes:
            person['notes'] = ' '.join(notes)

    # Residences
    if 'RESI' in raw:
        for resi in raw['RESI']:
            residence = {}
            if 'DATE' in resi['sub']:
                residence['date'] = format_date(resi['sub']['DATE'][0])
            if 'PLAC' in resi['sub']:
                residence['place'] = resi['sub']['PLAC'][0]
            if residence:
                person['residences'].append(residence)

    # Family connections (stored for later processing)
    person['_famc'] = [f['value'] for f in raw.get('FAMC', [])]  # Child of family
    person['_fams'] = [f['value'] for f in raw.get('FAMS', [])]  # Spouse in family

    return person


def extract_family(fam_data):
    """Extract family data from GEDCOM FAM record."""
    raw = fam_data['raw']

    family = {
        'id': fam_data['id'].replace('@', ''),
        'husband': None,
        'wife': None,
        'children': [],
        'marriageDate': None,
        'marriagePlace': None,
        'divorceDate': None,
        'ancestryId': fam_data['id']
    }

    if 'HUSB' in raw:
        family['husband'] = raw['HUSB'][0]['value'].replace('@', '')
    if 'WIFE' in raw:
        family['wife'] = raw['WIFE'][0]['value'].replace('@', '')
    if 'CHIL' in raw:
        family['children'] = [c['value'].replace('@', '') for c in raw['CHIL']]

    if 'MARR' in raw:
        marr = raw['MARR'][0]
        if 'DATE' in marr['sub']:
            family['marriageDate'] = format_date(marr['sub']['DATE'][0])
        if 'PLAC' in marr['sub']:
            family['marriagePlace'] = marr['sub']['PLAC'][0]

    if 'DIV' in raw:
        div = raw['DIV'][0]
        if 'DATE' in div['sub']:
            family['divorceDate'] = format_date(div['sub']['DATE'][0])

    return family


def build_relationships(families, people_by_id):
    """Build relationships list from families."""
    relationships = []
    rel_id = 1

    for fam_id, family in families.items():
        # Spouse relationship
        if family['husband'] and family['wife']:
            relationships.append({
                'id': f'r{rel_id:03d}',
                'type': 'spouse',
                'person1': family['husband'],
                'person2': family['wife'],
                'marriageDate': family['marriageDate'],
                'marriagePlace': family['marriagePlace'],
                'divorceDate': family['divorceDate']
            })
            rel_id += 1

        # Parent-child relationships
        parents = [p for p in [family['husband'], family['wife']] if p]
        for child_id in family['children']:
            for parent_id in parents:
                relationships.append({
                    'id': f'r{rel_id:03d}',
                    'type': 'parent-child',
                    'parent': parent_id,
                    'child': child_id
                })
                rel_id += 1

    return relationships


def create_id_mapping(people):
    """Create a mapping from Ancestry IDs to our simple IDs."""
    mapping = {}
    for i, person in enumerate(people, 1):
        old_id = person['ancestryId'].replace('@', '')
        new_id = f'p{i:03d}'
        mapping[old_id] = new_id
    return mapping


def remap_ids(people, relationships, id_mapping):
    """Replace Ancestry IDs with our simple IDs."""

    # Update people
    for person in people:
        old_id = person['ancestryId'].replace('@', '')
        person['id'] = id_mapping[old_id]
        # Remove internal fields
        del person['_famc']
        del person['_fams']
        del person['ancestryId']

    # Update relationships
    for rel in relationships:
        if rel.get('person1'):
            rel['person1'] = id_mapping.get(rel['person1'], rel['person1'])
        if rel.get('person2'):
            rel['person2'] = id_mapping.get(rel['person2'], rel['person2'])
        if rel.get('parent'):
            rel['parent'] = id_mapping.get(rel['parent'], rel['parent'])
        if rel.get('child'):
            rel['child'] = id_mapping.get(rel['child'], rel['child'])

    return people, relationships, id_mapping


def main():
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    gedcom_path = project_dir / 'Strandt Family Tree.ged'
    data_dir = project_dir / 'data'
    data_dir.mkdir(exist_ok=True)

    print(f"Parsing GEDCOM: {gedcom_path}")

    # Parse GEDCOM
    individuals, families, sources = parse_gedcom(gedcom_path)

    print(f"Found {len(individuals)} individuals")
    print(f"Found {len(families)} families")
    print(f"Found {len(sources)} sources")

    # Extract people
    people = []
    people_by_old_id = {}
    for indi_id, indi_data in individuals.items():
        person = extract_person(indi_data)
        people.append(person)
        people_by_old_id[indi_id.replace('@', '')] = person

    # Extract families and build relationships
    family_data = {}
    for fam_id, fam in families.items():
        family_data[fam_id.replace('@', '')] = extract_family(fam)

    relationships = build_relationships(family_data, people_by_old_id)

    # Create ID mapping and remap
    id_mapping = create_id_mapping(people)
    people, relationships, id_mapping = remap_ids(people, relationships, id_mapping)

    # Find Joseph Walter Sprys and Lois Jane Stokes to report their new IDs
    joseph_id = None
    lois_id = None
    for person in people:
        if person['firstName'] == 'Joseph' and person['lastName'] == 'Sprys' and person.get('middleName') == 'Walter':
            joseph_id = person['id']
        if person['firstName'] == 'Lois' and person['lastName'] == 'Stokes':
            lois_id = person['id']

    print(f"\nRoot people for tree:")
    print(f"  Joseph Walter Sprys: {joseph_id}")
    print(f"  Lois Jane Stokes: {lois_id}")

    # Write people.json
    people_output = {'people': people}
    with open(data_dir / 'people.json', 'w', encoding='utf-8') as f:
        json.dump(people_output, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(people)} people to data/people.json")

    # Write relationships.json
    rel_output = {'relationships': relationships}
    with open(data_dir / 'relationships.json', 'w', encoding='utf-8') as f:
        json.dump(rel_output, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(relationships)} relationships to data/relationships.json")

    # Write empty sources.json (to be populated with media later)
    sources_output = {'sources': []}
    with open(data_dir / 'sources.json', 'w', encoding='utf-8') as f:
        json.dump(sources_output, f, indent=2, ensure_ascii=False)
    print(f"Wrote empty sources to data/sources.json (populate with media later)")

    # Write ID mapping for reference
    with open(data_dir / 'id_mapping.json', 'w', encoding='utf-8') as f:
        # Invert mapping for easier lookup
        inverted = {v: k for k, v in id_mapping.items()}
        json.dump({'ancestryToNew': id_mapping, 'newToAncestry': inverted}, f, indent=2)
    print(f"Wrote ID mapping to data/id_mapping.json")

    # Print some stats
    print(f"\n--- Statistics ---")
    print(f"Total people: {len(people)}")
    print(f"Total relationships: {len(relationships)}")

    spouse_rels = len([r for r in relationships if r['type'] == 'spouse'])
    parent_child_rels = len([r for r in relationships if r['type'] == 'parent-child'])
    print(f"  Spouse relationships: {spouse_rels}")
    print(f"  Parent-child relationships: {parent_child_rels}")

    # Count by gender
    males = len([p for p in people if p['gender'] == 'male'])
    females = len([p for p in people if p['gender'] == 'female'])
    unknown = len([p for p in people if p['gender'] is None])
    print(f"  Males: {males}, Females: {females}, Unknown: {unknown}")


if __name__ == '__main__':
    main()

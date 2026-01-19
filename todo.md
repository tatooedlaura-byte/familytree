# Family Tree Web Application - Full Plan

## Overview

A self-hosted, static family tree website with interactive tree visualization, searchable profiles, and document/image attachments. Hosted free on GitHub Pages.

---

## Data Structure Design

### Folder Structure

```
family-tree/
├── index.html              # Main entry point
├── css/
│   └── styles.css          # All styling
├── js/
│   ├── app.js              # Main application logic
│   ├── tree.js             # Tree visualization
│   ├── search.js           # Search functionality
│   └── profile.js          # Person profile rendering
├── data/
│   ├── people.json         # All people in the tree
│   ├── relationships.json  # Family relationships
│   └── sources.json        # Records and documents metadata
├── media/
│   ├── photos/             # Portrait photos
│   ├── census/             # Census record images
│   ├── deaths/             # Death certificates
│   ├── marriages/          # Marriage certificates
│   ├── births/             # Birth certificates
│   └── other/              # Other documents
└── README.md               # Repository documentation
```

### people.json Schema

```json
{
  "people": [
    {
      "id": "p001",
      "firstName": "John",
      "middleName": "William",
      "lastName": "Smith",
      "maidenName": null,
      "gender": "male",
      "birth": {
        "date": "1892-03-15",
        "place": "Boston, Massachusetts, USA"
      },
      "death": {
        "date": "1967-11-22",
        "place": "Boston, Massachusetts, USA"
      },
      "notes": "Worked as a carpenter. Immigrated from Ireland in 1888.",
      "profilePhoto": "photos/john_smith.jpg"
    }
  ]
}
```

### relationships.json Schema

```json
{
  "relationships": [
    {
      "id": "r001",
      "type": "parent-child",
      "parent": "p001",
      "child": "p003"
    },
    {
      "id": "r002",
      "type": "spouse",
      "person1": "p001",
      "person2": "p002",
      "marriageDate": "1915-06-20",
      "marriagePlace": "Boston, Massachusetts, USA",
      "divorceDate": null
    }
  ]
}
```

### sources.json Schema

```json
{
  "sources": [
    {
      "id": "s001",
      "type": "census",
      "title": "1920 US Census - Smith Household",
      "date": "1920-01-15",
      "location": "Boston, Massachusetts",
      "file": "census/1920_smith_household.jpg",
      "linkedPeople": ["p001", "p002", "p003"],
      "notes": "Shows family living at 123 Main Street",
      "citation": "Year: 1920; Census Place: Boston, Suffolk, Massachusetts; Roll: T625_123; Page: 4A"
    },
    {
      "id": "s002",
      "type": "death-certificate",
      "title": "Death Certificate - John Smith",
      "date": "1967-11-22",
      "file": "deaths/john_smith_death.jpg",
      "linkedPeople": ["p001"],
      "notes": "Lists cause of death and parents' names"
    },
    {
      "id": "s003",
      "type": "photo",
      "title": "Smith Family Portrait 1925",
      "date": "1925",
      "file": "photos/smith_family_1925.jpg",
      "linkedPeople": ["p001", "p002", "p003", "p004"],
      "notes": "Taken at family home"
    }
  ]
}
```

### Source Types

- `census` - Census records
- `death-certificate` - Death certificates
- `birth-certificate` - Birth certificates
- `marriage-certificate` - Marriage certificates
- `photo` - Photographs
- `military` - Military records
- `immigration` - Immigration/naturalization records
- `newspaper` - Newspaper clippings
- `other` - Other documents

---

## Feature Specifications

### 1. Tree Visualization

**Layout:**
- Ancestors expand upward (parents, grandparents, etc.)
- Descendants expand downward (children, grandchildren, etc.)
- Spouses displayed side-by-side horizontally
- Siblings displayed horizontally

**Interactions:**
- Click person to view their profile
- Click +/- to expand/collapse branches
- Zoom in/out for large trees
- Pan/drag to navigate
- Center on any person (make them the "root" view)

**Display:**
- Person boxes show: name, birth-death years, thumbnail photo
- Color coding by generation or family line (optional)
- Lines showing connections with relationship type

### 2. Person Profile Page

**Header:**
- Full name (including maiden name)
- Profile photo (or placeholder)
- Birth date and place
- Death date and place
- Age at death (calculated)

**Relationships Section:**
- Parents (linked)
- Spouse(s) (linked, with marriage info)
- Children (linked)
- Siblings (linked)

**Timeline:**
- Chronological list of life events
- Birth, marriages, census appearances, death
- Each event links to source document if available

**Documents & Media:**
- Gallery of attached images
- Census records with thumbnails
- Death certificate
- Other documents
- Click to view full-size with details

**Notes:**
- Biographical information
- Research notes

### 3. Search Functionality

**Search by:**
- Name (first, last, maiden)
- Birth year/range
- Death year/range
- Birth place
- Death place
- Any place (lived, married, etc.)

**Results:**
- List view with basic info
- Click to go to profile
- Click to center on tree

### 4. Navigation

**Main navigation:**
- Tree View (default)
- Search
- Index (alphabetical list of all people)
- Sources (browse all documents)

**Breadcrumbs:**
- Track navigation path
- Easy back navigation

### 5. Relationship Calculator

- Select two people
- Shows how they are related
- "John Smith is the great-grandfather of Jane Doe"

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up repository structure
- [ ] Create base HTML template
- [ ] Create CSS framework (layout, typography, colors)
- [ ] Create sample data files with a few test people
- [ ] Basic person profile page rendering

### Phase 2: Tree Visualization
- [ ] Implement tree data structure from relationships
- [ ] Render basic tree with boxes and lines
- [ ] Add expand/collapse functionality
- [ ] Add zoom and pan
- [ ] Add click-to-view-profile
- [ ] Style tree nodes (photos, names, dates)

### Phase 3: Search & Navigation
- [ ] Implement search index
- [ ] Create search UI
- [ ] Build alphabetical index page
- [ ] Add navigation between views
- [ ] Add "center on person" in tree

### Phase 4: Media & Sources
- [ ] Document gallery on profiles
- [ ] Full-size image viewer (lightbox)
- [ ] Sources browsing page
- [ ] Link sources to people in profiles

### Phase 5: Polish
- [ ] Responsive design (mobile-friendly)
- [ ] Relationship calculator
- [ ] Print-friendly tree view
- [ ] Loading states
- [ ] Error handling

### Phase 6: Data Population
- [ ] Import your actual family data
- [ ] Organize and add all media files
- [ ] Link sources to people
- [ ] Review and refine

---

## Technical Decisions

### Tree Rendering Approach

**Option A: Pure CSS/HTML (Recommended)**
- Use CSS flexbox/grid for layout
- Simpler, no library dependencies
- Good for trees up to ~500 people visible at once
- Easier to style and customize

**Option B: Canvas/SVG with D3.js**
- Better for very large trees (1000+)
- More complex to implement
- Smoother zoom/pan
- Steeper learning curve for modifications

**Recommendation:** Start with Option A. If performance becomes an issue with your tree size, can migrate to Option B.

### Image Handling

- Store original images in media folders
- Generate thumbnails on first load (or pre-generate)
- Lazy loading for performance
- Lightbox for full-size viewing

### Data Updates Workflow

1. You describe changes needed (new person, corrections, new documents)
2. I update the JSON files
3. You add any new images to the media folders
4. Commit and push to GitHub
5. Site updates automatically (GitHub Pages)

---

## File Naming Conventions

### People IDs
- Format: `p` + 3-digit number
- Example: `p001`, `p042`, `p156`

### Relationship IDs
- Format: `r` + 3-digit number
- Example: `r001`, `r042`

### Source IDs
- Format: `s` + 3-digit number
- Example: `s001`, `s042`

### Media Files
- Use descriptive names with underscores
- Include person name and year when known
- Examples:
  - `john_smith_portrait_1925.jpg`
  - `1920_census_smith_household.jpg`
  - `smith_doe_marriage_1915.jpg`

---

## Design Decisions (Confirmed)

1. **Color scheme:** Light theme with blues and purples
2. **Root person:** Joseph and Lois Sprys (tree centers on them by default)
3. **Date format:** March 15, 1892 (full month name)
4. **Privacy:** No restrictions needed

---

## Next Steps

1. ~~You create the GitHub repository~~ ✓ `tatooedlaura-byte/familytree`
2. ~~Answer design questions~~ ✓
3. I build Phase 1 (foundation + sample data)
4. You review and provide feedback
5. Continue through phases
6. Begin importing your actual data

---

## Notes

- All code will be vanilla HTML/CSS/JavaScript (no build tools required)
- No external dependencies except possibly a lightbox library for images
- Everything runs in the browser - no server required
- Works offline once loaded (if you download the repo)

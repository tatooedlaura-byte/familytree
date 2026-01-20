/**
 * Sprys Family Tree Application
 * A client-side family tree viewer
 */

// ============ Global State ============
const state = {
    people: [],
    relationships: [],
    sources: [],
    peopleById: {},
    rootPersonId: 'p016', // Joseph Walter Sprys
    rootSpouseId: 'p019', // Lois Jane Stokes
    currentView: 'tree',
    zoomLevel: 1,
    selectedPersonId: null
};

// ============ Data Loading ============
async function loadData() {
    try {
        const [peopleRes, relRes, sourcesRes] = await Promise.all([
            fetch('data/people.json'),
            fetch('data/relationships.json'),
            fetch('data/sources.json')
        ]);

        const peopleData = await peopleRes.json();
        const relData = await relRes.json();
        const sourcesData = await sourcesRes.json();

        state.people = peopleData.people;
        state.relationships = relData.relationships;
        state.sources = sourcesData.sources;

        // Build lookup map
        state.people.forEach(p => {
            state.peopleById[p.id] = p;
        });

        // Build relationship helpers
        buildRelationshipHelpers();

        console.log(`Loaded ${state.people.length} people, ${state.relationships.length} relationships`);

        // Initial render
        renderTree();
        renderPeopleList();
        updateCurrentRootLabel();

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('tree').innerHTML = `
            <div class="empty-state">
                <h3>Error loading data</h3>
                <p>Please make sure the data files are present.</p>
            </div>
        `;
    }
}

// ============ Relationship Helpers ============
function buildRelationshipHelpers() {
    state.people.forEach(p => {
        p._spouses = [];
        p._children = [];
        p._parents = [];
        p._siblings = [];
    });

    state.relationships.forEach(rel => {
        if (rel.type === 'spouse') {
            const p1 = state.peopleById[rel.person1];
            const p2 = state.peopleById[rel.person2];
            if (p1 && p2) {
                p1._spouses.push({ person: p2, marriageDate: rel.marriageDate, marriagePlace: rel.marriagePlace });
                p2._spouses.push({ person: p1, marriageDate: rel.marriageDate, marriagePlace: rel.marriagePlace });
            }
        } else if (rel.type === 'parent-child') {
            const parent = state.peopleById[rel.parent];
            const child = state.peopleById[rel.child];
            if (parent && child) {
                parent._children.push(child);
                child._parents.push(parent);
            }
        }
    });

    // Deduplicate children and find siblings
    state.people.forEach(p => {
        // Remove duplicate children
        const childIds = new Set();
        p._children = p._children.filter(c => {
            if (childIds.has(c.id)) return false;
            childIds.add(c.id);
            return true;
        });

        // Find siblings (people with same parents)
        if (p._parents.length > 0) {
            const parentId = p._parents[0].id;
            const parent = state.peopleById[parentId];
            if (parent) {
                p._siblings = parent._children.filter(c => c.id !== p.id);
            }
        }
    });
}

function getSpouse(person) {
    return person._spouses.length > 0 ? person._spouses[0].person : null;
}

function getChildren(person) {
    return person._children || [];
}

function getParents(person) {
    return person._parents || [];
}

// ============ Tree Rendering ============
function renderTree() {
    const tree = document.getElementById('tree');
    const rootPerson = state.peopleById[state.rootPersonId];
    const rootSpouse = state.peopleById[state.rootSpouseId];

    if (!rootPerson) {
        tree.innerHTML = '<div class="empty-state"><h3>Root person not found</h3></div>';
        return;
    }

    let html = '<div class="ancestors"></div>';

    // Render ancestors (parents and grandparents of root couple)
    html += renderAncestors(rootPerson, rootSpouse);

    // Render the root couple
    html += '<div class="generation root-generation">';
    html += '<div class="family-group">';
    html += '<div class="couple">';
    html += renderPersonCard(rootPerson, true);
    if (rootSpouse) {
        html += renderPersonCard(rootSpouse, true);
    }
    html += '</div>';

    // Render children and their descendants
    const children = getChildren(rootPerson);
    if (children.length > 0) {
        html += renderChildrenContainer(children);
    }

    html += '</div></div>';

    tree.innerHTML = html;
    tree.style.transform = `scale(${state.zoomLevel})`;

    // Add click handlers
    addCardClickHandlers();
}

function renderAncestors(person1, person2) {
    let html = '<div class="ancestors">';

    // Get parents of both root people
    const parents1 = getParents(person1);
    const parents2 = person2 ? getParents(person2) : [];

    if (parents1.length > 0 || parents2.length > 0) {
        // Grandparents level
        let grandparentsHtml = '<div class="ancestor-generation">';
        let hasGrandparents = false;

        // Person 1's grandparents
        parents1.forEach(parent => {
            const grandparents = getParents(parent);
            if (grandparents.length > 0) {
                hasGrandparents = true;
                grandparentsHtml += '<div class="couple">';
                grandparents.forEach(gp => {
                    grandparentsHtml += renderPersonCard(gp);
                });
                // If only one grandparent found, check for spouse
                if (grandparents.length === 1) {
                    const gpSpouse = getSpouse(grandparents[0]);
                    if (gpSpouse && !grandparents.includes(gpSpouse)) {
                        grandparentsHtml += renderPersonCard(gpSpouse);
                    }
                }
                grandparentsHtml += '</div>';
            }
        });

        // Person 2's grandparents
        parents2.forEach(parent => {
            const grandparents = getParents(parent);
            if (grandparents.length > 0) {
                hasGrandparents = true;
                grandparentsHtml += '<div class="couple">';
                grandparents.forEach(gp => {
                    grandparentsHtml += renderPersonCard(gp);
                });
                if (grandparents.length === 1) {
                    const gpSpouse = getSpouse(grandparents[0]);
                    if (gpSpouse && !grandparents.includes(gpSpouse)) {
                        grandparentsHtml += renderPersonCard(gpSpouse);
                    }
                }
                grandparentsHtml += '</div>';
            }
        });

        grandparentsHtml += '</div>';

        if (hasGrandparents) {
            html += grandparentsHtml;
        }

        // Parents level
        html += '<div class="ancestor-generation">';

        if (parents1.length > 0) {
            html += '<div class="couple">';
            parents1.forEach(parent => {
                html += renderPersonCard(parent);
            });
            // Check for spouse if only one parent
            if (parents1.length === 1) {
                const pSpouse = getSpouse(parents1[0]);
                if (pSpouse) {
                    html += renderPersonCard(pSpouse);
                }
            }
            html += '</div>';
        }

        if (parents2.length > 0) {
            html += '<div class="couple">';
            parents2.forEach(parent => {
                html += renderPersonCard(parent);
            });
            if (parents2.length === 1) {
                const pSpouse = getSpouse(parents2[0]);
                if (pSpouse) {
                    html += renderPersonCard(pSpouse);
                }
            }
            html += '</div>';
        }

        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderChildrenContainer(children) {
    if (children.length === 0) return '';

    const multipleClass = children.length > 1 ? 'multiple' : '';
    let html = `<div class="children-container ${multipleClass}">`;

    children.forEach(child => {
        html += '<div class="child-branch">';
        html += '<div class="couple">';
        html += renderPersonCard(child);

        // Add spouse if exists
        const spouse = getSpouse(child);
        if (spouse) {
            html += renderPersonCard(spouse);
        }
        html += '</div>';

        // Recursively render grandchildren
        const grandchildren = getChildren(child);
        if (grandchildren.length > 0) {
            html += renderChildrenContainer(grandchildren);
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

function renderPersonCard(person, isRoot = false) {
    const genderClass = person.gender || '';
    const selectedClass = person.id === state.selectedPersonId ? 'selected' : '';
    const birthYear = extractYear(person.birth?.date);
    const deathYear = extractYear(person.death?.date);
    const dates = formatLifeDates(birthYear, deathYear);

    const photoHtml = person.profilePhoto
        ? `<img src="media/${person.profilePhoto}" alt="${person.firstName}">`
        : getInitials(person);

    return `
        <div class="person-card ${genderClass} ${selectedClass}" data-person-id="${person.id}">
            <div class="photo">${photoHtml}</div>
            <div class="name">${person.firstName} ${person.lastName}</div>
            <div class="dates">${dates}</div>
        </div>
    `;
}

function addCardClickHandlers() {
    document.querySelectorAll('.person-card').forEach(card => {
        card.addEventListener('click', () => {
            const personId = card.dataset.personId;
            showProfile(personId);
        });
    });
}

// ============ Profile Panel ============
function showProfile(personId) {
    const person = state.peopleById[personId];
    if (!person) return;

    state.selectedPersonId = personId;

    const panel = document.getElementById('profile-panel');
    const content = document.getElementById('profile-content');

    const genderClass = person.gender || '';
    const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
    const birthYear = extractYear(person.birth?.date);
    const deathYear = extractYear(person.death?.date);
    const lifeDates = formatLifeDates(birthYear, deathYear);

    const photoHtml = person.profilePhoto
        ? `<img src="media/${person.profilePhoto}" alt="${fullName}">`
        : getInitials(person);

    let html = `
        <div class="profile-header ${genderClass}">
            <div class="photo">${photoHtml}</div>
            <h2>${fullName}</h2>
            <div class="life-dates">${lifeDates}</div>
        </div>
    `;

    // Birth & Death
    html += '<div class="profile-section">';
    html += '<h3>Vital Information</h3>';

    if (person.birth?.date || person.birth?.place) {
        html += '<div class="detail">';
        html += '<div class="label">Birth</div>';
        html += `<div class="value">${person.birth.date || 'Unknown date'}`;
        if (person.birth.place) html += `<br>${person.birth.place}`;
        html += '</div></div>';
    }

    if (person.death?.date || person.death?.place) {
        html += '<div class="detail">';
        html += '<div class="label">Death</div>';
        html += `<div class="value">${person.death.date || 'Unknown date'}`;
        if (person.death.place) html += `<br>${person.death.place}`;
        html += '</div></div>';
    }

    html += '</div>';

    // Family Relationships
    html += '<div class="profile-section">';
    html += '<h3>Family</h3>';

    // Parents
    const parents = getParents(person);
    if (parents.length > 0) {
        html += '<div class="detail"><div class="label">Parents</div><div class="value">';
        parents.forEach(parent => {
            html += renderRelationLink(parent);
        });
        html += '</div></div>';
    }

    // Spouses
    if (person._spouses.length > 0) {
        html += '<div class="detail"><div class="label">Spouse</div><div class="value">';
        person._spouses.forEach(spouseInfo => {
            html += renderRelationLink(spouseInfo.person);
            if (spouseInfo.marriageDate) {
                html += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.25rem;">m. ${spouseInfo.marriageDate}</div>`;
            }
        });
        html += '</div></div>';
    }

    // Children
    const children = getChildren(person);
    if (children.length > 0) {
        html += '<div class="detail"><div class="label">Children</div><div class="value">';
        children.forEach(child => {
            html += renderRelationLink(child);
        });
        html += '</div></div>';
    }

    // Siblings
    if (person._siblings && person._siblings.length > 0) {
        html += '<div class="detail"><div class="label">Siblings</div><div class="value">';
        person._siblings.forEach(sibling => {
            html += renderRelationLink(sibling);
        });
        html += '</div></div>';
    }

    html += '</div>';

    // Timeline
    const events = buildTimeline(person);
    if (events.length > 0) {
        html += '<div class="profile-section">';
        html += '<h3>Timeline</h3>';
        html += '<div class="timeline">';
        events.forEach(event => {
            html += `
                <div class="timeline-item">
                    <div class="date">${event.date}</div>
                    <div class="event">${event.description}</div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    // Notes
    if (person.notes) {
        html += '<div class="profile-section">';
        html += '<h3>Notes</h3>';
        html += `<p>${person.notes}</p>`;
        html += '</div>';
    }

    // Actions
    html += `
        <div class="profile-actions">
            <button class="primary-btn" onclick="centerTreeOn('${person.id}')">View in Tree</button>
        </div>
    `;

    content.innerHTML = html;
    panel.classList.add('open');

    // Add click handlers for relation links
    content.querySelectorAll('.relation-link').forEach(link => {
        link.addEventListener('click', () => {
            showProfile(link.dataset.personId);
        });
    });

    // Update selected state in tree
    document.querySelectorAll('.person-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.personId === personId);
    });
}

function renderRelationLink(person) {
    const genderClass = person.gender || '';
    return `
        <span class="relation-link ${genderClass}" data-person-id="${person.id}">
            ${person.firstName} ${person.lastName}
        </span>
    `;
}

function buildTimeline(person) {
    const events = [];

    if (person.birth?.date) {
        events.push({
            date: person.birth.date,
            sortDate: parseDate(person.birth.date),
            description: `Born${person.birth.place ? ' in ' + person.birth.place : ''}`
        });
    }

    // Add residences
    if (person.residences) {
        person.residences.forEach(res => {
            if (res.date && res.place) {
                events.push({
                    date: res.date,
                    sortDate: parseDate(res.date),
                    description: `Resided in ${res.place}`
                });
            }
        });
    }

    // Add marriages
    person._spouses.forEach(spouseInfo => {
        if (spouseInfo.marriageDate) {
            events.push({
                date: spouseInfo.marriageDate,
                sortDate: parseDate(spouseInfo.marriageDate),
                description: `Married ${spouseInfo.person.firstName} ${spouseInfo.person.lastName}${spouseInfo.marriagePlace ? ' in ' + spouseInfo.marriagePlace : ''}`
            });
        }
    });

    if (person.death?.date) {
        events.push({
            date: person.death.date,
            sortDate: parseDate(person.death.date),
            description: `Died${person.death.place ? ' in ' + person.death.place : ''}`
        });
    }

    // Sort by date
    events.sort((a, b) => (a.sortDate || 0) - (b.sortDate || 0));

    return events;
}

function closeProfile() {
    document.getElementById('profile-panel').classList.remove('open');
    state.selectedPersonId = null;
    document.querySelectorAll('.person-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
}

// ============ List View ============
function renderPeopleList() {
    const list = document.getElementById('people-list');
    const sortBy = document.getElementById('sort-select').value;

    const sorted = [...state.people].sort((a, b) => {
        if (sortBy === 'lastName') {
            return (a.lastName || '').localeCompare(b.lastName || '');
        } else if (sortBy === 'firstName') {
            return (a.firstName || '').localeCompare(b.firstName || '');
        } else if (sortBy === 'birthDate') {
            return (parseDate(a.birth?.date) || 0) - (parseDate(b.birth?.date) || 0);
        }
        return 0;
    });

    list.innerHTML = sorted.map(person => {
        const genderClass = person.gender || '';
        const birthYear = extractYear(person.birth?.date);
        const deathYear = extractYear(person.death?.date);
        const dates = formatLifeDates(birthYear, deathYear);
        const location = person.birth?.place || '';

        return `
            <div class="person-list-item ${genderClass}" data-person-id="${person.id}">
                <div class="photo">${getInitials(person)}</div>
                <div class="info">
                    <div class="name">${person.firstName} ${person.lastName}</div>
                    <div class="dates">${dates}</div>
                    ${location ? `<div class="location">${location}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.person-list-item').forEach(item => {
        item.addEventListener('click', () => {
            showProfile(item.dataset.personId);
        });
    });
}

// ============ Search ============
function initSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();

        if (query.length < 2) {
            results.classList.remove('active');
            return;
        }

        const matches = state.people.filter(p => {
            const fullName = `${p.firstName} ${p.middleName || ''} ${p.lastName}`.toLowerCase();
            const maidenName = (p.maidenName || '').toLowerCase();
            return fullName.includes(query) || maidenName.includes(query);
        }).slice(0, 10);

        if (matches.length === 0) {
            results.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            results.innerHTML = matches.map(person => {
                const birthYear = extractYear(person.birth?.date);
                const deathYear = extractYear(person.death?.date);
                const dates = formatLifeDates(birthYear, deathYear);

                return `
                    <div class="search-result-item" data-person-id="${person.id}">
                        <div class="name">${person.firstName} ${person.lastName}</div>
                        <div class="dates">${dates}</div>
                    </div>
                `;
            }).join('');

            results.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const personId = item.dataset.personId;
                    if (personId) {
                        showProfile(personId);
                        input.value = '';
                        results.classList.remove('active');
                    }
                });
            });
        }

        results.classList.add('active');
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            results.classList.remove('active');
        }
    });
}

// ============ Navigation ============
function initNavigation() {
    document.getElementById('nav-tree').addEventListener('click', () => {
        switchView('tree');
    });

    document.getElementById('nav-list').addEventListener('click', () => {
        switchView('list');
    });

    document.getElementById('close-profile').addEventListener('click', closeProfile);

    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        state.zoomLevel = Math.min(state.zoomLevel + 0.1, 2);
        document.getElementById('tree').style.transform = `scale(${state.zoomLevel})`;
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        state.zoomLevel = Math.max(state.zoomLevel - 0.1, 0.3);
        document.getElementById('tree').style.transform = `scale(${state.zoomLevel})`;
    });

    document.getElementById('zoom-reset').addEventListener('click', () => {
        state.zoomLevel = 1;
        document.getElementById('tree').style.transform = 'scale(1)';
    });

    // Sort control
    document.getElementById('sort-select').addEventListener('change', renderPeopleList);

    // Lightbox
    document.getElementById('close-lightbox').addEventListener('click', () => {
        document.getElementById('lightbox').classList.remove('active');
    });

    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            document.getElementById('lightbox').classList.remove('active');
        }
    });
}

function switchView(view) {
    state.currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`${view}-view`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');
}

function centerTreeOn(personId) {
    const person = state.peopleById[personId];
    if (!person) return;

    // Find their spouse
    const spouse = getSpouse(person);

    state.rootPersonId = personId;
    state.rootSpouseId = spouse ? spouse.id : null;

    renderTree();
    updateCurrentRootLabel();
    closeProfile();
    switchView('tree');
}

function updateCurrentRootLabel() {
    const person = state.peopleById[state.rootPersonId];
    const spouse = state.rootSpouseId ? state.peopleById[state.rootSpouseId] : null;

    let label = `Centered on: ${person.firstName} ${person.lastName}`;
    if (spouse) {
        label += ` & ${spouse.firstName} ${spouse.lastName}`;
    }

    document.getElementById('current-root').textContent = label;
}

// ============ Utility Functions ============
function extractYear(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : null;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : null;
}

function formatLifeDates(birthYear, deathYear) {
    if (birthYear && deathYear) {
        return `${birthYear} - ${deathYear}`;
    } else if (birthYear) {
        return `b. ${birthYear}`;
    } else if (deathYear) {
        return `d. ${deathYear}`;
    }
    return '';
}

function getInitials(person) {
    const first = (person.firstName || '?')[0];
    const last = (person.lastName || '?')[0];
    return `${first}${last}`;
}

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSearch();
    loadData();
});

// Make centerTreeOn available globally for onclick
window.centerTreeOn = centerTreeOn;

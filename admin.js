// Admin credentials (In production, this should be on a backend server)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'southsan2026' // Change this password!
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const articleForm = document.getElementById('articleForm');
const articleTitle = document.getElementById('articleTitle');
const urlPreview = document.getElementById('urlPreview');
const formMessage = document.getElementById('formMessage');
const articlesList = document.getElementById('articlesList');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const articleSections = document.getElementById('articleSections');
const addSectionBtn = document.getElementById('addSectionBtn');

// Global state
let sectionCounter = 0;

// Check if admin is already logged in
if (localStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
}

// Login form handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        loginError.textContent = '';
    } else {
        loginError.textContent = 'Invalid username or password';
    }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    loginScreen.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
    loginForm.reset();
});

// Show dashboard
function showDashboard() {
    loginScreen.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    loadArticles();
    
    // Add initial section
    if (articleSections.children.length === 0) {
        addSection();
    }
}

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Update buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        if (tabName === 'manage') {
            loadArticles();
        }
        
        if (COLLECTIONS[tabName]) {
            loadCollectionList(tabName);
            const sectionsContainer = document.getElementById(COLLECTIONS[tabName].sectionsId);
            if (sectionsContainer.children.length === 0) {
                addSection(COLLECTIONS[tabName].sectionsId);
            }
        }
        
        if (tabName === 'sources') {
            refreshSourcesPreview();
        }
    });
});

// Generate URL slug from title
articleTitle.addEventListener('input', (e) => {
    const slug = generateSlug(e.target.value);
    if (slug) {
        urlPreview.textContent = `${slug}.html`;
    } else {
        urlPreview.textContent = '(auto-generated from title)';
    }
});

function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Add Section Button
addSectionBtn.addEventListener('click', () => {
    addSection();
});

function addSection(containerId = 'articleSections') {
    sectionCounter++;
    const sectionId = `section-${sectionCounter}`;
    const container = document.getElementById(containerId);
    
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'article-section';
    sectionDiv.id = sectionId;
    sectionDiv.dataset.files = JSON.stringify([]);
    sectionDiv.innerHTML = `
        <div class="section-header">
            <span class="section-number">Section ${sectionCounter}</span>
            <button type="button" class="remove-section-btn" onclick="removeSection('${sectionId}')">Remove</button>
        </div>
        
        <div class="section-type-selector">
            <label>Section Type:</label>
            <select class="section-type" onchange="updateSectionContent('${sectionId}', this.value)">
                <option value="paragraph">Paragraph</option>
                <option value="heading">Heading</option>
                <option value="list">Bulleted List</option>
                <option value="numbered-list">Numbered List</option>
                <option value="quote">Quote</option>
                <option value="image-caption">Image with Caption</option>
            </select>
        </div>
        
        <div class="section-content-area">
            <div class="form-group">
                <label>Content:</label>
                <textarea class="section-content" rows="5" placeholder="Enter your paragraph text here..."></textarea>
            </div>
        </div>
        
        <div class="section-attachments">
            <h4 style="font-size: 0.95rem; color: var(--charcoal); margin-bottom: 0.75rem;">📎 Attachments for this Section</h4>
            <div class="form-group">
                <label>Add File:</label>
                <input type="file" class="section-file-input" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip" onchange="handleSectionFileUpload('${sectionId}', this)">
                <small>Add images, PDFs, videos, or documents to this section</small>
            </div>
            <div class="section-files-list"></div>
        </div>
    `;
    
    container.appendChild(sectionDiv);
    return sectionId;
}

function removeSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.remove();
    }
}

function updateSectionContent(sectionId, type) {
    const section = document.getElementById(sectionId);
    const contentArea = section.querySelector('.section-content-area');
    
    let contentHTML = '';
    
    switch(type) {
        case 'heading':
            contentHTML = `
                <div class="form-group">
                    <label>Heading Text:</label>
                    <input type="text" class="section-content" placeholder="Enter heading text..." />
                </div>
            `;
            break;
        case 'paragraph':
            contentHTML = `
                <div class="form-group">
                    <label>Paragraph Content:</label>
                    <textarea class="section-content" rows="5" placeholder="Enter your paragraph text here..."></textarea>
                </div>
            `;
            break;
        case 'list':
        case 'numbered-list':
            contentHTML = `
                <div class="form-group">
                    <label>List Items (one per line):</label>
                    <textarea class="section-content" rows="5" placeholder="Item 1&#10;Item 2&#10;Item 3"></textarea>
                </div>
            `;
            break;
        case 'quote':
            contentHTML = `
                <div class="form-group">
                    <label>Quote Text:</label>
                    <textarea class="section-content" rows="3" placeholder="Enter quote text..."></textarea>
                </div>
                <div class="form-group">
                    <label>Quote Author (optional):</label>
                    <input type="text" class="section-author" placeholder="Author name..." />
                </div>
            `;
            break;
        case 'image-caption':
            contentHTML = `
                <div class="form-group">
                    <label>Image URL or Filename:</label>
                    <input type="text" class="section-content" placeholder="e.g., assets/uploads/images/photo.jpg or https://..." />
                    <small>Upload image using the file upload below, then copy the filename here</small>
                </div>
                <div class="form-group">
                    <label>Caption (optional):</label>
                    <input type="text" class="section-caption" placeholder="Image caption..." />
                </div>
            `;
            break;
    }
    
    contentArea.innerHTML = contentHTML;
}

// File Upload Handler for Sections
function handleSectionFileUpload(sectionId, inputElement) {
    const section = document.getElementById(sectionId);
    const files = Array.from(inputElement.files);
    
    if (files.length === 0) return;
    
    files.forEach(file => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const fileData = {
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type,
                data: event.target.result,
                category: getFileCategory(file.type, file.name),
                description: '' // User will add description
            };
            
            // Get current files for this section
            let sectionFiles = JSON.parse(section.dataset.files || '[]');
            sectionFiles.push(fileData);
            section.dataset.files = JSON.stringify(sectionFiles);
            
            // Display the file
            displaySectionFile(sectionId, fileData, sectionFiles.length - 1);
        };
        
        reader.readAsDataURL(file);
    });
    
    // Reset file input
    inputElement.value = '';
}

function displaySectionFile(sectionId, fileData, fileIndex) {
    const section = document.getElementById(sectionId);
    const filesList = section.querySelector('.section-files-list');
    
    const fileDiv = document.createElement('div');
    fileDiv.className = 'section-file-item';
    fileDiv.dataset.fileIndex = fileIndex;
    
    let previewHTML = '';
    if (fileData.type.startsWith('image/')) {
        previewHTML = `<img src="${fileData.data}" alt="${fileData.name}" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px;">`;
    } else if (fileData.type.startsWith('video/')) {
        previewHTML = `<div class="file-icon-small">🎥</div>`;
    } else if (fileData.type.includes('pdf')) {
        previewHTML = `<div class="file-icon-small">📄</div>`;
    } else {
        previewHTML = `<div class="file-icon-small">📎</div>`;
    }
    
    fileDiv.innerHTML = `
        <div class="file-preview-row">
            <div class="file-preview-icon">
                ${previewHTML}
            </div>
            <div class="file-preview-info">
                <strong>${fileData.name}</strong> (${fileData.size})
                <div class="form-group" style="margin-top: 0.5rem;">
                    <label style="font-size: 0.85rem;">Description/Caption:</label>
                    <input type="text" class="file-description" value="${fileData.description}" 
                           placeholder="Describe this file for readers..." 
                           onchange="updateFileDescription('${sectionId}', ${fileIndex}, this.value)">
                    <small>This text will appear with a download link in the article</small>
                </div>
            </div>
            <button type="button" class="remove-file-btn-small" onclick="removeSectionFile('${sectionId}', ${fileIndex})">✕</button>
        </div>
    `;
    
    filesList.appendChild(fileDiv);
}

function updateFileDescription(sectionId, fileIndex, description) {
    const section = document.getElementById(sectionId);
    let sectionFiles = JSON.parse(section.dataset.files || '[]');
    if (sectionFiles[fileIndex]) {
        sectionFiles[fileIndex].description = description;
        section.dataset.files = JSON.stringify(sectionFiles);
    }
}

function removeSectionFile(sectionId, fileIndex) {
    const section = document.getElementById(sectionId);
    let sectionFiles = JSON.parse(section.dataset.files || '[]');
    sectionFiles.splice(fileIndex, 1);
    section.dataset.files = JSON.stringify(sectionFiles);
    
    // Refresh display
    refreshSectionFiles(sectionId);
}

function refreshSectionFiles(sectionId) {
    const section = document.getElementById(sectionId);
    const filesList = section.querySelector('.section-files-list');
    const sectionFiles = JSON.parse(section.dataset.files || '[]');
    
    filesList.innerHTML = '';
    sectionFiles.forEach((fileData, index) => {
        displaySectionFile(sectionId, fileData, index);
    });
}

function getFileCategory(mimeType, fileName) {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    return 'documents';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===================================================================
// Generic Collections (Board Meetings, Question and Responses, Educational Lingo)
// ===================================================================
const COLLECTIONS = {
    boardMeetings: {
        storageKey: 'boardMeetings',
        formId: 'boardMeetingForm',
        titleId: 'boardMeetingTitle',
        metaId: 'boardMeetingMeta',
        excerptId: 'boardMeetingExcerpt',
        sectionsId: 'boardMeetingSections',
        addSectionBtnId: 'addBoardMeetingSectionBtn',
        listId: 'boardMeetingsList',
        messageId: 'boardMeetingFormMessage',
        pageFile: 'board-meetings.html',
        pageTitle: 'Board Meetings',
        submitLabel: 'Publish Board Meeting',
        intro: 'Stay informed about upcoming and past school board meetings, agendas, and minutes.'
    },
    qa: {
        storageKey: 'qaEntries',
        formId: 'qaForm',
        titleId: 'qaTitle',
        metaId: 'qaMeta',
        excerptId: 'qaExcerpt',
        sectionsId: 'qaSections',
        addSectionBtnId: 'addQaSectionBtn',
        listId: 'qaList',
        messageId: 'qaFormMessage',
        pageFile: 'question-and-responses.html',
        pageTitle: 'Question and Responses',
        submitLabel: 'Publish Response',
        intro: 'Browse common questions and responses submitted by parents, students, and community members.'
    },
    lingo: {
        storageKey: 'lingoEntries',
        formId: 'lingoForm',
        titleId: 'lingoTitle',
        metaId: 'lingoMeta',
        excerptId: 'lingoExcerpt',
        sectionsId: 'lingoSections',
        addSectionBtnId: 'addLingoSectionBtn',
        listId: 'lingoList',
        messageId: 'lingoFormMessage',
        pageFile: 'educational-lingo.html',
        pageTitle: 'Educational Lingo',
        submitLabel: 'Publish Term',
        intro: 'A glossary of common terms and acronyms used in South San\'s schools and board discussions.'
    }
};

function getCollectionEntries(key) {
    return JSON.parse(localStorage.getItem(COLLECTIONS[key].storageKey) || '[]');
}

function saveCollectionEntries(key, entries) {
    localStorage.setItem(COLLECTIONS[key].storageKey, JSON.stringify(entries));
}

// Shared section-array -> published HTML (used for downloadable static pages)
function renderSectionsForPublish(sections, pathPrefix) {
    let html = '';
    (sections || []).forEach(section => {
        switch (section.type) {
            case 'heading':
                html += `                <h2>${escapeHtml(section.content)}</h2>\n`;
                break;
            case 'paragraph':
                html += `                <p>${escapeHtml(section.content)}</p>\n\n`;
                break;
            case 'list': {
                const items = section.content.split('\n').filter(item => item.trim());
                html += `                <ul>\n`;
                items.forEach(item => { html += `                    <li>${escapeHtml(item.trim())}</li>\n`; });
                html += `                </ul>\n\n`;
                break;
            }
            case 'numbered-list': {
                const items = section.content.split('\n').filter(item => item.trim());
                html += `                <ol>\n`;
                items.forEach(item => { html += `                    <li>${escapeHtml(item.trim())}</li>\n`; });
                html += `                </ol>\n\n`;
                break;
            }
            case 'quote':
                html += `                <blockquote>\n`;
                html += `                    <p>${escapeHtml(section.content)}</p>\n`;
                if (section.author) {
                    html += `                    <footer>— ${escapeHtml(section.author)}</footer>\n`;
                }
                html += `                </blockquote>\n\n`;
                break;
            case 'image-caption':
                html += `                <figure>\n`;
                html += `                    <img src="${pathPrefix}${escapeHtml(section.content)}" alt="${escapeHtml(section.caption || 'Image')}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
                if (section.caption) {
                    html += `                    <figcaption style="text-align: center; margin-top: 0.5rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtml(section.caption)}</figcaption>\n`;
                }
                html += `                </figure>\n\n`;
                break;
        }

        if (section.files && section.files.length > 0) {
            html += `                <div class="section-attachments-display">\n`;
            section.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : file.category === 'videos' ? '🎥' : '📄';
                const path = `${pathPrefix}assets/uploads/${file.category}/${file.name}`;
                const description = file.description || file.name;
                html += `                    <div class="attachment-item">\n`;
                html += `                        <span class="attachment-icon">${icon}</span>\n`;
                html += `                        <div class="attachment-content">\n`;
                html += `                            <p>${escapeHtml(description)}</p>\n`;
                html += `                            <a href="${path}" download class="attachment-download">📥 Download ${escapeHtml(file.name)} (${file.size})</a>\n`;
                html += `                        </div>\n`;
                html += `                    </div>\n`;
            });
            html += `                </div>\n\n`;
        }
    });
    return html;
}

function collectionNavHTML(activeKey, pathPrefix) {
    const link = (file, label, key) =>
        `<li><a href="${pathPrefix}${file}"${key === activeKey ? ' class="active"' : ''}>${label}</a></li>`;
    return `
                <ul class="nav-menu">
                    ${link('index.html', 'Home', null)}
                    ${link('articles.html', 'Articles', 'articles')}
                    ${link('board-meetings.html', 'Board Meetings', 'boardMeetings')}
                    ${link('question-and-responses.html', 'Question and Responses', 'qa')}
                    ${link('educational-lingo.html', 'Educational Lingo', 'lingo')}
                    ${link('sources.html', 'Sources', 'sources')}
                    ${link('about.html', 'About', null)}
                    ${link('contact.html', 'Contact', null)}
                </ul>`;
}

function generateCollectionPageHTML(key) {
    const cfg = COLLECTIONS[key];
    const entries = getCollectionEntries(key);

    const entriesHTML = entries.length === 0
        ? '<p style="text-align: center;">No entries available yet. Check back soon!</p>'
        : entries.map(entry => `
                <div class="article-preview">
                    <h2>${escapeHtml(entry.title)}</h2>
                    ${entry.meta ? `<p class="article-meta">${escapeHtml(entry.meta)}</p>` : ''}
                    <p>${escapeHtml(entry.excerpt)}</p>
                    <div class="article-content">
${renderSectionsForPublish(entry.sections, '')}
                    </div>
                </div>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(cfg.pageTitle)} - South San Education Explained</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained</div>${collectionNavHTML(key, '')}
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>${escapeHtml(cfg.pageTitle)}</h1>
            <p>${escapeHtml(cfg.intro)}</p>
            <div id="${key}Container">
${entriesHTML}
            </div>
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>

    <script src="content-loader.js"></script>
</body>
</html>`;
}

function downloadCollectionPage(key) {
    downloadArticleFile(COLLECTIONS[key].pageFile, generateCollectionPageHTML(key));
}

function loadCollectionList(key) {
    const cfg = COLLECTIONS[key];
    const listEl = document.getElementById(cfg.listId);
    const entries = getCollectionEntries(key);

    if (entries.length === 0) {
        listEl.innerHTML = '<p class="no-articles">No entries yet. Create the first one above!</p>';
        return;
    }

    listEl.innerHTML = entries.map(entry => `
        <div class="article-preview">
            <h2 style="cursor: pointer; color: var(--primary-teak);" onclick="viewCollectionEntry('${key}', ${entry.id})" title="Click to preview">${escapeHtml(entry.title)}</h2>
            ${entry.meta ? `<p class="article-meta">${escapeHtml(entry.meta)}</p>` : ''}
            <p>${escapeHtml(entry.excerpt)}</p>
            <p style="color: var(--muted-teak); font-size: 0.9rem; margin-top: 0.5rem;">
                ${entry.sections?.length || 0} sections • ${entry.sections?.reduce((sum, s) => sum + (s.files?.length || 0), 0) || 0} files attached
            </p>
            <div class="article-actions">
                <button class="btn-small" onclick="viewCollectionEntry('${key}', ${entry.id})" style="background-color: var(--primary-teak);">👁️ View</button>
                <button class="btn-small btn-edit" onclick="editCollectionEntry('${key}', ${entry.id})">✏️ Edit</button>
                <button class="btn-small btn-delete" onclick="deleteCollectionEntry('${key}', ${entry.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function editCollectionEntry(key, id) {
    const cfg = COLLECTIONS[key];
    const entries = getCollectionEntries(key);
    const entry = entries.find(e => e.id === id);

    if (!entry) {
        alert('Entry not found!');
        return;
    }

    // Switch to this tab
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${key}"]`).classList.add('active');
    document.getElementById(`${key}Tab`).classList.add('active');

    document.getElementById(cfg.titleId).value = entry.title;
    document.getElementById(cfg.metaId).value = entry.meta || '';
    document.getElementById(cfg.excerptId).value = entry.excerpt;

    const sectionsContainer = document.getElementById(cfg.sectionsId);
    sectionsContainer.innerHTML = '';

    (entry.sections || []).forEach(section => {
        const sectionId = addSection(cfg.sectionsId);
        const sectionDiv = document.getElementById(sectionId);

        const typeSelect = sectionDiv.querySelector('.section-type');
        typeSelect.value = section.type;
        updateSectionContent(sectionId, section.type);

        const contentInput = sectionDiv.querySelector('.section-content');
        contentInput.value = section.content;

        if (section.type === 'quote' && section.author) {
            const authorInput = sectionDiv.querySelector('.section-author');
            if (authorInput) authorInput.value = section.author;
        }
        if (section.type === 'image-caption' && section.caption) {
            const captionInput = sectionDiv.querySelector('.section-caption');
            if (captionInput) captionInput.value = section.caption;
        }

        if (section.files && section.files.length > 0) {
            sectionDiv.dataset.files = JSON.stringify(section.files);
            refreshSectionFiles(sectionId);
        }
    });

    document.getElementById(cfg.formId).dataset.editingId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const msgEl = document.getElementById(cfg.messageId);
    msgEl.textContent = `Editing entry. Click "${cfg.submitLabel}" to save changes.`;
    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--muted-teak)';
}

function deleteCollectionEntry(key, id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        let entries = getCollectionEntries(key);
        entries = entries.filter(e => e.id !== id);
        saveCollectionEntries(key, entries);
        loadCollectionList(key);
    }
}

async function viewCollectionEntry(key, id) {
    const entries = getCollectionEntries(key);
    const entry = entries.find(e => e.id === id);

    if (!entry) {
        alert('Entry not found!');
        return;
    }

    const contentHTML = generateArticleContentFromSections(entry);

    let cssContent = '';
    let cssLoaded = false;
    try {
        const response = await fetch('styles.css', { cache: 'no-cache' });
        if (response.ok) {
            cssContent = await response.text();
            cssLoaded = true;
        }
    } catch (e) {
        console.error('Failed to load CSS:', e);
    }

    const previewHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${escapeHtml(entry.title)} - South San Education Explained</title>
    ${cssLoaded ? `<style>${cssContent}</style>` : '<link rel="stylesheet" href="styles.css">'}
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained - Preview</div>
                <ul class="nav-menu">
                    <li><a href="#" onclick="window.close(); return false;">Home</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Articles</a></li>
                    <li><a href="#" onclick="window.close(); return false;"${key === 'boardMeetings' ? ' class="active"' : ''}>Board Meetings</a></li>
                    <li><a href="#" onclick="window.close(); return false;"${key === 'qa' ? ' class="active"' : ''}>Question and Responses</a></li>
                    <li><a href="#" onclick="window.close(); return false;"${key === 'lingo' ? ' class="active"' : ''}>Educational Lingo</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Sources</a></li>
                    <li><a href="#" onclick="window.close(); return false;">About</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>${escapeHtml(entry.title)}</h1>
            ${entry.meta ? `<p class="article-meta">${escapeHtml(entry.meta)}</p>` : ''}
            <div class="article-content">
                ${contentHTML}
            </div>
            <div style="margin-top: 3rem; text-align: center;">
                <a href="#" onclick="window.close(); return false;" style="color: var(--muted-teak); font-weight: 600;">← Close Preview</a>
            </div>
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>
</body>
</html>`;

    const blob = new Blob([previewHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
}

function setupCollectionForm(key) {
    const cfg = COLLECTIONS[key];
    const form = document.getElementById(cfg.formId);
    const messageEl = document.getElementById(cfg.messageId);

    document.getElementById(cfg.addSectionBtnId)?.addEventListener('click', () => {
        addSection(cfg.sectionsId);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById(cfg.titleId).value;
        const meta = document.getElementById(cfg.metaId).value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const excerpt = document.getElementById(cfg.excerptId).value;

        const sectionsContainer = document.getElementById(cfg.sectionsId);
        const sections = [];
        sectionsContainer.querySelectorAll('.article-section').forEach(sectionEl => {
            const type = sectionEl.querySelector('.section-type').value;
            const content = sectionEl.querySelector('.section-content')?.value || '';
            const author = sectionEl.querySelector('.section-author')?.value || '';
            const caption = sectionEl.querySelector('.section-caption')?.value || '';
            const files = JSON.parse(sectionEl.dataset.files || '[]');
            sections.push({ type, content, author, caption, files });
        });

        let entries = getCollectionEntries(key);
        const editingId = form.dataset.editingId;
        if (editingId) {
            entries = entries.filter(entry => entry.id !== parseInt(editingId));
            delete form.dataset.editingId;
        }

        const entry = {
            id: Date.now(),
            title,
            meta,
            excerpt,
            sections,
            dateCreated: new Date().toISOString()
        };

        entries.unshift(entry);
        saveCollectionEntries(key, entries);

        const totalFiles = sections.reduce((sum, section) => sum + (section.files?.length || 0), 0);

        messageEl.innerHTML = `
            <strong>✅ Saved!</strong><br><br>
            <button type="button" onclick="downloadCollectionPage('${key}')" class="submit-btn" style="font-size: 0.9rem; padding: 0.75rem 1.5rem;">
                📥 Download updated ${cfg.pageFile}
            </button><br><br>
            <strong>Next Steps:</strong><br>
            <small>
                1. Download the updated page above (it includes all entries)<br>
                2. Upload it to your GitHub repository, replacing <code>${cfg.pageFile}</code><br>
                ${totalFiles > 0 ? `3. Upload the ${totalFiles} attached file${totalFiles > 1 ? 's' : ''} to the appropriate folders in <code>/assets/uploads/</code><br>4. Regenerate the Sources page in the Sources tab` : '3. Regenerate the Sources page in the Sources tab if you attached files'}
            </small>
        `;

        form.reset();
        sectionsContainer.innerHTML = '';
        addSection(cfg.sectionsId);

        loadCollectionList(key);

        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { messageEl.innerHTML = ''; }, 30000);
    });
}

Object.keys(COLLECTIONS).forEach(setupCollectionForm);

// ===================================================================
// Sources Directory (auto-populated from all section file attachments)
// ===================================================================
function collectAllSources() {
    const sourceGroups = [
        { label: 'Articles', storageKey: 'articles', linkFor: entry => `articles/${entry.slug}.html` },
        { label: 'Board Meetings', storageKey: COLLECTIONS.boardMeetings.storageKey, linkFor: () => 'board-meetings.html' },
        { label: 'Question and Responses', storageKey: COLLECTIONS.qa.storageKey, linkFor: () => 'question-and-responses.html' },
        { label: 'Educational Lingo', storageKey: COLLECTIONS.lingo.storageKey, linkFor: () => 'educational-lingo.html' }
    ];

    const tree = [];

    sourceGroups.forEach(group => {
        const entries = JSON.parse(localStorage.getItem(group.storageKey) || '[]');
        const entriesWithFiles = [];

        entries.forEach(entry => {
            const files = [];
            (entry.sections || []).forEach(section => {
                (section.files || []).forEach(file => files.push(file));
            });
            if (files.length > 0) {
                entriesWithFiles.push({ title: entry.title, link: group.linkFor(entry), files });
            }
        });

        if (entriesWithFiles.length > 0) {
            tree.push({ label: group.label, entries: entriesWithFiles });
        }
    });

    return tree;
}

function renderSourcesTree(tree) {
    if (tree.length === 0) {
        return '<p>No files have been attached yet. Attachments added to Articles, Board Meetings, Question and Responses, or Educational Lingo sections will automatically appear here.</p>';
    }

    let html = '<ul class="file-tree">\n';
    tree.forEach(folder => {
        html += `    <li class="file-tree-folder"><span class="file-tree-label">📁 ${escapeHtml(folder.label)}</span>\n        <ul>\n`;
        folder.entries.forEach(entry => {
            html += `            <li class="file-tree-folder"><span class="file-tree-label">📁 <a href="${entry.link}">${escapeHtml(entry.title)}</a></span>\n                <ul>\n`;
            entry.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : file.category === 'videos' ? '🎥' : '📄';
                const path = `assets/uploads/${file.category}/${file.name}`;
                const desc = file.description ? ` — ${escapeHtml(file.description)}` : '';
                html += `                    <li class="file-tree-file"><a href="${path}" download>${icon} ${escapeHtml(file.name)}</a>${desc} <span class="file-size">(${file.size})</span></li>\n`;
            });
            html += `                </ul>\n            </li>\n`;
        });
        html += `        </ul>\n    </li>\n`;
    });
    html += '</ul>';
    return html;
}

function generateSourcesPageHTML() {
    const treeHTML = renderSourcesTree(collectAllSources());

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sources - South San Education Explained</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained</div>${collectionNavHTML('sources', '')}
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>Sources</h1>
            <p>Transparency matters. Below is a directory of every file — images, PDFs, documents, and videos — referenced across our articles and pages, organized by where they appear.</p>
            <div id="sourcesTree">
${treeHTML}
            </div>
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>

    <script src="content-loader.js"></script>
</body>
</html>`;
}

function refreshSourcesPreview() {
    document.getElementById('sourcesPreview').innerHTML = renderSourcesTree(collectAllSources());
}

document.getElementById('generateSourcesBtn').addEventListener('click', () => {
    downloadArticleFile('sources.html', generateSourcesPageHTML());
    refreshSourcesPreview();
    document.getElementById('sourcesFormMessage').innerHTML =
        '<strong>✅ sources.html regenerated and downloaded!</strong> Upload it to your GitHub repository root, replacing the existing file.';
    setTimeout(() => { document.getElementById('sourcesFormMessage').innerHTML = ''; }, 30000);
});

// Article form submission
articleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const meta = document.getElementById('articleMeta').value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const excerpt = document.getElementById('articleExcerpt').value;
    const slug = generateSlug(title);
    
    // Collect all sections
    const sections = [];
    const sectionElements = articleSections.querySelectorAll('.article-section');
    sectionElements.forEach(sectionEl => {
        const type = sectionEl.querySelector('.section-type').value;
        const content = sectionEl.querySelector('.section-content')?.value || '';
        const author = sectionEl.querySelector('.section-author')?.value || '';
        const caption = sectionEl.querySelector('.section-caption')?.value || '';
        const files = JSON.parse(sectionEl.dataset.files || '[]');
        
        sections.push({
            type,
            content,
            author,
            caption,
            files
        });
    });
    
    // Count total files across all sections
    const totalFiles = sections.reduce((sum, section) => sum + (section.files?.length || 0), 0);
    
    // Check if we're editing an existing article
    const editingId = articleForm.dataset.editingId;
    if (editingId) {
        // Delete the old version
        let articles = JSON.parse(localStorage.getItem('articles') || '[]');
        articles = articles.filter(a => a.id !== parseInt(editingId));
        localStorage.setItem('articles', JSON.stringify(articles));
        delete articleForm.dataset.editingId;
    }
    
    const article = {
        id: Date.now(),
        title,
        slug,
        meta,
        excerpt,
        sections,
        dateCreated: new Date().toISOString()
    };
    
    // Save article
    saveArticle(article);
    
    // Generate article HTML
    const articleHTML = generateArticleHTML(article);
    
    // Show success message with download link
    formMessage.innerHTML = `
        <strong>✅ Article created successfully!</strong><br><br>
        <button onclick="downloadArticleFile('${slug}.html', \`${articleHTML.replace(/`/g, '\\`')}\`)" 
                class="submit-btn" style="font-size: 0.9rem; padding: 0.75rem 1.5rem;">
            📥 Download ${slug}.html
        </button><br><br>
        <strong>Next Steps:</strong><br>
        <small>
            1. Download the HTML file above<br>
            2. Upload it to your GitHub repository's <code>/articles/</code> folder<br>
            ${totalFiles > 0 ? `3. Upload the ${totalFiles} attached file${totalFiles > 1 ? 's' : ''} to the appropriate folders in <code>/assets/uploads/</code><br>` : ''}
            ${totalFiles > 0 ? `4. Update articles.html to include this article` : '3. Update articles.html to include this article'}
        </small>
    `;
    
    // Reset form
    articleForm.reset();
    urlPreview.textContent = '(auto-generated from title)';
    articleSections.innerHTML = '';
    sectionCounter = 0;
    addSection(); // Add one initial section
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Clear message after 30 seconds
    setTimeout(() => {
        formMessage.innerHTML = '';
    }, 30000);
});

// Save article to localStorage
function saveArticle(article) {
    let articles = JSON.parse(localStorage.getItem('articles') || '[]');
    articles.unshift(article); // Add to beginning
    localStorage.setItem('articles', JSON.stringify(articles));
}

// Load articles for management
function loadArticles() {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    
    if (articles.length === 0) {
        articlesList.innerHTML = '<p class="no-articles">No articles yet. Create your first article!</p>';
        return;
    }
    
    articlesList.innerHTML = articles.map(article => `
        <div class="article-preview">
            <h2 style="cursor: pointer; color: var(--primary-teak);" onclick="viewArticle(${article.id})" title="Click to view article">${escapeHtml(article.title)}</h2>
            <p class="article-meta">Published: ${escapeHtml(article.meta || 'August 2026')}</p>
            <p>${escapeHtml(article.excerpt)}</p>
            <p style="color: var(--muted-teak); font-size: 0.9rem; margin-top: 0.5rem;">
                ${article.sections?.length || 0} sections • ${article.sections?.reduce((sum, s) => sum + (s.files?.length || 0), 0) || 0} files attached
            </p>
            <div class="article-actions">
                <button class="btn-small" onclick="viewArticle(${article.id})" style="background-color: var(--primary-teak);">👁️ View</button>
                <button class="btn-small btn-edit" onclick="editArticle(${article.id})">✏️ Edit</button>
                <button class="btn-small btn-delete" onclick="deleteArticle(${article.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Generate article HTML (for download - will be deployed to GitHub Pages)
function generateArticleHTML(article) {
    // Generate sections HTML (paths are relative to /articles/, so files live under ../assets/uploads/)
    const sectionsHTML = renderSectionsForPublish(article.sections, '../');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${escapeHtml(article.title)} - South San Education Explained</title>
    <link rel="stylesheet" href="../styles.css">
    <link rel="stylesheet" href="../admin-styles.css">
    <style>
        body { min-height: 100vh; display: flex; flex-direction: column; }
        main { flex: 1; }
    </style>
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained</div>
                <ul class="nav-menu">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="../articles.html" class="active">Articles</a></li>
                    <li><a href="../board-meetings.html">Board Meetings</a></li>
                    <li><a href="../question-and-responses.html">Question and Responses</a></li>
                    <li><a href="../educational-lingo.html">Educational Lingo</a></li>
                    <li><a href="../sources.html">Sources</a></li>
                    <li><a href="../about.html">About</a></li>
                    <li><a href="../contact.html">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>${escapeHtml(article.title)}</h1>
            <p class="article-meta">Published: ${escapeHtml(article.meta)}</p>
            <div class="article-content">
${sectionsHTML}
            </div>
            <div style="margin-top: 3rem; text-align: center;">
                <a href="../articles.html" style="color: var(--muted-teak); font-weight: 600;">← Back to Articles</a>
            </div>
        </article>
    </main>

    <footer>
        <div class="footer-content">
            <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
            <div class="footer-links">
                <a href="../about.html">About</a>
                <a href="../contact.html">Contact</a>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function downloadArticleFile(filename, content) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Delete article
function editArticle(id) {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.id === id);
    
    if (!article) {
        alert('Article not found!');
        return;
    }
    
    // Switch to create tab
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[0].classList.add('active');
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById('createTab').classList.add('active');
    
    // Populate form fields
    articleTitle.value = article.title;
    document.getElementById('articleMeta').value = article.meta || '';
    document.getElementById('articleExcerpt').value = article.excerpt;
    
    // Clear existing sections
    articleSections.innerHTML = '';
    sectionCounter = 0;
    
    // Load article sections
    article.sections.forEach(section => {
        const sectionId = addSection();
        const sectionDiv = document.getElementById(sectionId);
        
        // Set section type
        const typeSelect = sectionDiv.querySelector('.section-type');
        typeSelect.value = section.type;
        updateSectionContent(sectionId, section.type);
        
        // Set section content
        const contentInput = sectionDiv.querySelector('.section-content');
        contentInput.value = section.content;
        
        // Set author and caption for quotes and images
        if (section.type === 'quote' && section.author) {
            const authorInput = sectionDiv.querySelector('.section-author');
            if (authorInput) authorInput.value = section.author;
        }
        if (section.type === 'image-caption' && section.caption) {
            const captionInput = sectionDiv.querySelector('.section-caption');
            if (captionInput) captionInput.value = section.caption;
        }
        
        // Load files if any
        if (section.files && section.files.length > 0) {
            sectionDiv.dataset.files = JSON.stringify(section.files);
            refreshSectionFiles(sectionId);
        }
    });
    
    // Delete the old article on form submit
    articleForm.dataset.editingId = id;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    formMessage.textContent = 'Editing article. Click "Publish Article" to save changes.';
    formMessage.style.display = 'block';
    formMessage.style.color = 'var(--muted-teak)';
}

function deleteArticle(id) {
    if (confirm('Are you sure you want to delete this article?')) {
        let articles = JSON.parse(localStorage.getItem('articles') || '[]');
        articles = articles.filter(a => a.id !== id);
        localStorage.setItem('articles', JSON.stringify(articles));
        loadArticles();
    }
}

// View article (preview)
async function viewArticle(id) {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.id === id);
    
    if (!article) {
        alert('Article not found!');
        return;
    }
    
    // Generate content from sections
    const articleContent = generateArticleContentFromSections(article);
    
    // Fetch CSS content to inline it for blob preview
    let cssContent = '';
    let cssLoaded = false;
    
    try {
        const response = await fetch('styles.css', { cache: 'no-cache' });
        if (response.ok) {
            cssContent = await response.text();
            cssLoaded = true;
        }
    } catch (e) {
        console.error('Failed to load CSS:', e);
    }
    
    // Generate full article HTML with inlined CSS for preview
    const articleHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${escapeHtml(article.title)} - South San Education Explained</title>
    ${cssLoaded ? `<style>${cssContent}</style>` : '<link rel="stylesheet" href="styles.css">'}
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained - Preview</div>
                <ul class="nav-menu">
                    <li><a href="#" onclick="window.close(); return false;">Home</a></li>
                    <li><a href="#" onclick="window.close(); return false;" class="active">Articles</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Board Meetings</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Question and Responses</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Educational Lingo</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Sources</a></li>
                    <li><a href="#" onclick="window.close(); return false;">About</a></li>
                    <li><a href="#" onclick="window.close(); return false;">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>${escapeHtml(article.title)}</h1>
            <p class="article-meta">Published: ${escapeHtml(article.meta)}</p>
            <div class="article-content">
                ${articleContent}
            </div>
            <div style="margin-top: 3rem; text-align: center;">
                <a href="#" onclick="window.close(); return false;" style="color: var(--muted-teak); font-weight: 600;">← Close Preview</a>
            </div>
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>
</body>
</html>`;
    
    // Open in new tab
    const blob = new Blob([articleHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    
    // Clean up blob URL after window opens
    if (win) {
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
}

// Generate article content from sections (for preview)
function generateArticleContentFromSections(article) {
    if (!article.sections || article.sections.length === 0) {
        return '<p>No content available.</p>';
    }
    
    let contentHTML = '';
    
    article.sections.forEach(section => {
        switch(section.type) {
            case 'heading':
                contentHTML += `<h2>${escapeHtml(section.content)}</h2>\n`;
                break;
            case 'paragraph':
                contentHTML += `<p>${escapeHtml(section.content)}</p>\n\n`;
                break;
            case 'list':
                const listItems = section.content.split('\n').filter(item => item.trim());
                contentHTML += `<ul>\n`;
                listItems.forEach(item => {
                    contentHTML += `    <li>${escapeHtml(item.trim())}</li>\n`;
                });
                contentHTML += `</ul>\n\n`;
                break;
            case 'numbered-list':
                const numberedItems = section.content.split('\n').filter(item => item.trim());
                contentHTML += `<ol>\n`;
                numberedItems.forEach(item => {
                    contentHTML += `    <li>${escapeHtml(item.trim())}</li>\n`;
                });
                contentHTML += `</ol>\n\n`;
                break;
            case 'quote':
                contentHTML += `<blockquote>\n`;
                contentHTML += `    <p>${escapeHtml(section.content)}</p>\n`;
                if (section.author) {
                    contentHTML += `    <footer>— ${escapeHtml(section.author)}</footer>\n`;
                }
                contentHTML += `</blockquote>\n\n`;
                break;
            case 'image-caption':
                contentHTML += `<figure>\n`;
                contentHTML += `    <img src="${escapeHtml(section.content)}" alt="${escapeHtml(section.caption || 'Article image')}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
                if (section.caption) {
                    contentHTML += `    <figcaption style="text-align: center; margin-top: 0.5rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtml(section.caption)}</figcaption>\n`;
                }
                contentHTML += `</figure>\n\n`;
                break;
        }
        
        // Add files attached to this section
        if (section.files && section.files.length > 0) {
            section.files.forEach(file => {
                const description = file.description || file.name;
                
                // Display based on file type
                if (file.category === 'images' && file.data) {
                    // Display image inline
                    contentHTML += `<figure style="margin: 2rem 0;">\n`;
                    contentHTML += `    <img src="${file.data}" alt="${escapeHtml(description)}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n`;
                    if (description !== file.name) {
                        contentHTML += `    <figcaption style="text-align: center; margin-top: 0.75rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtml(description)}</figcaption>\n`;
                    }
                    contentHTML += `    <p style="text-align: center; font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtml(file.name)} (${file.size})</p>\n`;
                    contentHTML += `</figure>\n\n`;
                } else if (file.type && file.type.includes('pdf') && file.data) {
                    // Display PDF viewer
                    contentHTML += `<div style="margin: 2rem 0;">\n`;
                    contentHTML += `    <h4 style="color: var(--charcoal); margin-bottom: 0.5rem;">📄 ${escapeHtml(description)}</h4>\n`;
                    contentHTML += `    <iframe src="${file.data}" style="width: 100%; height: 600px; border: 2px solid #e0e0e0; border-radius: 8px;" title="${escapeHtml(description)}"></iframe>\n`;
                    contentHTML += `    <p style="font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtml(file.name)} (${file.size})</p>\n`;
                    contentHTML += `</div>\n\n`;
                } else if (file.category === 'videos' && file.data) {
                    // Display video player
                    contentHTML += `<div style="margin: 2rem 0;">\n`;
                    contentHTML += `    <h4 style="color: var(--charcoal); margin-bottom: 0.5rem;">🎥 ${escapeHtml(description)}</h4>\n`;
                    contentHTML += `    <video controls style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n`;
                    contentHTML += `        <source src="${file.data}" type="${file.type}">\n`;
                    contentHTML += `        Your browser does not support the video tag.\n`;
                    contentHTML += `    </video>\n`;
                    contentHTML += `    <p style="font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtml(file.name)} (${file.size})</p>\n`;
                    contentHTML += `</div>\n\n`;
                } else {
                    // Other file types - show as download link
                    const icon = file.category === 'videos' ? '🎥' : '📄';
                    contentHTML += `<div class="section-attachments-display" style="margin: 1.5rem 0;">\n`;
                    contentHTML += `    <div class="attachment-item" style="display: flex; align-items: center; padding: 1rem; background: #f8f8f8; border-radius: 8px;">\n`;
                    contentHTML += `        <span class="attachment-icon" style="font-size: 2rem; margin-right: 1rem;">${icon}</span>\n`;
                    contentHTML += `        <div class="attachment-content" style="flex: 1;">\n`;
                    contentHTML += `            <p style="margin: 0; font-weight: 600;">${escapeHtml(description)}</p>\n`;
                    contentHTML += `            <p style="font-size: 0.85rem; color: var(--muted-teak); margin: 0.25rem 0;">${escapeHtml(file.name)} (${file.size})</p>\n`;
                    if (file.data) {
                        contentHTML += `            <a href="${file.data}" download="${escapeHtml(file.name)}" style="color: var(--primary-teak); text-decoration: none; font-size: 0.9rem;">📥 Download</a>\n`;
                    }
                    contentHTML += `        </div>\n`;
                    contentHTML += `    </div>\n`;
                    contentHTML += `</div>\n\n`;
                }
            });
        }
    });
    
    return contentHTML;
}

// Make functions globally accessible
window.removeSection = removeSection;
window.updateSectionContent = updateSectionContent;
window.handleSectionFileUpload = handleSectionFileUpload;
window.updateFileDescription = updateFileDescription;
window.removeSectionFile = removeSectionFile;
window.downloadArticleFile = downloadArticleFile;
window.viewArticle = viewArticle;
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;
window.downloadCollectionPage = downloadCollectionPage;
window.viewCollectionEntry = viewCollectionEntry;
window.editCollectionEntry = editCollectionEntry;
window.deleteCollectionEntry = deleteCollectionEntry;


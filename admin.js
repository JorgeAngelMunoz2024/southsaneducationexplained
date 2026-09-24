// Admin credentials (In production, this should be on a backend server)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'southsan2026' // Change this password!
};

// ===================================================================
// GitHub Auto-Publish
// Every publish/edit/delete/upload commits the generated file(s) straight
// to this repo via the GitHub Contents API, so the live site updates
// immediately instead of requiring a manual download + upload.
// Falls back to the old "download it yourself" flow if no token is set.
// ===================================================================
const GITHUB_OWNER = 'JorgeAngelMunoz2024';
const GITHUB_REPO = 'southsaneducationexplained';
const GITHUB_BRANCH = 'main';
// Session-only: cleared when the tab/browser closes, never written to the repo.
const GITHUB_TOKEN_KEY = 'ghPublishToken';

function getGithubToken() {
    return sessionStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

function isGithubConnected() {
    return !!getGithubToken();
}

function utf8ToBase64(str) {
    return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

// encodeURI() leaves reserved chars like # ? & unescaped, which truncates the
// path (or corrupts the query string) when a filename contains them. Encode
// each path segment individually so any filename maps to the right file.
function encodeGithubPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

// `allow404` opts a caller into treating a 404 as a normal, non-error response
// (used only by the sha lookup below, where "file doesn't exist yet" is expected).
// Every other call (PUT/DELETE) must NOT set this, otherwise a real failure —
// e.g. the token lacking access to this repo, which GitHub reports as 404
// rather than 403 for fine-grained PATs — gets silently swallowed here and the
// write is treated as if it succeeded, even though nothing was actually saved.
async function githubRequest(path, options = {}) {
    const token = getGithubToken();
    if (!token) throw new Error('No GitHub token configured.');
    const { allow404 = false, ...fetchOptions } = options;
    const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
        ...fetchOptions,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            ...(fetchOptions.headers || {})
        }
    });
    if (!res.ok && !(allow404 && res.status === 404)) {
        let detail = '';
        try { detail = (await res.json()).message || ''; } catch { /* ignore */ }
        throw new Error(`GitHub API error ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return res;
}

async function githubGetFileSha(path) {
    const res = await githubRequest(`/contents/${encodeGithubPath(path)}?ref=${GITHUB_BRANCH}`, { allow404: true });
    if (res.status === 404) return null;
    return (await res.json()).sha;
}

// Create or update a file. `content` is UTF-8 text unless isBase64 is true (for binary uploads).
async function githubPutFile(path, content, message, isBase64 = false) {
    const sha = await githubGetFileSha(path);
    const body = {
        message,
        content: isBase64 ? content : utf8ToBase64(content),
        branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;
    const res = await githubRequest(`/contents/${encodeGithubPath(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function githubDeleteFile(path, message) {
    const sha = await githubGetFileSha(path);
    if (!sha) return; // already gone
    await githubRequest(`/contents/${encodeGithubPath(path)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sha, branch: GITHUB_BRANCH })
    });
}

// Reads a manifest already live on the site (public file, no token needed)
async function fetchManifest(path) {
    try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Maps each localStorage collection to the JSON file that's the durable,
// cross-browser source of truth for it once published.
const MANIFEST_PATHS = {
    articles: 'data/articles.json',
    boardMeetings: 'data/boardMeetings.json',
    qaEntries: 'data/qa.json',
    lingoEntries: 'data/lingo.json',
    sourceLibrary: 'data/library.json'
};

// Pulls down whatever's actually published so a fresh browser/device (or one
// whose localStorage never had this data) sees real content, not "no articles yet".
async function syncFromPublished() {
    await Promise.all(Object.entries(MANIFEST_PATHS).map(async ([storageKey, path]) => {
        const remote = await fetchManifest(path);
        if (Array.isArray(remote)) {
            // Defensively strip any leftover embedded file data from older, bloated manifests.
            const cleaned = storageKey === 'sourceLibrary'
                ? remote.map(stripEntryData)
                : remote.map(entry => ({ ...entry, sections: stripFileData(entry.sections) }));
            safeLocalStorageSet(storageKey, JSON.stringify(cleaned));
        }
    }));
}

async function publishManifest(storageKey, message) {
    const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
    await githubPutFile(MANIFEST_PATHS[storageKey], JSON.stringify(data, null, 2), message);
}

// The uploaded bytes already live at assets/uploads/<category>/<name> once published,
// so the raw base64 `data:` URL must never be kept in localStorage or the JSON manifests —
// doing so duplicates every file's full contents there and quickly blows the ~5-10MB
// localStorage quota, which silently aborts the save (and everything after it, including
// the actual GitHub publish). Only metadata is safe to persist long-term.
function stripFileData(sections) {
    return (sections || []).map(section => ({
        ...section,
        files: (section.files || []).map(({ data, ...rest }) => rest)
    }));
}

// Same idea for a standalone file entry (Media Library), which isn't wrapped in a section.
function stripEntryData(entry) {
    const { data, ...rest } = entry;
    return rest;
}

function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (err) {
        alert(`Could not save locally: ${err.message}. Your browser's storage may be full — try removing some older attachments.`);
        return false;
    }
}

// Commits any file attachments in these sections that haven't been uploaded yet
// (data: URL present = came from this browser session's file picker).
async function publishSectionFiles(sections) {
    for (const section of sections || []) {
        for (const file of section.files || []) {
            if (!file.data || !file.data.startsWith('data:')) continue;
            const base64 = file.data.split(',')[1];
            await githubPutFile(`assets/uploads/${file.category}/${file.name}`, base64, `Upload attachment: ${file.name}`, true);
        }
    }
}

function githubStatusMessage(err) {
    return `⚠️ Saved locally, but publishing to GitHub failed: ${err.message}. Your work is safe — try again, or use the Download button below to upload it manually.`;
}

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

// GitHub token connect/disconnect (session-only; never written to the repo)
function updateGithubStatusUI() {
    const btn = document.getElementById('githubStatusBtn');
    if (!btn) return;
    btn.textContent = isGithubConnected() ? '✅ GitHub Connected' : '🔗 Connect GitHub';
}

document.getElementById('githubStatusBtn')?.addEventListener('click', () => {
    if (isGithubConnected()) {
        if (confirm('Disconnect GitHub? New admin actions will go back to manual download/upload until you reconnect.')) {
            sessionStorage.removeItem(GITHUB_TOKEN_KEY);
            updateGithubStatusUI();
        }
        return;
    }
    const token = prompt(
        'Paste a GitHub Personal Access Token to publish changes live automatically.\n\n' +
        'Use a FINE-GRAINED token scoped only to the "southsaneducationexplained" repo with ' +
        '"Contents: Read and write" permission — nothing broader. It is kept only in this ' +
        'browser tab\'s memory (never saved to the repo) and is cleared when you close the tab.'
    );
    if (token && token.trim()) {
        sessionStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
        updateGithubStatusUI();
    }
});

// Show dashboard
async function showDashboard() {
    loginScreen.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    updateGithubStatusUI();
    await syncFromPublished();
    loadArticles();
    loadDrafts();
    renderLibraryList();
    
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
            loadDrafts();
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
            renderLibraryList();
        }

        if (tabName === 'sitePages') {
            const sitePageSelect = document.getElementById('sitePageSelect');
            if (sitePageSelect) loadSitePageFields(sitePageSelect.value);
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

// ===================================================================
// Subtitles (optional, repeatable text lines shown under a title)
// ===================================================================
function addSubtitleField(containerId, value = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'subtitle-row';
    row.innerHTML = `
        <input type="text" class="subtitle-input" value="${escapeHtml(value)}" placeholder="Subtitle text">
        <button type="button" class="remove-subtitle-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(row);
}

function getSubtitles(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.subtitle-input'))
        .map(input => input.value.trim())
        .filter(value => value);
}

function setSubtitles(containerId, subtitles) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    (subtitles || []).forEach(subtitle => addSubtitleField(containerId, subtitle));
}

function renderSubtitlesHTML(subtitles, indent = '            ') {
    return (subtitles || [])
        .map(subtitle => `${indent}<p class="article-subtitle">${escapeHtml(subtitle)}</p>\n`)
        .join('');
}

document.getElementById('addArticleSubtitleBtn')?.addEventListener('click', () => addSubtitleField('articleSubtitles'));

// ===================================================================
// Rich Text Editing (Bold/Italic/Underline/Link) for section content
// ===================================================================

// Section types whose content is edited as rich (formatted) HTML rather than plain text
function isRichTextType(type) {
    return type === 'paragraph' || type === 'heading' || type === 'quote';
}

function richTextToolbarHTML() {
    return `
                    <div class="rich-text-toolbar">
                        <button type="button" class="rt-btn" data-cmd="bold" title="Bold"><strong>B</strong></button>
                        <button type="button" class="rt-btn" data-cmd="italic" title="Italic"><em>I</em></button>
                        <button type="button" class="rt-btn" data-cmd="underline" title="Underline"><u>U</u></button>
                        <button type="button" class="rt-btn rt-link-btn" data-cmd="createLink" title="Highlight text to add a link" disabled>🔗 Add Link</button>
                        <button type="button" class="rt-btn" data-cmd="unlink" title="Remove Link">🔗✕ Remove Link</button>
                    </div>`;
}

// Only http(s)/mailto/relative links are allowed - blocks javascript:/data: schemes
function isSafeHref(href) {
    if (!href) return false;
    const trimmed = href.trim();
    if (/^(https?:|mailto:)/i.test(trimmed)) return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false; // any other scheme (javascript:, data:, etc.)
    return true; // relative path, anchor, etc.
}

const ALLOWED_RICH_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR', 'SPAN']);

// Strip any tags/attributes not in the allow-list before this HTML is stored or published
function sanitizeRichHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html || '';

    const sanitizeChildren = (node) => {
        Array.from(node.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                sanitizeChildren(child);

                if (!ALLOWED_RICH_TAGS.has(child.tagName)) {
                    while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
                    child.remove();
                    return;
                }

                const href = child.tagName === 'A' ? child.getAttribute('href') : null;
                Array.from(child.attributes).forEach(attr => child.removeAttribute(attr.name));

                if (child.tagName === 'A') {
                    if (href && isSafeHref(href)) {
                        child.setAttribute('href', href);
                        child.setAttribute('target', '_blank');
                        child.setAttribute('rel', 'noopener noreferrer');
                    } else {
                        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
                        child.remove();
                    }
                }
            } else if (child.nodeType !== Node.TEXT_NODE) {
                child.remove();
            }
        });
    };

    sanitizeChildren(template.content);
    return template.innerHTML.trim();
}

// Read a section's content field, handling both contenteditable (rich text) and plain fields
function getSectionContentValue(sectionEl, type) {
    const contentEl = sectionEl.querySelector('.section-content');
    if (!contentEl) return '';
    if (isRichTextType(type)) {
        return sanitizeRichHTML(contentEl.innerHTML);
    }
    return contentEl.value || '';
}

// Populate a section's content field, handling both contenteditable (rich text) and plain fields
function setSectionContentValue(sectionEl, type, value) {
    const contentEl = sectionEl.querySelector('.section-content');
    if (!contentEl) return;
    if (isRichTextType(type)) {
        contentEl.innerHTML = value || '';
    } else {
        contentEl.value = value || '';
    }
}

// Keep the current selection/focus inside the contenteditable when a toolbar button is pressed
document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.rt-btn')) {
        e.preventDefault();
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rt-btn');
    if (!btn || btn.disabled) return;

    const editable = btn.closest('.form-group')?.querySelector('.section-content[contenteditable]');
    if (!editable) return;

    editable.focus();
    const cmd = btn.dataset.cmd;

    if (cmd === 'createLink') {
        // prompt() steals window focus and clears the contenteditable selection,
        // so the highlighted range must be saved before it opens and restored after.
        const selection = window.getSelection();
        const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        const url = (prompt('Enter the URL for this link:', 'https://') || '').trim();
        if (!url) return;
        if (!isSafeHref(url)) {
            alert('That URL is not allowed.');
            return;
        }

        editable.focus();
        if (savedRange) {
            selection.removeAllRanges();
            selection.addRange(savedRange);
        }
        document.execCommand('createLink', false, url);
    } else {
        document.execCommand(cmd, false, null);
    }
});

// Enable "Add Link" only when text is highlighted, and reflect Bold/Italic/Underline state
document.addEventListener('selectionchange', () => {
    document.querySelectorAll('.rt-link-btn').forEach(btn => { btn.disabled = true; });
    document.querySelectorAll('.rt-btn.active').forEach(btn => { btn.classList.remove('active'); });

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const anchorNode = selection.anchorNode;
    const anchorEl = anchorNode && (anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode);
    const editable = anchorEl && anchorEl.closest && anchorEl.closest('.section-content[contenteditable]');
    if (!editable) return;

    const toolbar = editable.closest('.form-group')?.querySelector('.rich-text-toolbar');
    if (!toolbar) return;

    ['bold', 'italic', 'underline'].forEach(cmd => {
        const btn = toolbar.querySelector(`.rt-btn[data-cmd="${cmd}"]`);
        if (btn && document.queryCommandState(cmd)) {
            btn.classList.add('active');
        }
    });

    if (!selection.isCollapsed) {
        const linkBtn = toolbar.querySelector('.rt-link-btn');
        if (linkBtn) linkBtn.disabled = false;
    }
});

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
                ${richTextToolbarHTML()}
                <div class="section-content" contenteditable="true" data-placeholder="Enter your paragraph text here..."></div>
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
                    ${richTextToolbarHTML()}
                    <div class="section-content" contenteditable="true" data-placeholder="Enter heading text..."></div>
                </div>
            `;
            break;
        case 'paragraph':
            contentHTML = `
                <div class="form-group">
                    <label>Paragraph Content:</label>
                    ${richTextToolbarHTML()}
                    <div class="section-content" contenteditable="true" data-placeholder="Enter your paragraph text here..."></div>
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
                    ${richTextToolbarHTML()}
                    <div class="section-content" contenteditable="true" data-placeholder="Enter quote text..."></div>
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
        // Previously-published attachments won't have `data` (never persisted); fall back to the live path.
        const src = fileData.data || `assets/uploads/${fileData.category}/${fileData.name}`;
        previewHTML = `<img src="${src}" alt="${fileData.name}" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px;">`;
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
// Generic Collections (Board Meetings, Questions and Responses, Educational Lingo)
// ===================================================================
const COLLECTIONS = {
    boardMeetings: {
        storageKey: 'boardMeetings',
        formId: 'boardMeetingForm',
        titleId: 'boardMeetingTitle',
        subtitlesId: 'boardMeetingSubtitles',
        addSubtitleBtnId: 'addBoardMeetingSubtitleBtn',
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
        subtitlesId: 'qaSubtitles',
        addSubtitleBtnId: 'addQaSubtitleBtn',
        metaId: 'qaMeta',
        excerptId: 'qaExcerpt',
        sectionsId: 'qaSections',
        addSectionBtnId: 'addQaSectionBtn',
        listId: 'qaList',
        messageId: 'qaFormMessage',
        pageFile: 'questions-and-responses.html',
        pageTitle: 'Questions and Responses',
        submitLabel: 'Publish Response',
        intro: 'Browse common questions and responses submitted by parents, students, and community members.'
    },
    lingo: {
        storageKey: 'lingoEntries',
        formId: 'lingoForm',
        titleId: 'lingoTitle',
        subtitlesId: 'lingoSubtitles',
        addSubtitleBtnId: 'addLingoSubtitleBtn',
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

// ===================================================================
// Site Page Text (editable text blocks on static pages, marked with
// data-editable="key" in the HTML). Shared by the "Site Pages" admin
// tab and by the templates below that regenerate whole pages.
// ===================================================================
const SITE_PAGE_CONTENT_KEY = 'sitePageContent';

function getSitePageContent() {
    return JSON.parse(localStorage.getItem(SITE_PAGE_CONTENT_KEY) || '{}');
}

function getPageFieldValue(pageFile, key, fallback = '') {
    const all = getSitePageContent();
    return (all[pageFile] && all[pageFile][key] !== undefined) ? all[pageFile][key] : fallback;
}

function setPageFieldValue(pageFile, key, value) {
    const all = getSitePageContent();
    if (!all[pageFile]) all[pageFile] = {};
    all[pageFile][key] = value;
    localStorage.setItem(SITE_PAGE_CONTENT_KEY, JSON.stringify(all));
}

function getCollectionEntries(key) {
    return JSON.parse(localStorage.getItem(COLLECTIONS[key].storageKey) || '[]');
}

function saveCollectionEntries(key, entries) {
    safeLocalStorageSet(COLLECTIONS[key].storageKey, JSON.stringify(entries));
}

// Shared section-array -> published HTML (used for downloadable static pages)
function renderSectionsForPublish(sections, pathPrefix) {
    let html = '';
    (sections || []).forEach(section => {
        switch (section.type) {
            case 'heading':
                html += `                <h2>${section.content}</h2>\n`;
                break;
            case 'paragraph':
                html += `                <p>${section.content}</p>\n\n`;
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
                html += `                    <p>${section.content}</p>\n`;
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
                const path = `${pathPrefix}assets/uploads/${file.category}/${encodeGithubPath(file.name)}`;
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
                    ${link('questions-and-responses.html', 'Questions and Responses', 'qa')}
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
${renderSubtitlesHTML(entry.subtitles, '                    ')}                    ${entry.meta ? `<p class="article-meta">${escapeHtml(entry.meta)}</p>` : ''}
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
            <p data-editable="page-intro">${getPageFieldValue(cfg.pageFile, 'page-intro', escapeHtml(cfg.intro))}</p>
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
    setSubtitles(cfg.subtitlesId, entry.subtitles || []);
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

        setSectionContentValue(sectionDiv, section.type, section.content);

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

async function deleteCollectionEntry(key, id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    let entries = getCollectionEntries(key);
    entries = entries.filter(e => e.id !== id);
    saveCollectionEntries(key, entries);
    loadCollectionList(key);

    if (isGithubConnected()) {
        const cfg = COLLECTIONS[key];
        try {
            await publishManifest(cfg.storageKey, `Update ${cfg.pageTitle} manifest: delete entry`);
            await githubPutFile(cfg.pageFile, generateCollectionPageHTML(key), `Update ${cfg.pageTitle}: delete entry`);
        } catch (err) {
            alert(`Deleted locally, but the live site update failed: ${err.message}`);
        }
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
                    <li><a href="#" onclick="window.close(); return false;"${key === 'qa' ? ' class="active"' : ''}>Questions and Responses</a></li>
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
${renderSubtitlesHTML(entry.subtitles, '            ')}            ${entry.meta ? `<p class="article-meta">${escapeHtml(entry.meta)}</p>` : ''}
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

    document.getElementById(cfg.addSubtitleBtnId)?.addEventListener('click', () => {
        addSubtitleField(cfg.subtitlesId);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById(cfg.titleId).value;
        const subtitles = getSubtitles(cfg.subtitlesId);
        const meta = document.getElementById(cfg.metaId).value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const excerpt = document.getElementById(cfg.excerptId).value;

        const sectionsContainer = document.getElementById(cfg.sectionsId);
        const sections = [];
        sectionsContainer.querySelectorAll('.article-section').forEach(sectionEl => {
            const type = sectionEl.querySelector('.section-type').value;
            const content = getSectionContentValue(sectionEl, type);
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
            subtitles,
            meta,
            excerpt,
            sections: stripFileData(sections),
            dateCreated: new Date().toISOString()
        };

        entries.unshift(entry);
        saveCollectionEntries(key, entries);

        const totalFiles = sections.reduce((sum, section) => sum + (section.files?.length || 0), 0);

        if (isGithubConnected()) {
            messageEl.innerHTML = '<strong>⏳ Publishing to GitHub…</strong>';
            try {
                await publishSectionFiles(sections);
                await publishManifest(cfg.storageKey, `Update ${cfg.pageTitle} manifest: ${title}`);
                await githubPutFile(cfg.pageFile, generateCollectionPageHTML(key), `Publish ${cfg.pageTitle}: ${title}`);
                messageEl.innerHTML = `<strong>✅ Published live!</strong> <a href="${cfg.pageFile}" target="_blank">View ${escapeHtml(cfg.pageTitle)}</a>`;
            } catch (err) {
                messageEl.innerHTML = githubStatusMessage(err);
            }
        } else {
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
        }

        form.reset();
        document.getElementById(cfg.subtitlesId).innerHTML = '';
        sectionsContainer.innerHTML = '';
        addSection(cfg.sectionsId);

        loadCollectionList(key);

        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { messageEl.innerHTML = ''; }, 30000);
    });
}

Object.keys(COLLECTIONS).forEach(setupCollectionForm);

// ===================================================================
// Media Library (standalone images/files uploaded directly to the Sources page)
// ===================================================================
const LIBRARY_STORAGE_KEY = 'sourceLibrary';
// Session-only cache of raw file data for thumbnails, keyed by file id. Never persisted —
// the durable copy lives at assets/uploads/<category>/<name> once published.
const libraryPreviewCache = new Map();

function getLibraryFiles() {
    return JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) || '[]');
}

function saveLibraryFiles(files) {
    safeLocalStorageSet(LIBRARY_STORAGE_KEY, JSON.stringify(files));
}

function handleLibraryFileUpload(inputElement) {
    const files = Array.from(inputElement.files);
    if (files.length === 0) return;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const libraryFiles = getLibraryFiles();
            const fileEntry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type,
                data: event.target.result,
                category: getFileCategory(file.type, file.name),
                description: ''
            };
            libraryPreviewCache.set(fileEntry.id, fileEntry.data);
            libraryFiles.push(stripEntryData(fileEntry));
            saveLibraryFiles(libraryFiles);
            renderLibraryList();

            if (isGithubConnected()) {
                try {
                    const base64 = fileEntry.data.split(',')[1];
                    await githubPutFile(`assets/uploads/${fileEntry.category}/${fileEntry.name}`, base64, `Upload media: ${fileEntry.name}`, true);
                    await publishManifest('sourceLibrary', `Update media library manifest: ${fileEntry.name}`);
                    await githubPutFile('sources.html', generateSourcesPageHTML(), `Regenerate sources page: ${fileEntry.name}`);
                    refreshSourcesPreview();
                } catch (err) {
                    alert(`Uploaded locally, but publishing to GitHub failed: ${err.message}`);
                }
            }
        };
        reader.readAsDataURL(file);
    });

    inputElement.value = '';
}

function renderLibraryList() {
    const container = document.getElementById('sourceLibraryList');
    if (!container) return;
    const files = getLibraryFiles();

    if (files.length === 0) {
        container.innerHTML = '<p class="no-articles">No images in the library yet. Upload one above to get a reusable link for the "Add Link" text tool.</p>';
        return;
    }

    container.innerHTML = files.map(file => {
        const path = `assets/uploads/${file.category}/${file.name}`;
        const preview = file.category === 'images'
            ? `<img src="${escapeHtml(libraryPreviewCache.get(file.id) || path)}" alt="${escapeHtml(file.name)}" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px;">`
            : `<div class="file-icon-small">${file.category === 'videos' ? '🎥' : '📄'}</div>`;

        return `
        <div class="section-file-item">
            <div class="file-preview-row">
                <div class="file-preview-icon">${preview}</div>
                <div class="file-preview-info">
                    <strong>${escapeHtml(file.name)}</strong> (${file.size})
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label style="font-size: 0.85rem;">Description:</label>
                        <input type="text" class="file-description" value="${escapeHtml(file.description)}"
                               placeholder="Describe this file..."
                               onchange="updateLibraryDescription('${file.id}', this.value)">
                    </div>
                    <div class="form-group" style="margin-top: 0.5rem;">
                        <label style="font-size: 0.85rem;">Link to use in "Add Link":</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" class="library-path" value="${escapeHtml(path)}" readonly style="flex: 1;">
                            <button type="button" class="btn-small" onclick="copyLibraryPath('${file.id}')">📋 Copy</button>
                        </div>
                        <small>Paste this path into the "Add Link" dialog to reference this image from any text section.</small>
                    </div>
                </div>
                <button type="button" class="remove-file-btn-small" onclick="removeLibraryFile('${file.id}')">✕</button>
            </div>
        </div>`;
    }).join('');
}

function updateLibraryDescription(id, description) {
    const files = getLibraryFiles();
    const file = files.find(f => f.id === id);
    if (file) {
        file.description = description;
        saveLibraryFiles(files);
    }
}

async function removeLibraryFile(id) {
    if (!confirm('Remove this file from the library?')) return;
    let files = getLibraryFiles();
    const removed = files.find(f => f.id === id);
    files = files.filter(f => f.id !== id);
    saveLibraryFiles(files);
    libraryPreviewCache.delete(id);
    renderLibraryList();
    refreshSourcesPreview();

    if (isGithubConnected() && removed) {
        try {
            await githubDeleteFile(`assets/uploads/${removed.category}/${removed.name}`, `Remove media: ${removed.name}`);
            await publishManifest('sourceLibrary', `Update media library manifest: remove ${removed.name}`);
            await githubPutFile('sources.html', generateSourcesPageHTML(), `Regenerate sources page: remove ${removed.name}`);
        } catch (err) {
            alert(`Removed locally, but the live site update failed: ${err.message}`);
        }
    }
}

function copyLibraryPath(id) {
    const files = getLibraryFiles();
    const file = files.find(f => f.id === id);
    if (!file) return;
    const path = `assets/uploads/${file.category}/${file.name}`;

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(path).then(() => {
            alert(`Copied to clipboard:\n${path}`);
        }).catch(() => {
            prompt('Copy this path:', path);
        });
    } else {
        prompt('Copy this path:', path);
    }
}

// ===================================================================
// Sources Directory (auto-populated from all section file attachments + Media Library)
// ===================================================================
function collectAllSources() {
    const sourceGroups = [
        { label: 'Articles', storageKey: 'articles', linkFor: entry => `articles/${entry.slug}.html` },
        { label: 'Board Meetings', storageKey: COLLECTIONS.boardMeetings.storageKey, linkFor: () => 'board-meetings.html' },
        { label: 'Questions and Responses', storageKey: COLLECTIONS.qa.storageKey, linkFor: () => 'questions-and-responses.html' },
        { label: 'Educational Lingo', storageKey: COLLECTIONS.lingo.storageKey, linkFor: () => 'educational-lingo.html' }
    ];

    const tree = [];

    const libraryFiles = getLibraryFiles();
    if (libraryFiles.length > 0) {
        tree.push({ label: 'Media Library (Reusable Images)', entries: [{ title: null, link: null, files: libraryFiles }] });
    }

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
        return '<p>No files have been attached yet. Attachments added to Articles, Board Meetings, Questions and Responses, or Educational Lingo sections, or images uploaded to the Media Library, will automatically appear here.</p>';
    }

    let html = '<ul class="file-tree">\n';
    tree.forEach(folder => {
        html += `    <li class="file-tree-folder"><span class="file-tree-label">📁 ${escapeHtml(folder.label)}</span>\n        <ul>\n`;
        folder.entries.forEach(entry => {
            const labelHTML = entry.link
                ? `📁 <a href="${entry.link}">${escapeHtml(entry.title)}</a>`
                : `📁 ${escapeHtml(entry.title || 'Files')}`;
            html += `            <li class="file-tree-folder"><span class="file-tree-label">${labelHTML}</span>\n                <ul>\n`;
            entry.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : file.category === 'videos' ? '🎥' : '📄';
                const path = `assets/uploads/${file.category}/${encodeGithubPath(file.name)}`;
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
            <p data-editable="page-intro">${getPageFieldValue('sources.html', 'page-intro', 'Transparency matters. Below is a directory of every file — images, PDFs, documents, and videos — referenced across our articles and pages, organized by where they appear.')}</p>
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

document.getElementById('generateSourcesBtn').addEventListener('click', async () => {
    refreshSourcesPreview();
    const msgEl = document.getElementById('sourcesFormMessage');
    if (isGithubConnected()) {
        msgEl.innerHTML = '<strong>⏳ Publishing to GitHub…</strong>';
        try {
            await githubPutFile('sources.html', generateSourcesPageHTML(), 'Regenerate sources page');
            msgEl.innerHTML = '<strong>✅ Published live!</strong> <a href="sources.html" target="_blank">View sources page</a>';
        } catch (err) {
            msgEl.innerHTML = githubStatusMessage(err);
        }
    } else {
        downloadArticleFile('sources.html', generateSourcesPageHTML());
        msgEl.innerHTML = '<strong>✅ sources.html regenerated and downloaded!</strong> Upload it to your GitHub repository root, replacing the existing file.';
    }
    setTimeout(() => { msgEl.innerHTML = ''; }, 30000);
});

// Article form submission
articleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const subtitles = getSubtitles('articleSubtitles');
    const meta = document.getElementById('articleMeta').value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const excerpt = document.getElementById('articleExcerpt').value;
    const slug = generateSlug(title);
    
    // Collect all sections
    const sections = collectArticleSections();
    
    // Count total files across all sections
    const totalFiles = sections.reduce((sum, section) => sum + (section.files?.length || 0), 0);
    
    // Check if we're editing an existing article
    const editingId = articleForm.dataset.editingId;
    const editingSlug = articleForm.dataset.editingSlug;
    if (editingId) {
        // Delete the old version
        let articles = JSON.parse(localStorage.getItem('articles') || '[]');
        articles = articles.filter(a => a.id !== parseInt(editingId));
        safeLocalStorageSet('articles', JSON.stringify(articles));
        delete articleForm.dataset.editingId;
        delete articleForm.dataset.editingSlug;
    }

    // If this article started as a draft, remove the draft now that it's published
    const editingDraftId = articleForm.dataset.editingDraftId;
    if (editingDraftId) {
        deleteDraft(parseInt(editingDraftId), { skipConfirm: true, skipReload: true });
        delete articleForm.dataset.editingDraftId;
    }
    
    const article = {
        id: Date.now(),
        title,
        slug,
        subtitles,
        meta,
        excerpt,
        sections: stripFileData(sections),
        dateCreated: new Date().toISOString()
    };
    
    // Save article
    saveArticle(article);
    
    // Generate article HTML
    const articleHTML = generateArticleHTML(article);

    if (isGithubConnected()) {
        formMessage.innerHTML = '<strong>⏳ Publishing to GitHub…</strong>';
        try {
            if (editingSlug && editingSlug !== slug) {
                await githubDeleteFile(`articles/${editingSlug}.html`, `Remove renamed article: ${editingSlug}`);
            }
            await publishSectionFiles(sections);
            await githubPutFile(`articles/${slug}.html`, articleHTML, `Publish article: ${title}`);
            await publishManifest('articles', `Update articles manifest: ${title}`);
            await githubPutFile('articles.html', generateArticlesListPageHTML(), `Update articles list: ${title}`);
            formMessage.innerHTML = `<strong>✅ Published live!</strong> <a href="articles/${slug}.html" target="_blank">View article</a>`;
        } catch (err) {
            formMessage.innerHTML = githubStatusMessage(err);
        }
    } else {
        // Show success message with download link
        formMessage.innerHTML = `
            <strong>✅ Article created successfully!</strong><br><br>
            <button type="button" id="downloadArticleBtn" class="submit-btn" style="font-size: 0.9rem; padding: 0.75rem 1.5rem;">
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
        document.getElementById('downloadArticleBtn').addEventListener('click', () => {
            downloadArticleFile(`${slug}.html`, articleHTML);
        });
    }
    
    // Reset form
    articleForm.reset();
    urlPreview.textContent = '(auto-generated from title)';
    document.getElementById('articleSubtitles').innerHTML = '';
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
    safeLocalStorageSet('articles', JSON.stringify(articles));
}

// Read the current article form's sections into an array (shared by publish and save-draft)
function collectArticleSections() {
    const sections = [];
    articleSections.querySelectorAll('.article-section').forEach(sectionEl => {
        const type = sectionEl.querySelector('.section-type').value;
        const content = getSectionContentValue(sectionEl, type);
        const author = sectionEl.querySelector('.section-author')?.value || '';
        const caption = sectionEl.querySelector('.section-caption')?.value || '';
        const files = JSON.parse(sectionEl.dataset.files || '[]');
        sections.push({ type, content, author, caption, files });
    });
    return sections;
}

// ===================================================================
// Article Drafts (saved separately from published articles)
// ===================================================================
const DRAFTS_STORAGE_KEY = 'articleDrafts';

function getDrafts() {
    return JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) || '[]');
}

function saveDrafts(drafts) {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function loadDrafts() {
    const draftsListEl = document.getElementById('draftsList');
    if (!draftsListEl) return;
    const drafts = getDrafts();

    if (drafts.length === 0) {
        draftsListEl.innerHTML = '<p class="no-articles">No drafts saved.</p>';
        return;
    }

    draftsListEl.innerHTML = drafts.map(draft => `
        <div class="article-preview">
            <h2 style="color: var(--primary-teak);">${escapeHtml(draft.title || '(untitled draft)')}</h2>
            <p class="article-meta">Last saved: ${new Date(draft.dateSaved).toLocaleString()}</p>
            <p>${escapeHtml(draft.excerpt || '')}</p>
            <div class="article-actions">
                <button class="btn-small btn-edit" onclick="editDraft(${draft.id})">✏️ Continue Editing</button>
                <button class="btn-small btn-delete" onclick="deleteDraft(${draft.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function saveCurrentArticleAsDraft() {
    const title = document.getElementById('articleTitle').value;

    if (!title.trim()) {
        alert('Please enter a title before saving a draft.');
        return;
    }

    const subtitles = getSubtitles('articleSubtitles');
    const meta = document.getElementById('articleMeta').value;
    const excerpt = document.getElementById('articleExcerpt').value;
    const sections = collectArticleSections();

    let drafts = getDrafts();
    const editingDraftId = articleForm.dataset.editingDraftId;
    if (editingDraftId) {
        drafts = drafts.filter(d => d.id !== parseInt(editingDraftId));
    }

    const draft = {
        id: editingDraftId ? parseInt(editingDraftId) : Date.now(),
        title,
        slug: generateSlug(title),
        subtitles,
        meta,
        excerpt,
        sections,
        dateSaved: new Date().toISOString()
    };

    drafts.unshift(draft);
    saveDrafts(drafts);
    articleForm.dataset.editingDraftId = draft.id;

    loadDrafts();

    formMessage.innerHTML = '<strong>💾 Draft saved!</strong> Keep editing or find it later under Manage Articles → Drafts.';
    formMessage.style.display = 'block';
    formMessage.style.color = 'var(--muted-teak)';
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => { formMessage.innerHTML = ''; }, 8000);
}

document.getElementById('saveDraftBtn')?.addEventListener('click', saveCurrentArticleAsDraft);

// Without this, saving a draft then writing another article and clicking "Save
// Draft" again keeps reusing the same editingDraftId and overwrites the first
// draft instead of creating a second one — the form has no other way to know
// the admin wants to start a brand new, unrelated draft.
function resetArticleForm() {
    articleForm.reset();
    delete articleForm.dataset.editingId;
    delete articleForm.dataset.editingSlug;
    delete articleForm.dataset.editingDraftId;

    urlPreview.textContent = '(auto-generated from title)';
    document.getElementById('articleSubtitles').innerHTML = '';
    articleSections.innerHTML = '';
    sectionCounter = 0;
    addSection();

    formMessage.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('newArticleBtn')?.addEventListener('click', () => {
    if (articleForm.dataset.editingDraftId || articleForm.dataset.editingId) {
        if (!confirm('Discard the current unsaved changes and start a new article?')) return;
    }
    resetArticleForm();
});

function editDraft(id) {
    const draft = getDrafts().find(d => d.id === id);
    if (!draft) {
        alert('Draft not found!');
        return;
    }

    // Switch to create tab
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[0].classList.add('active');
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById('createTab').classList.add('active');

    articleTitle.value = draft.title || '';
    urlPreview.textContent = draft.title ? `${generateSlug(draft.title)}.html` : '(auto-generated from title)';
    setSubtitles('articleSubtitles', draft.subtitles || []);
    document.getElementById('articleMeta').value = draft.meta || '';
    document.getElementById('articleExcerpt').value = draft.excerpt || '';

    articleSections.innerHTML = '';
    sectionCounter = 0;

    (draft.sections || []).forEach(section => {
        const sectionId = addSection();
        const sectionDiv = document.getElementById(sectionId);

        const typeSelect = sectionDiv.querySelector('.section-type');
        typeSelect.value = section.type;
        updateSectionContent(sectionId, section.type);
        setSectionContentValue(sectionDiv, section.type, section.content);

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

    if (articleSections.children.length === 0) addSection();

    delete articleForm.dataset.editingId;
    articleForm.dataset.editingDraftId = id;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    formMessage.textContent = 'Editing draft. Click "💾 Save Draft" to keep it as a draft, or "Publish Article" to publish it.';
    formMessage.style.display = 'block';
    formMessage.style.color = 'var(--muted-teak)';
}

function deleteDraft(id, options = {}) {
    if (!options.skipConfirm && !confirm('Delete this draft?')) return;
    let drafts = getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    saveDrafts(drafts);
    if (!options.skipReload) loadDrafts();
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
                    <li><a href="../questions-and-responses.html">Questions and Responses</a></li>
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
${renderSubtitlesHTML(article.subtitles, '            ')}            <p class="article-meta">Published: ${escapeHtml(article.meta)}</p>
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

// Regenerates the full articles.html listing page (tiles for every published
// article) so it can be committed straight to the repo on every publish/edit/delete.
function generateArticlesListPageHTML() {
    const articlesArr = JSON.parse(localStorage.getItem('articles') || '[]');
    const tilesHTML = articlesArr.map(article => `
                <div class="article-preview">
                    <h2><a href="articles/${article.slug}.html" style="color: var(--deep-navy); text-decoration: none;">${escapeHtml(article.title)}</a></h2>
${renderSubtitlesHTML(article.subtitles, '                    ')}                    <p class="article-meta">Published: ${escapeHtml(article.meta || '')}</p>
                    <p>${escapeHtml(article.excerpt)}</p>
                    <a href="articles/${article.slug}.html" class="read-more">Read More →</a>
                </div>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Articles - South San Education Explained</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained</div>${collectionNavHTML('articles', '')}
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>Articles</h1>
            <p data-editable="articles-intro">${getPageFieldValue('articles.html', 'articles-intro', 'Explore our collection of articles covering various educational topics in South San.')}</p>
            <div id="articlesContainer">
${tilesHTML}
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
    setSubtitles('articleSubtitles', article.subtitles || []);
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
        setSectionContentValue(sectionDiv, section.type, section.content);
        
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
    articleForm.dataset.editingSlug = article.slug;
    delete articleForm.dataset.editingDraftId;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    formMessage.textContent = 'Editing article. Click "Publish Article" to save changes.';
    formMessage.style.display = 'block';
    formMessage.style.color = 'var(--muted-teak)';
}

async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;
    let articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.id === id);
    articles = articles.filter(a => a.id !== id);
    localStorage.setItem('articles', JSON.stringify(articles));
    loadArticles();

    if (isGithubConnected() && article) {
        try {
            await githubDeleteFile(`articles/${article.slug}.html`, `Delete article: ${article.title}`);
            await publishManifest('articles', `Update articles manifest: delete ${article.title}`);
            await githubPutFile('articles.html', generateArticlesListPageHTML(), `Update articles list: delete ${article.title}`);
        } catch (err) {
            alert(`Deleted locally, but the live site update failed: ${err.message}`);
        }
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
                    <li><a href="#" onclick="window.close(); return false;">Questions and Responses</a></li>
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
${renderSubtitlesHTML(article.subtitles, '            ')}            <p class="article-meta">Published: ${escapeHtml(article.meta)}</p>
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
                contentHTML += `<h2>${section.content}</h2>\n`;
                break;
            case 'paragraph':
                contentHTML += `<p>${section.content}</p>\n\n`;
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
                contentHTML += `    <p>${section.content}</p>\n`;
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

// ===================================================================
// Site Pages (edit every piece of hardcoded text on a static page: Home,
// About, Contact, Articles, Board Meetings, Questions and Responses,
// Educational Lingo, and Sources). Any tag in EDITABLE_LEAF_SELECTOR found
// inside <main>, plus the footer copyright line, becomes an editable field -
// elements don't need a data-editable attribute to be picked up, though any
// existing data-editable="key" is still honored so older saved overrides keep working.
// ===================================================================
const EDITABLE_LEAF_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, figcaption, dt, dd, td, th, label, button';
const EDITABLE_TAG_LABELS = {
    H1: 'Heading', H2: 'Heading', H3: 'Heading', H4: 'Heading', H5: 'Heading', H6: 'Heading',
    P: 'Paragraph', LI: 'List Item', FIGCAPTION: 'Caption', DT: 'Term', DD: 'Definition',
    TD: 'Table Cell', TH: 'Table Header', LABEL: 'Form Label', BUTTON: 'Button'
};

function prettifyFieldKey(key) {
    return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Finds every editable text element on a page (fetched doc or the live document)
function collectPageEditableElements(root) {
    const scope = root.querySelector('main') || root.body || root;
    const els = Array.from(scope.querySelectorAll(EDITABLE_LEAF_SELECTOR)).filter(el => !el.closest('nav'));
    const footerP = root.querySelector('footer p');
    if (footerP) els.push(footerP);
    return els;
}

// Reuses an existing data-editable attribute if present, otherwise a stable position-based key
function editableElementKey(el, index) {
    return el.getAttribute('data-editable') || `auto-${index}`;
}

function describeEditableElement(el) {
    const tagLabel = EDITABLE_TAG_LABELS[el.tagName] || el.tagName;
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
    return preview ? `${tagLabel}: ${preview}` : tagLabel;
}

async function fetchPageDocument(pageFile) {
    const response = await fetch(pageFile, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${pageFile} (HTTP ${response.status})`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
}

async function loadSitePageFields(pageFile) {
    const container = document.getElementById('sitePageFieldsContainer');
    if (!container) return;
    container.innerHTML = '<p class="no-articles">Loading page text…</p>';

    let doc;
    try {
        doc = await fetchPageDocument(pageFile);
    } catch (err) {
        container.innerHTML = `<p class="error-message">Could not load ${escapeHtml(pageFile)}. Make sure the admin page is being served from the same folder as the site files (not opened directly as a local file).</p>`;
        return;
    }

    const editableEls = collectPageEditableElements(doc);
    if (editableEls.length === 0) {
        container.innerHTML = '<p class="no-articles">No editable text found on this page.</p>';
        return;
    }

    const overrides = getSitePageContent()[pageFile] || {};

    container.innerHTML = editableEls.map((el, index) => {
        const key = editableElementKey(el, index);
        const label = describeEditableElement(el);
        const currentHTML = overrides[key] !== undefined ? overrides[key] : el.innerHTML.trim();
        return `
            <div class="form-group" data-page-field data-field-key="${escapeHtml(key)}">
                <label>${escapeHtml(label)}</label>
                ${richTextToolbarHTML()}
                <div class="section-content" contenteditable="true">${currentHTML}</div>
            </div>
        `;
    }).join('');
}

function saveSitePageFields(pageFile) {
    const container = document.getElementById('sitePageFieldsContainer');
    if (!container) return;
    container.querySelectorAll('[data-page-field]').forEach(fieldEl => {
        const key = fieldEl.dataset.fieldKey;
        const contentEl = fieldEl.querySelector('.section-content');
        setPageFieldValue(pageFile, key, sanitizeRichHTML(contentEl.innerHTML));
    });
}

async function buildSitePageHTML(pageFile) {
    const doc = await fetchPageDocument(pageFile);
    const overrides = getSitePageContent()[pageFile] || {};
    collectPageEditableElements(doc).forEach((el, index) => {
        const key = editableElementKey(el, index);
        if (overrides[key] !== undefined) el.innerHTML = overrides[key];
    });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function downloadSitePage(pageFile) {
    saveSitePageFields(pageFile);

    let html;
    try {
        html = await buildSitePageHTML(pageFile);
    } catch (err) {
        alert(`Could not load ${pageFile} to generate the updated file.`);
        return;
    }

    downloadArticleFile(pageFile, html);
}

const sitePageSelectEl = document.getElementById('sitePageSelect');
const sitePageMessageEl = document.getElementById('sitePageMessage');

sitePageSelectEl?.addEventListener('change', () => loadSitePageFields(sitePageSelectEl.value));

document.getElementById('saveSitePageBtn')?.addEventListener('click', async () => {
    saveSitePageFields(sitePageSelectEl.value);
    if (!sitePageMessageEl) return;

    if (isGithubConnected()) {
        sitePageMessageEl.textContent = '⏳ Publishing to GitHub…';
        sitePageMessageEl.style.display = 'block';
        try {
            const html = await buildSitePageHTML(sitePageSelectEl.value);
            await githubPutFile(sitePageSelectEl.value, html, `Update page text: ${sitePageSelectEl.value}`);
            sitePageMessageEl.textContent = `✅ Published live! View ${sitePageSelectEl.value}.`;
            sitePageMessageEl.style.color = 'var(--muted-teak)';
        } catch (err) {
            sitePageMessageEl.textContent = githubStatusMessage(err).replace(/<[^>]+>/g, '');
            sitePageMessageEl.style.color = 'var(--charcoal)';
        }
    } else {
        sitePageMessageEl.textContent = '✅ Saved! Click "Download Updated Page" to get the file to upload to GitHub.';
        sitePageMessageEl.style.display = 'block';
        sitePageMessageEl.style.color = 'var(--muted-teak)';
    }
    setTimeout(() => { sitePageMessageEl.textContent = ''; }, 15000);
});

document.getElementById('downloadSitePageBtn')?.addEventListener('click', async () => {
    await downloadSitePage(sitePageSelectEl.value);
    if (sitePageMessageEl) {
        sitePageMessageEl.textContent = `✅ Downloaded! Upload it to your GitHub repository, replacing the existing ${sitePageSelectEl.value}.`;
        sitePageMessageEl.style.display = 'block';
        sitePageMessageEl.style.color = 'var(--muted-teak)';
        setTimeout(() => { sitePageMessageEl.textContent = ''; }, 15000);
    }
});

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
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.downloadCollectionPage = downloadCollectionPage;
window.viewCollectionEntry = viewCollectionEntry;
window.editCollectionEntry = editCollectionEntry;
window.deleteCollectionEntry = deleteCollectionEntry;
window.handleLibraryFileUpload = handleLibraryFileUpload;
window.updateLibraryDescription = updateLibraryDescription;
window.removeLibraryFile = removeLibraryFile;
window.copyLibraryPath = copyLibraryPath;

// Must run last: showDashboard() (via loadDrafts/getDrafts) depends on consts
// declared further down in this file (e.g. DRAFTS_STORAGE_KEY), so calling it
// before the whole script has run throws a ReferenceError and breaks all tabs.
if (localStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
}


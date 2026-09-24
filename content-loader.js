// Loads Board Meetings, Questions and Responses, Educational Lingo, and Sources
// content dynamically from localStorage for local preview before publishing.

// Applies admin-edited page text (saved from the "Site Pages" admin tab) to
// every editable text element on this page, so local previews reflect edits
// before the page is re-downloaded and published. Must stay in sync with the
// element selection logic in admin.js (collectPageEditableElements/editableElementKey).
const EDITABLE_LEAF_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, figcaption, dt, dd, td, th, label, button';

function collectPageEditableElements(root) {
    const scope = root.querySelector('main') || root.body || root;
    const els = Array.from(scope.querySelectorAll(EDITABLE_LEAF_SELECTOR)).filter(el => !el.closest('nav'));
    const footerP = root.querySelector('footer p');
    if (footerP) els.push(footerP);
    return els;
}

function editableElementKey(el, index) {
    return el.getAttribute('data-editable') || `auto-${index}`;
}

function applySitePageOverrides() {
    const pageFile = location.pathname.split('/').pop() || 'index.html';
    const allPageContent = JSON.parse(localStorage.getItem('sitePageContent') || '{}');
    const overrides = allPageContent[pageFile];
    if (!overrides) return;

    collectPageEditableElements(document).forEach((el, index) => {
        const key = editableElementKey(el, index);
        if (overrides[key] !== undefined) {
            el.innerHTML = overrides[key];
        }
    });
}
applySitePageOverrides();

// Rewrites any same-origin link that points straight at an uploaded asset file
// (image/PDF/video) so it opens through the scaled preview.html viewer instead
// of the browser's native full-size viewer. This catches links built by our own
// templates as well as ones pasted in manually via the "Add Link" text tool.
const PREVIEWABLE_ASSET_EXTENSIONS = /\.(svg|png|jpe?g|gif|webp|bmp|ico|avif|pdf|mp4|webm|ogg|mov|avi|mkv)$/i;
function initAssetPreviewLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
        let url;
        try { url = new URL(a.href, location.href); } catch { return; }
        if (url.hostname !== location.hostname) return;
        if (!/^\/assets\/uploads\//.test(url.pathname)) return;
        if (!PREVIEWABLE_ASSET_EXTENSIONS.test(url.pathname)) return;

        const name = decodeURIComponent(url.pathname.split('/').pop());
        const rootRelativeSrc = url.pathname.replace(/^\//, '');
        a.setAttribute('href', `/preview.html?src=${encodeURIComponent(rootRelativeSrc)}&name=${encodeURIComponent(name)}`);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
    });
}
initAssetPreviewLinks();

function escapeHtmlLoader(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Images, videos, and PDFs render natively in a browser tab; anything else has
// no in-browser viewer, so the browser will still just download those.
// Extension checks are a fallback for files that were mis-categorized as
// "documents" (some browsers report no MIME type for .svg uploads) — must
// stay in sync with the copy of this function in admin.js.
const IMAGE_EXTENSIONS = /\.(svg|png|jpe?g|gif|webp|bmp|ico|avif)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;
function isPreviewableFile(file) {
    return file.category === 'images' || file.category === 'videos'
        || /\.pdf$/i.test(file.name) || IMAGE_EXTENSIONS.test(file.name) || VIDEO_EXTENSIONS.test(file.name);
}

// Render an array of sections (with inline embedded file data) into HTML
function renderSectionsForLoader(sections) {
    if (!sections || sections.length === 0) {
        return '<p>No content available.</p>';
    }

    let html = '';

    sections.forEach(section => {
        switch (section.type) {
            case 'heading':
                html += `<h2>${section.content}</h2>\n`;
                break;
            case 'paragraph':
                html += `<p>${section.content}</p>\n\n`;
                break;
            case 'list': {
                const items = section.content.split('\n').filter(item => item.trim());
                html += `<ul>\n`;
                items.forEach(item => { html += `    <li>${escapeHtmlLoader(item.trim())}</li>\n`; });
                html += `</ul>\n\n`;
                break;
            }
            case 'numbered-list': {
                const items = section.content.split('\n').filter(item => item.trim());
                html += `<ol>\n`;
                items.forEach(item => { html += `    <li>${escapeHtmlLoader(item.trim())}</li>\n`; });
                html += `</ol>\n\n`;
                break;
            }
            case 'quote':
                html += `<blockquote>\n    <p>${section.content}</p>\n`;
                if (section.author) {
                    html += `    <footer>— ${escapeHtmlLoader(section.author)}</footer>\n`;
                }
                html += `</blockquote>\n\n`;
                break;
            case 'image-caption':
                html += `<figure>\n    <img src="${escapeHtmlLoader(section.content)}" alt="${escapeHtmlLoader(section.caption || 'Image')}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
                if (section.caption) {
                    html += `    <figcaption style="text-align: center; margin-top: 0.5rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtmlLoader(section.caption)}</figcaption>\n`;
                }
                html += `</figure>\n\n`;
                break;
        }

        (section.files || []).forEach(file => {
            const description = file.description || file.name;

            if (file.category === 'images' && file.data) {
                html += `<figure style="margin: 2rem 0;">\n    <img src="${file.data}" alt="${escapeHtmlLoader(description)}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n`;
                if (description !== file.name) {
                    html += `    <figcaption style="text-align: center; margin-top: 0.75rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtmlLoader(description)}</figcaption>\n`;
                }
                html += `    <p style="text-align: center; font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtmlLoader(file.name)} (${file.size})</p>\n</figure>\n\n`;
            } else if (file.type && file.type.includes('pdf') && file.data) {
                html += `<div style="margin: 2rem 0;">\n    <h4 style="color: var(--charcoal); margin-bottom: 0.5rem;">📄 ${escapeHtmlLoader(description)}</h4>\n    <iframe src="${file.data}" style="width: 100%; height: 600px; border: 2px solid #e0e0e0; border-radius: 8px;" title="${escapeHtmlLoader(description)}"></iframe>\n    <p style="font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtmlLoader(file.name)} (${file.size})</p>\n</div>\n\n`;
            } else if (file.category === 'videos' && file.data) {
                html += `<div style="margin: 2rem 0;">\n    <h4 style="color: var(--charcoal); margin-bottom: 0.5rem;">🎥 ${escapeHtmlLoader(description)}</h4>\n    <video controls style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">\n        <source src="${file.data}" type="${file.type}">\n        Your browser does not support the video tag.\n    </video>\n    <p style="font-size: 0.85rem; color: var(--muted-teak); margin-top: 0.5rem;">${escapeHtmlLoader(file.name)} (${file.size})</p>\n</div>\n\n`;
            } else {
                const icon = file.category === 'videos' ? '🎥' : '📄';
                html += `<div class="section-attachments-display" style="margin: 1.5rem 0;">\n    <div class="attachment-item" style="display: flex; align-items: center; padding: 1rem; background: #f8f8f8; border-radius: 8px;">\n        <span class="attachment-icon" style="font-size: 2rem; margin-right: 1rem;">${icon}</span>\n        <div class="attachment-content" style="flex: 1;">\n            <p style="margin: 0; font-weight: 600;">${escapeHtmlLoader(description)}</p>\n            <p style="font-size: 0.85rem; color: var(--muted-teak); margin: 0.25rem 0;">${escapeHtmlLoader(file.name)} (${file.size})</p>\n`;
                if (file.data) {
                    const previewable = isPreviewableFile(file);
                    // Data URLs can be too large for a query string, so stash it in
                    // sessionStorage and hand preview.html a lookup key instead.
                    let href = file.data;
                    let linkAttrs = `download="${escapeHtmlLoader(file.name)}"`;
                    if (previewable) {
                        const key = `previewFile_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        sessionStorage.setItem(key, file.data);
                        href = `preview.html?key=${encodeURIComponent(key)}&name=${encodeURIComponent(file.name)}`;
                        linkAttrs = 'target="_blank" rel="noopener noreferrer"';
                    }
                    const linkLabel = previewable ? '👁️ View' : '📥 Download';
                    html += `            <a href="${href}" ${linkAttrs} style="color: var(--primary-teak); text-decoration: none; font-size: 0.9rem;">${linkLabel}</a>\n`;
                }
                html += `        </div>\n    </div>\n</div>\n\n`;
            }
        });
    });

    return html;
}

function loadCollectionContainer(storageKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (entries.length === 0) return; // Keep the static placeholder content

    container.innerHTML = entries.map(entry => `
        <div class="article-preview">
            <h2>${escapeHtmlLoader(entry.title)}</h2>
            ${(entry.subtitles || []).map(subtitle => `<p class="article-subtitle">${escapeHtmlLoader(subtitle)}</p>`).join('\n            ')}
            ${entry.meta ? `<p class="article-meta">${escapeHtmlLoader(entry.meta)}</p>` : ''}
            <p>${escapeHtmlLoader(entry.excerpt)}</p>
            <div class="article-content">
                ${renderSectionsForLoader(entry.sections)}
            </div>
        </div>
    `).join('');
}

// Build and render the Sources directory tree from all collections' attachments
function loadSourcesTree() {
    const container = document.getElementById('sourcesTree');
    if (!container) return;

    const sourceGroups = [
        { label: 'Articles', storageKey: 'articles', linkFor: entry => `articles/${entry.slug}.html` },
        { label: 'Board Meetings', storageKey: 'boardMeetings', linkFor: () => 'board-meetings.html' },
        { label: 'Questions and Responses', storageKey: 'qaEntries', linkFor: () => 'questions-and-responses.html' },
        { label: 'Educational Lingo', storageKey: 'lingoEntries', linkFor: () => 'educational-lingo.html' }
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

    if (tree.length === 0) return; // Keep the static placeholder content

    let html = '<ul class="file-tree">\n';
    tree.forEach(folder => {
        html += `    <li class="file-tree-folder"><span class="file-tree-label">📁 ${escapeHtmlLoader(folder.label)}</span>\n        <ul>\n`;
        folder.entries.forEach(entry => {
            html += `            <li class="file-tree-folder"><span class="file-tree-label">📁 <a href="${entry.link}">${escapeHtmlLoader(entry.title)}</a></span>\n                <ul>\n`;
            entry.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : file.category === 'videos' ? '🎥' : '📄';
                const relPath = `assets/uploads/${file.category}/${file.name}`;
                const desc = file.description ? ` — ${escapeHtmlLoader(file.description)}` : '';
                const previewable = isPreviewableFile(file);
                const href = previewable ? `preview.html?src=${encodeURIComponent(relPath)}&name=${encodeURIComponent(file.name)}` : relPath;
                const linkAttrs = previewable ? 'target="_blank" rel="noopener noreferrer"' : 'download';
                html += `                    <li class="file-tree-file"><a href="${href}" ${linkAttrs}>${icon} ${escapeHtmlLoader(file.name)}</a>${desc} <span class="file-size">(${file.size})</span></li>\n`;
            });
            html += `                </ul>\n            </li>\n`;
        });
        html += `        </ul>\n    </li>\n`;
    });
    html += '</ul>';

    container.innerHTML = html;
}

if (document.getElementById('boardMeetingsContainer')) loadCollectionContainer('boardMeetings', 'boardMeetingsContainer');
if (document.getElementById('qaContainer')) loadCollectionContainer('qaEntries', 'qaContainer');
if (document.getElementById('lingoContainer')) loadCollectionContainer('lingoEntries', 'lingoContainer');
if (document.getElementById('sourcesTree')) loadSourcesTree();

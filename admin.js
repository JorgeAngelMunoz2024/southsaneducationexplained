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

function addSection() {
    sectionCounter++;
    const sectionId = `section-${sectionCounter}`;
    
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
    
    articleSections.appendChild(sectionDiv);
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

// Article form submission
articleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const meta = document.getElementById('articleMeta').value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const excerpt = document.getElementById('articleExcerpt').value;
    const slug = generateSlug(title);
    
    // Collect all sections
    const sections = [];
    const sectionElements = document.querySelectorAll('.article-section');
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
    // Generate sections HTML
    let sectionsHTML = '';
    article.sections.forEach(section => {
        switch(section.type) {
            case 'heading':
                sectionsHTML += `                <h2>${escapeHtml(section.content)}</h2>\n`;
                break;
            case 'paragraph':
                sectionsHTML += `                <p>${escapeHtml(section.content)}</p>\n\n`;
                break;
            case 'list':
                const listItems = section.content.split('\n').filter(item => item.trim());
                sectionsHTML += `                <ul>\n`;
                listItems.forEach(item => {
                    sectionsHTML += `                    <li>${escapeHtml(item.trim())}</li>\n`;
                });
                sectionsHTML += `                </ul>\n\n`;
                break;
            case 'numbered-list':
                const numberedItems = section.content.split('\n').filter(item => item.trim());
                sectionsHTML += `                <ol>\n`;
                numberedItems.forEach(item => {
                    sectionsHTML += `                    <li>${escapeHtml(item.trim())}</li>\n`;
                });
                sectionsHTML += `                </ol>\n\n`;
                break;
            case 'quote':
                sectionsHTML += `                <blockquote>\n`;
                sectionsHTML += `                    <p>${escapeHtml(section.content)}</p>\n`;
                if (section.author) {
                    sectionsHTML += `                    <footer>— ${escapeHtml(section.author)}</footer>\n`;
                }
                sectionsHTML += `                </blockquote>\n\n`;
                break;
            case 'image-caption':
                sectionsHTML += `                <figure>\n`;
                sectionsHTML += `                    <img src="../${escapeHtml(section.content)}" alt="${escapeHtml(section.caption || 'Article image')}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
                if (section.caption) {
                    sectionsHTML += `                    <figcaption style="text-align: center; margin-top: 0.5rem; color: var(--muted-teak); font-size: 0.9rem;">${escapeHtml(section.caption)}</figcaption>\n`;
                }
                sectionsHTML += `                </figure>\n\n`;
                break;
        }
        
        // Add files attached to this section
        if (section.files && section.files.length > 0) {
            sectionsHTML += `                <div class="section-attachments-display">\n`;
            section.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : 
                            file.category === 'videos' ? '🎥' : '📄';
                const path = `../assets/uploads/${file.category}/${file.name}`;
                const description = file.description || file.name;
                
                sectionsHTML += `                    <div class="attachment-item">\n`;
                sectionsHTML += `                        <span class="attachment-icon">${icon}</span>\n`;
                sectionsHTML += `                        <div class="attachment-content">\n`;
                sectionsHTML += `                            <p>${escapeHtml(description)}</p>\n`;
                sectionsHTML += `                            <a href="${path}" download class="attachment-download">📥 Download ${escapeHtml(file.name)} (${file.size})</a>\n`;
                sectionsHTML += `                        </div>\n`;
                sectionsHTML += `                    </div>\n`;
            });
            sectionsHTML += `                </div>\n\n`;
        }
    });
    
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
                <div class="site-title">South San Education</div>
                <ul class="nav-menu">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="../articles.html" class="active">Articles</a></li>
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
        updateSectionContent({ target: typeSelect });
        
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
                <div class="site-title">South San Education - Preview</div>
                <ul class="nav-menu">
                    <li><a href="#" onclick="window.close(); return false;">Home</a></li>
                    <li><a href="#" onclick="window.close(); return false;" class="active">Articles</a></li>
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


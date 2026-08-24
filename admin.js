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
const fileUpload = document.getElementById('fileUpload');
const uploadedFiles = document.getElementById('uploadedFiles');

// Global state
let sectionCounter = 0;
let uploadedFilesData = [];

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

// File Upload Handler
fileUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const fileData = {
                name: file.name,
                size: formatFileSize(file.size),
                type: file.type,
                data: event.target.result,
                category: getFileCategory(file.type, file.name)
            };
            
            uploadedFilesData.push(fileData);
            displayUploadedFile(fileData, uploadedFilesData.length - 1);
        };
        
        reader.readAsDataURL(file);
    });
    
    // Reset file input
    fileUpload.value = '';
});

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

function displayUploadedFile(fileData, index) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-preview';
    fileDiv.dataset.index = index;
    
    let previewHTML = '';
    if (fileData.type.startsWith('image/')) {
        previewHTML = `<img src="${fileData.data}" alt="${fileData.name}">`;
    } else if (fileData.type.startsWith('video/')) {
        previewHTML = `<div class="file-icon">🎥</div>`;
    } else if (fileData.type.includes('pdf')) {
        previewHTML = `<div class="file-icon">📄</div>`;
    } else {
        previewHTML = `<div class="file-icon">📎</div>`;
    }
    
    fileDiv.innerHTML = `
        ${previewHTML}
        <div class="file-info">
            <span class="file-name">${fileData.name}</span>
            <span class="file-size">${fileData.size}</span>
        </div>
        <button type="button" class="remove-file-btn" onclick="removeFile(${index})">Remove</button>
    `;
    
    uploadedFiles.appendChild(fileDiv);
}

function removeFile(index) {
    uploadedFilesData.splice(index, 1);
    refreshUploadedFilesDisplay();
}

function refreshUploadedFilesDisplay() {
    uploadedFiles.innerHTML = '';
    uploadedFilesData.forEach((fileData, index) => {
        displayUploadedFile(fileData, index);
    });
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
        
        sections.push({
            type,
            content,
            author,
            caption
        });
    });
    
    const article = {
        id: Date.now(),
        title,
        slug,
        meta,
        excerpt,
        sections,
        files: uploadedFilesData,
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
            ${uploadedFilesData.length > 0 ? `3. Upload the attached files to the appropriate folders in <code>/assets/uploads/</code><br>` : ''}
            ${uploadedFilesData.length > 0 ? `4. Update articles.html to include this article` : '3. Update articles.html to include this article'}
        </small>
    `;
    
    // Reset form
    articleForm.reset();
    urlPreview.textContent = '(auto-generated from title)';
    articleSections.innerHTML = '';
    uploadedFilesData = [];
    uploadedFiles.innerHTML = '';
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
        <div class="article-item">
            <h3>${escapeHtml(article.title)}</h3>
            <span class="article-url">URL: /articles/${article.slug}.html</span>
            <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
            <small style="color: var(--muted-teak);">
                ${article.sections?.length || 0} sections, ${article.files?.length || 0} files
            </small>
            <div class="article-actions">
                <button class="btn-small btn-view" onclick="downloadArticleFile('${article.slug}.html', \`${generateArticleHTML(article).replace(/`/g, '\\`')}\`)">Download HTML</button>
                <button class="btn-small btn-delete" onclick="deleteArticle(${article.id})">Delete</button>
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
    });
    
    // Generate downloads section if files exist
    let downloadsHTML = '';
    if (article.files && article.files.length > 0) {
        downloadsHTML = `
            <div class="download-section">
                <h4>📥 Downloads & Resources</h4>
                <div class="download-list">`;
        
        article.files.forEach(file => {
            const icon = file.category === 'images' ? '🖼️' : 
                        file.category === 'videos' ? '🎥' : '📄';
            const path = `../assets/uploads/${file.category}/${file.name}`;
            
            downloadsHTML += `
                    <div class="download-item">
                        <div class="download-item-info">
                            <span class="download-icon">${icon}</span>
                            <div>
                                <strong>${escapeHtml(file.name)}</strong><br>
                                <small style="color: var(--muted-teak);">${file.size}</small>
                            </div>
                        </div>
                        <a href="${path}" download class="download-btn">Download</a>
                    </div>`;
        });
        
        downloadsHTML += `
                </div>
            </div>`;
    }
    
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
${downloadsHTML}
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
function deleteArticle(id) {
    if (confirm('Are you sure you want to delete this article?')) {
        let articles = JSON.parse(localStorage.getItem('articles') || '[]');
        articles = articles.filter(a => a.id !== id);
        localStorage.setItem('articles', JSON.stringify(articles));
        loadArticles();
    }
}

// Make functions globally accessible
window.removeSection = removeSection;
window.updateSectionContent = updateSectionContent;
window.removeFile = removeFile;
window.downloadArticleFile = downloadArticleFile;
window.deleteArticle = deleteArticle;


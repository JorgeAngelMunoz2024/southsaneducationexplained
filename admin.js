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
    urlPreview.textContent = `southsanexplained/articles/${slug}`;
});

function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove spaces
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

// Article form submission
articleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const meta = document.getElementById('articleMeta').value || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const excerpt = document.getElementById('articleExcerpt').value;
    const content = document.getElementById('articleContent').value;
    const slug = generateSlug(title);
    
    const article = {
        id: Date.now(),
        title,
        slug,
        meta,
        excerpt,
        content,
        dateCreated: new Date().toISOString()
    };
    
    // Save article
    saveArticle(article);
    
    // Create article HTML file content
    const articleHTML = generateArticleHTML(article);
    
    // Show success message with download link
    formMessage.innerHTML = `
        <strong>Article created successfully!</strong><br>
        <a href="#" onclick="downloadArticle('${slug}', ${JSON.stringify(articleHTML).replace(/'/g, "\\'")}); return false;" style="color: var(--deep-navy); text-decoration: underline;">
            Download ${slug}.html
        </a><br>
        <small>Upload this file to your GitHub repository in the root directory.</small>
    `;
    
    // Reset form
    articleForm.reset();
    urlPreview.textContent = 'southsanexplained/articles/';
    
    // Clear message after 10 seconds
    setTimeout(() => {
        formMessage.innerHTML = '';
    }, 10000);
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
            <h3>${article.title}</h3>
            <span class="article-url">URL: /articles/${article.slug}</span>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-actions">
                <button class="btn-small btn-view" onclick="viewArticle('${article.slug}')">View</button>
                <button class="btn-small btn-view" onclick="downloadArticle('${article.slug}', ${JSON.stringify(generateArticleHTML(article)).replace(/'/g, "\\'")}); return false;">Download HTML</button>
                <button class="btn-small btn-delete" onclick="deleteArticle(${article.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Generate article HTML
function generateArticleHTML(article) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - South San Education Explained</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education</div>
                <ul class="nav-menu">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="articles.html" class="active">Articles</a></li>
                    <li><a href="about.html">About</a></li>
                    <li><a href="contact.html">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <main>
        <article class="content-card">
            <h1>${article.title}</h1>
            <p class="article-meta">Published: ${article.meta}</p>
            <div class="article-content">
                ${article.content}
            </div>
            <div style="margin-top: 3rem; text-align: center;">
                <a href="articles.html" style="color: var(--muted-teak); font-weight: 600;">← Back to Articles</a>
            </div>
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>
</body>
</html>`;
}

// Download article HTML file
function downloadArticle(slug, htmlContent) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// View article (opens in new tab)
function viewArticle(slug) {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.slug === slug);
    
    if (article) {
        const htmlContent = generateArticleHTML(article);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
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

// Update articles.html to load from localStorage
function updateArticlesPage() {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    // This would need to be done manually or via a separate script
    // For now, we'll generate the articles list HTML
    return articles;
}

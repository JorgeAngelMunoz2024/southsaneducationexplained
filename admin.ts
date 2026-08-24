// TypeScript version of admin.js
// Compile with: tsc admin.ts --target ES6

interface AdminCredentials {
    username: string;
    password: string;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    meta: string;
    excerpt: string;
    content: string;
    dateCreated: string;
}

// Admin credentials (In production, this should be on a backend server)
const ADMIN_CREDENTIALS: AdminCredentials = {
    username: 'admin',
    password: 'southsan2026' // Change this password!
};

// DOM Elements
const loginScreen = document.getElementById('loginScreen') as HTMLDivElement;
const adminDashboard = document.getElementById('adminDashboard') as HTMLDivElement;
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const loginError = document.getElementById('loginError') as HTMLParagraphElement;
const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
const articleForm = document.getElementById('articleForm') as HTMLFormElement;
const articleTitle = document.getElementById('articleTitle') as HTMLInputElement;
const urlPreview = document.getElementById('urlPreview') as HTMLSpanElement;
const formMessage = document.getElementById('formMessage') as HTMLParagraphElement;
const articlesList = document.getElementById('articlesList') as HTMLDivElement;
const tabBtns = document.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
const tabContents = document.querySelectorAll('.tab-content') as NodeListOf<HTMLDivElement>;

// Check if admin is already logged in
if (localStorage.getItem('adminLoggedIn') === 'true') {
    showDashboard();
}

// Login form handler
loginForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    const username = (document.getElementById('username') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

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
function showDashboard(): void {
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
        const tabElement = document.getElementById(`${tabName}Tab`);
        if (tabElement) tabElement.classList.add('active');
        
        if (tabName === 'manage') {
            loadArticles();
        }
    });
});

// Generate URL slug from title
articleTitle.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const slug = generateSlug(target.value);
    if (slug) {
        urlPreview.textContent = `${slug}.html`;
    } else {
        urlPreview.textContent = '(auto-generated from title)';
    }
});

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Article form submission
articleForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    
    const title = (document.getElementById('articleTitle') as HTMLInputElement).value;
    const meta = (document.getElementById('articleMeta') as HTMLInputElement).value || 
                 new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const excerpt = (document.getElementById('articleExcerpt') as HTMLTextAreaElement).value;
    const content = (document.getElementById('articleContent') as HTMLTextAreaElement).value;
    const slug = generateSlug(title);
    
    const article: Article = {
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
        <a href="#" onclick="downloadArticle('${slug}', '${articleHTML.replace(/'/g, "\\'")}'); return false;" 
           style="color: var(--deep-navy); text-decoration: underline;">
            Download ${slug}.html
        </a><br>
        <small>Upload this file to your GitHub repository in the root directory.</small>
    `;
    
    // Reset form
    articleForm.reset();
    urlPreview.textContent = '(auto-generated from title)';
    
    // Clear message after 10 seconds
    setTimeout(() => {
        formMessage.innerHTML = '';
    }, 10000);
});

// Save article to localStorage
function saveArticle(article: Article): void {
    let articles: Article[] = JSON.parse(localStorage.getItem('articles') || '[]');
    articles.unshift(article); // Add to beginning
    localStorage.setItem('articles', JSON.stringify(articles));
}

// Load articles for management
function loadArticles(): void {
    const articles: Article[] = JSON.parse(localStorage.getItem('articles') || '[]');
    
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
                <button class="btn-small btn-view" onclick="downloadArticleById('${article.slug}')">Download HTML</button>
                <button class="btn-small btn-delete" onclick="deleteArticle(${article.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Generate article HTML
function generateArticleHTML(article: Article): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${article.title} - South San Education Explained</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Ensure proper layout even if CSS fails to load */
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
function downloadArticle(slug: string, htmlContent: string): void {
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

// Helper function for download button
function downloadArticleById(slug: string): void {
    const articles: Article[] = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.slug === slug);
    if (article) {
        const htmlContent = generateArticleHTML(article);
        downloadArticle(slug, htmlContent);
    }
}

// View article (opens in new tab with inlined CSS for preview)
async function viewArticle(slug: string): Promise<void> {
    const articles: Article[] = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.slug === slug);
    
    if (article) {
        // Fetch CSS content to inline it for blob preview
        let cssContent = '';
        try {
            const response = await fetch('styles.css', { cache: 'no-cache' });
            if (response.ok) {
                cssContent = await response.text();
            } else {
                console.error('Failed to fetch CSS:', response.status);
            }
        } catch (e) {
            console.error('Failed to load CSS:', e);
        }
        
        // Generate preview HTML with inlined CSS
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>${article.title} - South San Education Explained</title>
    ${cssContent ? `<style>${cssContent}</style>` : '<link rel="stylesheet" href="styles.css">'}
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="site-title">South San Education Explained - Preview</div>
                <ul class="nav-menu">
                    <li><a href="#" onclick="window.close(); return false;">Close Preview</a></li>
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
        </article>
    </main>

    <footer>
        <p>&copy; 2026 South San Education Explained. All rights reserved.</p>
    </footer>
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        
        // Clean up blob URL after window opens
        if (win) {
            win.addEventListener('load', () => {
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            });
        }
    }
}

// Delete article
function deleteArticle(id: number): void {
    if (confirm('Are you sure you want to delete this article?')) {
        let articles: Article[] = JSON.parse(localStorage.getItem('articles') || '[]');
        articles = articles.filter(a => a.id !== id);
        localStorage.setItem('articles', JSON.stringify(articles));
        loadArticles();
    }
}

// Make functions globally accessible
(window as any).downloadArticle = downloadArticle;
(window as any).downloadArticleById = downloadArticleById;
(window as any).viewArticle = viewArticle;
(window as any).deleteArticle = deleteArticle;

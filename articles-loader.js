// Load articles dynamically from localStorage
function loadArticlesFromStorage() {
    const articlesContainer = document.getElementById('articlesContainer');
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    
    if (articles.length === 0) {
        articlesContainer.innerHTML = '<p style="text-align: center;">No articles available yet. Check back soon!</p>';
        return;
    }
    
    articlesContainer.innerHTML = articles.map(article => `
        <div class="article-preview">
            <h2>${article.title}</h2>
            <p class="article-meta">Published: ${article.meta}</p>
            <p>${article.excerpt}</p>
            <a href="#" onclick="viewArticleFromStorage('${article.slug}'); return false;" class="read-more">Read More →</a>
        </div>
    `).join('');
}

// View article directly from localStorage (for testing/preview)
function viewArticleFromStorage(slug) {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.slug === slug);
    
    if (article) {
        // Generate full article HTML
        const articleHTML = `<!DOCTYPE html>
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
        
        // Open in new tab
        const blob = new Blob([articleHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
    } else {
        alert('Article not found');
    }
}

// Load articles when page loads
if (document.getElementById('articlesContainer')) {
    loadArticlesFromStorage();
}

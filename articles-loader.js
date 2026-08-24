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
async function viewArticleFromStorage(slug) {
    const articles = JSON.parse(localStorage.getItem('articles') || '[]');
    const article = articles.find(a => a.slug === slug);
    
    if (article) {
        // Generate content from sections
        const articleContent = generateArticleContent(article);
        
        // Fetch CSS content to inline it for blob preview
        let cssContent = '';
        let cssLoaded = false;
        
        try {
            const response = await fetch('styles.css', { cache: 'no-cache' });
            if (response.ok) {
                cssContent = await response.text();
                cssLoaded = true;
                console.log('CSS loaded successfully, length:', cssContent.length);
            } else {
                console.error('Failed to fetch CSS, status:', response.status);
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
    <title>${article.title} - South San Education Explained</title>
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
            <h1>${article.title}</h1>
            <p class="article-meta">Published: ${article.meta}</p>
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
    ${!cssLoaded ? '<script>console.error("CSS failed to load inline. Check browser console.");</script>' : ''}
</body>
</html>`;
        
        // Open in new tab
        const blob = new Blob([articleHTML], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        
        // Clean up blob URL after window opens
        if (win) {
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        }
    } else {
        alert('Article not found');
    }
}

// Generate article content from sections
function generateArticleContent(article) {
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
            contentHTML += `<div class="section-attachments-display">\n`;
            section.files.forEach(file => {
                const icon = file.category === 'images' ? '🖼️' : 
                            file.category === 'videos' ? '🎥' : '📄';
                const description = file.description || file.name;
                
                contentHTML += `    <div class="attachment-item">\n`;
                contentHTML += `        <span class="attachment-icon">${icon}</span>\n`;
                contentHTML += `        <div class="attachment-content">\n`;
                contentHTML += `            <p>${escapeHtml(description)}</p>\n`;
                contentHTML += `            <p style="font-size: 0.85rem; color: var(--muted-teak);">${escapeHtml(file.name)} (${file.size})</p>\n`;
                contentHTML += `        </div>\n`;
                contentHTML += `    </div>\n`;
            });
            contentHTML += `</div>\n\n`;
        }
    });
    
    return contentHTML;
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load articles when page loads
if (document.getElementById('articlesContainer')) {
    loadArticlesFromStorage();
}

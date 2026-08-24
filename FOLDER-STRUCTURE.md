# South San Education - Folder Structure & Article Management Guide

## 📁 Folder Structure

```
southsaneducationexplained/
├── articles/                      # All published article HTML files go here
│   ├── .gitkeep
│   └── [article-name].html       # Individual article files
│
├── assets/
│   └── uploads/                  # All uploaded media and files
│       ├── images/               # Article images (jpg, png, gif, etc.)
│       │   └── .gitkeep
│       ├── documents/            # PDFs, Word docs, text files, ZIPs
│       │   └── .gitkeep
│       └── videos/               # Video files (mp4, webm, etc.)
│           └── .gitkeep
│
├── admin.html                    # Admin panel (login required)
├── admin.js                      # Admin functionality
├── admin-styles.css              # Admin panel styles
├── articles.html                 # Public articles listing page
├── index.html                    # Homepage
├── about.html                    # About page
├── contact.html                  # Contact page
├── styles.css                    # Main site styles
└── README.md                     # Main documentation
```

## 🎨 Creating Articles

### Step 1: Access Admin Panel
1. Open `admin.html` in your browser
2. Login with your credentials
3. Click the **"Create Article"** tab

### Step 2: Fill in Article Details
The article creation form includes:

#### Basic Information
- **Article Title**: The main title (URL is auto-generated)
- **Published Date**: Optional (defaults to current month/year)
- **Excerpt/Summary**: Short description for the articles listing page

#### Content Sections
You can add multiple sections with different types:

1. **Paragraph**: Regular text content
2. **Heading**: Section headings (H2)
3. **Bulleted List**: Unordered list items (one per line)
4. **Numbered List**: Ordered list items (one per line)
5. **Quote**: Blockquote with optional author attribution
6. **Image with Caption**: Image with optional caption text

**Tips:**
- Click **"+ Add Section"** to add more content blocks
- Each section can be a different type
- Sections appear in the order you create them
- Use the **Remove** button to delete unwanted sections

#### File Attachments
Upload any supporting files:
- **Images**: jpg, png, gif, webp
- **Videos**: mp4, webm
- **Documents**: pdf, doc, docx, txt, zip

Files will automatically be:
- Previewed in the admin panel
- Organized by type in the downloads section
- Made available for readers to download

### Step 3: Publish Article
1. Click **"Publish Article"**
2. Download the generated HTML file
3. Note any attached files that need to be uploaded

## 📤 Deploying Articles

### For GitHub Pages:

#### 1. Upload Article HTML
- Place the downloaded `.html` file in the `/articles/` folder
- Commit and push to your repository

#### 2. Upload Attached Files
If your article has attachments:
- Upload images to `/assets/uploads/images/`
- Upload documents to `/assets/uploads/documents/`
- Upload videos to `/assets/uploads/videos/`

#### 3. Update Articles Listing
Edit `articles.html` and add your new article to the list:

```html
<div class="article-card">
    <h2><a href="articles/your-article-name.html">Your Article Title</a></h2>
    <p class="article-meta">Published: August 2026</p>
    <p>Your article excerpt/summary here...</p>
    <a href="articles/your-article-name.html" class="read-more">Read More →</a>
</div>
```

#### 4. Commit and Push
```bash
git add .
git commit -m "Add new article: Your Article Title"
git push origin main
```

## 🔄 Managing Articles

### View All Articles
1. Go to admin panel
2. Click **"Manage Articles"** tab
3. See all created articles with:
   - Title and URL
   - Number of sections and files
   - Download and Delete buttons

### Edit Articles
Articles are stored in localStorage. To edit:
1. Delete the old version from "Manage Articles"
2. Create a new version with your changes
3. Re-upload to GitHub

### Delete Articles
1. In "Manage Articles", click **Delete**
2. Confirm deletion
3. Remember to also remove the file from GitHub

## 📝 Article Structure

Generated articles include:
- Responsive header with site navigation
- Article title and publication date
- All content sections in order
- Downloads & Resources section (if files attached)
- Back to Articles link
- Site footer

## 🎯 Best Practices

### Content
- Keep excerpts under 200 characters
- Use headings to break up long content
- Add images for visual interest
- Include captions for context

### File Management
- Use descriptive filenames (e.g., `budget-breakdown-2026.pdf`)
- Optimize images before uploading (max 1-2MB recommended)
- Compress videos when possible
- Keep file names URL-friendly (no spaces, use hyphens)

### Organization
- Create articles regularly to keep content fresh
- Use consistent naming conventions
- Group related articles by topic
- Update the articles listing page promptly

## 🔐 Security Notes

**Important**: 
- The admin panel uses localStorage (client-side only)
- In production, implement proper backend authentication
- Change the default admin password in `admin.js`
- Never commit sensitive credentials to GitHub

## 💡 Tips for Content Creators

1. **Plan your content**: Outline sections before starting
2. **Use mixed media**: Combine text, images, and lists
3. **Provide resources**: Upload supporting documents
4. **Stay organized**: Use the section types appropriately
5. **Preview locally**: Test the HTML file before uploading

## 🆘 Troubleshooting

### Article not displaying properly
- Check that CSS files are in the correct location
- Verify file paths in the HTML (especially for images)
- Ensure all uploaded files are in the correct folders

### Files not downloadable
- Confirm files are uploaded to `/assets/uploads/[category]/`
- Check file permissions on your server
- Verify file paths match the generated HTML

### Broken article links
- Ensure article HTML is in `/articles/` folder
- Check that the filename matches the link
- Verify the article is added to `articles.html`

## 📧 Need Help?

For questions or issues, contact through the website's contact page.

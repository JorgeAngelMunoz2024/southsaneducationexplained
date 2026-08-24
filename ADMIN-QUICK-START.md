# Admin Panel Quick Start Guide

## 🚀 Quick Start

### 1. Login
- Open `admin.html` in your browser
- Username: `admin`
- Password: `southsan2026`
- **⚠️ IMPORTANT**: Change the password in `admin.js` line 3!

### 2. Create Your First Article

#### Basic Info
1. Enter a catchy **Title** (URL auto-generates)
2. Add **Published Date** (or leave blank for current month)
3. Write a short **Excerpt** for the article listing

#### Build Content with Sections
Your article is built from sections. Each section can be a different type:

- **Paragraph** 📝: Regular text
- **Heading** 🔤: Section headers (H2)
- **Bulleted List** • : Unordered items
- **Numbered List** 1,2,3: Ordered items  
- **Quote** 💬: Blockquote with author
- **Image with Caption** 🖼️: Picture + optional caption

**Pro Tips:**
- Click **"+ Add Section"** for more content blocks
- Drag content types to reorder (coming soon!)
- Remove unwanted sections with the Remove button

#### Add Files (Optional)
Upload supporting materials:
- **Images**: Use in "Image with Caption" sections
- **Documents**: PDFs, Word docs, spreadsheets
- **Videos**: MP4, WebM files

Files appear in a "Downloads & Resources" section automatically!

### 3. Publish
1. Click **"Publish Article"**
2. Download the HTML file
3. See the upload instructions

### 4. Deploy to GitHub

```bash
# 1. Copy the HTML to articles folder
# 2. Upload any files to assets/uploads/[category]/
# 3. Update articles.html with your new article
# 4. Commit and push
git add .
git commit -m "Add new article"
git push
```

## 📋 Article Section Types Guide

### Paragraph
```
Type: Regular text content
Use for: Main body text, explanations
Example: "School budgets consist of three main components..."
```

### Heading
```
Type: Section header (H2)
Use for: Breaking content into major sections
Example: "Understanding the Budget Process"
```

### Bulleted List
```
Type: Unordered list (one item per line)
Use for: Non-sequential items, features, benefits
Example:
Teacher salaries
Classroom supplies
Technology upgrades
```

### Numbered List
```
Type: Ordered list (one item per line)
Use for: Steps, rankings, sequential items
Example:
Register online
Submit documents
Attend orientation
```

### Quote
```
Type: Blockquote with optional author
Use for: Testimonials, important statements, emphasis
Example: 
Quote: "Education is the most powerful weapon..."
Author: Nelson Mandela
```

### Image with Caption
```
Type: Image with optional caption
Use for: Visual content, charts, photos
Example:
Image: assets/uploads/images/budget-chart.png
Caption: 2026 Budget Breakdown
```

## 🎯 Content Best Practices

### Structure
✅ Start with an introduction paragraph
✅ Use headings to break up long content
✅ Mix text with lists and images
✅ End with a call-to-action or summary

### Writing
✅ Keep paragraphs under 4-5 lines
✅ Use simple, clear language
✅ Break complex topics into sections
✅ Include examples when possible

### Files
✅ Name files descriptively: `school-calendar-2026.pdf`
✅ Optimize images (compress before upload)
✅ Use common formats (JPG, PNG, PDF)
✅ Keep file sizes reasonable (<5MB)

## 📂 File Organization

When you upload files, save them with meaningful names:

**Good:**
- `district-budget-2026.pdf`
- `enrollment-form.pdf`
- `school-map.jpg`

**Bad:**
- `document.pdf`
- `IMG_1234.jpg`
- `Untitled.docx`

## 🔄 Managing Articles

### View All Articles
- Click **"Manage Articles"** tab
- See all created articles
- Download or delete as needed

### Edit an Article
1. Delete the old version
2. Create new with your changes
3. Re-upload to GitHub

### Delete an Article
1. Click **Delete** in Manage Articles
2. Remove from GitHub repository
3. Update `articles.html` listing

## 🆘 Troubleshooting

### Images not showing
- Check file path: `assets/uploads/images/filename.jpg`
- Ensure file uploaded to GitHub
- Try relative path: `../assets/uploads/images/filename.jpg`

### Download button not working
- Verify files uploaded to correct folder
- Check file names match exactly
- Test file paths in browser

### Article looks broken
- Check CSS file paths
- Verify all HTML tags closed properly
- Test locally before uploading

## 💡 Pro Tips

1. **Preview before publishing**: Download and open the HTML locally
2. **Use consistent formatting**: Maintain similar structure across articles
3. **Plan your content**: Outline sections before you start
4. **Optimize for mobile**: Keep images reasonable size
5. **Test downloads**: Make sure files are accessible

## 🔐 Security Reminder

- Change the default password immediately!
- Use a strong, unique password
- Don't share admin credentials
- Consider backend authentication for production

## 📧 Questions?

Refer to `FOLDER-STRUCTURE.md` for detailed documentation.

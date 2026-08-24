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
- Each section can have its own file attachments
- Remove unwanted sections with the Remove button

#### Add Files to Sections (New!)
**Files are now attached directly to sections!**

For each section, you can:
1. Click **"Add File"** within that section
2. Upload images, PDFs, videos, or documents
3. Add a **description/caption** for each file
4. Files appear right after the section content with download links

**Example:**
- Section 1: "Budget Overview" paragraph
  - Attach: budget-2026.pdf with description "Full budget breakdown"
- Section 2: "Key Statistics" list
  - Attach: stats-chart.png with description "Visual representation of data"

Files will display inline with the content where readers need them!

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
Files: Attach related documents, guides
Example: "School budgets consist of..." + budget.pdf
```

### Heading
```
Type: Section header (H2)
Use for: Breaking content into major sections
Files: Rarely needs attachments
Example: "Understanding the Budget Process"
```

### Bulleted List
```
Type: Unordered list (one item per line)
Use for: Non-sequential items, features, benefits
Files: Attach checklists, forms related to the list
Example:
Teacher salaries
Classroom supplies
Technology upgrades
+ Attach: expense-breakdown.xlsx
```

### Numbered List
```
Type: Ordered list (one item per line)
Use for: Steps, rankings, sequential items
Files: Attach step-by-step guides, forms
Example:
1. Register online
2. Submit documents
3. Attend orientation
+ Attach: registration-guide.pdf
```

### Quote
```
Type: Blockquote with optional author
Use for: Testimonials, important statements
Files: Attach source documents, references
Example: 
Quote: "Education is the most powerful weapon..."
Author: Nelson Mandela
```

### Image with Caption
```
Type: Image with optional caption
Use for: Visual content, charts, photos
Files: Attach high-res versions, related docs
Example:
Image: assets/uploads/images/budget-chart.png
Caption: 2026 Budget Breakdown
+ Attach: chart-data.xlsx (for data behind the chart)
```

## 🎯 Content Best Practices

### Structure
✅ Start with an introduction paragraph
✅ Use headings to break up long content
✅ Attach files right where they're relevant
✅ Add clear descriptions for all files
✅ End with a call-to-action or summary

### Writing File Descriptions
✅ Be specific: "2026 District Budget Report" not "Document"
✅ Explain the value: "Step-by-step enrollment instructions with examples"
✅ Mention file type if not obvious: "Interactive PDF form"
✅ Keep it under 15 words

**Good Descriptions:**
- "Comprehensive parent handbook with involvement strategies and resources"
- "Monthly volunteer opportunities calendar - sign up for activities"
- "Teacher contact directory with email addresses and office hours"

**Bad Descriptions:**
- "File"
- "Document"
- "Click here"

### Files
✅ Attach files to relevant sections, not all at the end
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
- See all created articles with file counts
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

### Files not displaying in article
- Check file descriptions are filled in
- Verify files uploaded to correct GitHub folder
- Ensure file paths match: `../assets/uploads/[category]/filename`

### Download links broken
- Verify files uploaded to `/assets/uploads/[category]/`
- Check file names match exactly (case-sensitive)
- Test file paths in browser

### Article looks broken
- Check CSS file paths
- Verify all HTML tags closed properly
- Test locally before uploading

## 💡 Pro Tips

1. **Contextual files**: Place files in sections where readers need them
2. **Clear descriptions**: Explain what the file contains and why it's useful
3. **Preview before publishing**: Download and test the HTML locally
4. **Consistent formatting**: Maintain similar structure across articles
5. **Mobile-friendly**: Keep file sizes reasonable for mobile users

## 🔐 Security Reminder

- Change the default password immediately!
- Use a strong, unique password
- Don't share admin credentials
- Consider backend authentication for production

## 📧 Questions?

Refer to `FOLDER-STRUCTURE.md` for detailed documentation.


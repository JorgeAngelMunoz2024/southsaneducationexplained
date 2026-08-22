# South San Education Explained - Admin Setup

## Admin Access

The admin panel is accessible at: **`/admin.html`**

**Default Credentials:**
- Username: `admin`
- Password: `southsan2026`

⚠️ **IMPORTANT:** Change the password in `admin.js` (line 2-5) before deploying!

## How It Works

### 1. Admin Login
- Navigate to `/admin.html` (not linked anywhere on the site)
- Login with admin credentials
- Session is saved in browser localStorage

### 2. Creating Articles

When you create an article:
1. Enter the article title (e.g., "Check This Out")
2. The URL slug is automatically generated (e.g., "check-this-out")
3. Add publish date, excerpt, and content
4. Click "Publish Article"
5. **Download the generated HTML file** (e.g., `check-this-out.html`)
6. Upload the HTML file to your GitHub repository root directory

**Note:** When you preview an article, it opens with a temporary blob URL (e.g., `blob:http://...`). This is normal! The actual URL on your deployed site will be clean and use the article slug.

### 3. Article URLs

Articles will be accessible at:
- `southsanexplained/[slug].html`
- Example: `southsanexplained/check-this-out.html` for "Check This Out"
- Example: `southsanexplained/enrollment-guide.html` for "Enrollment Guide"

**URL Slug Rules:**
- Spaces become hyphens (-)
- All lowercase
- Special characters removed
- "Hello World!" → "hello-world"
- "2024 Guide" → "2024-guide"

### 4. Managing Articles

- View all created articles in the "Manage Articles" tab
- Preview articles before publishing
- Download HTML files for articles
- Delete articles from the system

## Technical Details

### Files Created:
- **admin.html** - Admin dashboard interface
- **admin-styles.css** - Admin-specific styles
- **admin.js** - Admin functionality (JavaScript)
- **admin.ts** - Admin functionality (TypeScript source)
- **articles-loader.js** - Dynamic article loading
- **tsconfig.json** - TypeScript configuration

### How Articles Are Stored:

Articles are stored in browser localStorage and also generated as static HTML files that you upload to GitHub Pages.

### Compiling TypeScript (Optional)

If you want to modify the TypeScript file:

```bash
# Install TypeScript (if not already installed)
npm install -g typescript

# Compile TypeScript to JavaScript
tsc admin.ts
```

This will update `admin.js` with your changes.

## Workflow for Publishing Articles

1. **Login to Admin Panel** (`/admin.html`)
2. **Create Article** with title, content, and excerpt
3. **Download Generated HTML** (e.g., `checkthisout.html`)
4. **Commit to GitHub:**
   ```bash
   git add checkthisout.html
   git commit -m "Add new article: Check This Out"
   git push
   ```
5. **Article is now live** at `yoursite.github.io/checkthisout.html`

## Security Notes

⚠️ This is a **client-side admin system** suitable for GitHub Pages (static hosting):

- Authentication happens in the browser
- No server-side validation
- Change the default password immediately
- Don't share the admin.html URL publicly
- Consider using GitHub's private repository if needed

For production with real user data, you'd want:
- Server-side authentication
- Database storage
- API endpoints
- Better security measures

## Customization

### Change Admin Password:
Edit `admin.js` or `admin.ts` line 2-5:
```javascript
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'YOUR_NEW_PASSWORD'
};
```

### Customize Article Template:
Modify the `generateArticleHTML()` function in `admin.js` or `admin.ts`

## Troubleshooting

**Issue:** Can't login to admin
- Clear browser localStorage
- Check credentials in `admin.js`

**Issue:** Articles not showing on articles page
- Make sure you uploaded the generated HTML file
- Check that the slug matches the filename

**Issue:** TypeScript errors
- Run `tsc admin.ts` to compile
- Check `tsconfig.json` settings

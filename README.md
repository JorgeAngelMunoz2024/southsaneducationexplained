# South San Education Explained

A responsive, article-style website providing educational information for the South San community.

## 🚀 Deploying to GitHub Pages

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `southsaneducationexplained`
3. Make it public (required for free GitHub Pages)
4. Don't initialize with README, .gitignore, or license

### Step 2: Push Your Code to GitHub
Open a terminal in this project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - South San Education website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on **Settings**
3. Scroll down to **Pages** in the left sidebar
4. Under "Source", select **main** branch
5. Click **Save**
6. Your site will be published at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

### Step 4: Wait a Few Minutes
GitHub Pages typically takes 1-3 minutes to build and deploy your site. Once ready, visit your URL!

## 📱 Features

- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Centered Article Layout**: Easy-to-read content with centered text
- **Color Palette**: Professional design with South San Education brand colors
- **Four Main Pages**: Home, Articles, About, and Contact
- **Sticky Navigation**: Header stays visible while scrolling

## 🎨 Color Palette

- Deep Navy (#1F3A5F) - Headers, navigation, buttons
- Muted Teak (#4F7C7A) - Accents, links
- Warm Light Gray (#F4F3F0) - Page backgrounds
- White (#FFFFFF) - Content cards
- Charcoal (#2B2B2B) - Body text
- Soft Gold (#C9A85C) - Important callouts

## 📝 Updating Content

Simply edit the HTML files and push changes to GitHub:

```bash
git add .
git commit -m "Update content"
git push
```

Your site will automatically update within a few minutes!

## 📄 Files Structure

```
├── index.html          # Home page
├── articles.html       # Articles listing (dynamic)
├── about.html          # About page
├── contact.html        # Contact page
├── styles.css          # All styling
├── admin.html          # Admin panel (hidden)
├── admin.js            # Admin functionality
├── admin.ts            # Admin TypeScript source
├── admin-styles.css    # Admin styling
├── articles-loader.js  # Dynamic article loading
├── tsconfig.json       # TypeScript config
├── color-pallete.txt   # Color reference
├── ADMIN-README.md     # Admin documentation
└── README.md           # This file
```

## 🔐 Admin Panel

Site administrators can access the admin panel to create and manage articles. See [ADMIN-README.md](ADMIN-README.md) for details.

**Admin URL:** `/admin.html` (not publicly linked)

## 🛠️ Customization Tips

- Update the site title in each HTML file's `<title>` tag
- Modify the `.site-title` in the navigation
- Add more articles by copying the `.article-preview` sections
- Adjust colors in `styles.css` by modifying the `:root` variables

---

Built for mobile-first, accessible, and easy-to-maintain education information sharing.

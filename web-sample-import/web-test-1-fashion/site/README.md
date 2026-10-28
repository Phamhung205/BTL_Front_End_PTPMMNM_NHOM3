# Women's Clothing Store - Demo E-commerce Website

A demo e-commerce website for women's clothing with multi-language support, built using HTML, CSS, JavaScript, and Tailwind CSS.

## Features

### Main Functionalities
- **Login Page**: Simplified login for demo purposes - clicking "Login" grants immediate access
- **Registration Page**: Full registration form with validation
- **Dashboard**: Admin dashboard with statistics and recent orders
- **Product Display**: Product grid with filtering and search capabilities

### Multi-Language Support
- Currently supports 3 languages:
  - English (en)
  - Vietnamese (vi)
  - Japanese (ja)
- Language structure is ready for API integration
- The `languages.js` file contains translation keys that can be easily replaced with API calls in the future

## Project Structure

```
web test 1/
├── index.html          # Main HTML file with all pages
├── style.css           # Custom CSS styles
├── script.js           # JavaScript for navigation and state management
├── languages.js        # Multi-language configuration (ready for API)
├── tailwind.config.js  # Tailwind CSS configuration
├── input.css           # Tailwind input file
├── package.json        # Project dependencies
└── README.md           # This file
```

## How to Use

### Option 1: Using CDN (Recommended for Quick Demo)
Simply open `index.html` in a web browser. The website uses Tailwind CSS via CDN, so no installation is required.

### Option 2: Local Development
If you want to use the local Tailwind CSS build:

1. Install Node.js and npm
2. Run `npm install` to install dependencies
3. Run `npm run build` to build Tailwind CSS
4. Open `index.html` in a browser

## Navigation

### Pages
- **Login Page**: Default landing page
- **Register Page**: Accessible from login page
- **Dashboard**: Accessible after login
- **Products Page**: Accessible from dashboard

### Language Switching
- Use the language selector in the top-right corner to switch between languages
- Language preference is saved in localStorage

## Demo Features

### Simplified Login
For demo purposes, the login is simplified:
- Enter any email and password (or leave empty)
- Click "Login" button
- You will be immediately granted access to the dashboard

### Product Display
- 8 demo products with placeholder images
- Category filter buttons (All, Dresses, Tops, Pants, Accessories)
- Search functionality placeholder
- Add to cart buttons (alert for demo)

## API Integration (Future)

The multi-language system is designed to be easily integrated with a translation API:

1. In `languages.js`, replace the `translations` object with API calls
2. Example structure:
```javascript
async function fetchTranslations(lang) {
    const response = await fetch(`YOUR_API_ENDPOINT/${lang}`);
    return await response.json();
}
```

3. Update the `t()` function to use API data instead of local translations

## Styling

- **Tailwind CSS**: Used for responsive and modern UI design
- **Custom CSS**: Additional styles in `style.css` for page transitions and animations
- **Color Scheme**: Pink and purple theme suitable for women's clothing

## State Management

- User login state is saved in localStorage
- Language preference is saved in localStorage
- Session persists across page refreshes

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile, tablet, and desktop

## Notes

- This is a demo website intended for presentation purposes
- Product images are placeholders using SVG icons
- All functionality is client-side only
- No backend integration is included in this demo

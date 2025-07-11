# @doyosi/laravel

[![npm version](https://badge.fury.io/js/%40doyosi%2Flaravel.svg)](https://badge.fury.io/js/%40doyosi%2Flaravel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Complete collection of modern JavaScript plugins designed specifically for Laravel applications. Provides AJAX functionality, form handling, UI components, and interactive features.

## 🚀 Features (11 Plugins)

### AJAX & Data Loading
- **AjaxDivBox**: Dynamic grid/list rendering with card-like divs and pagination
- **AjaxTable**: AJAX-powered data tables with filtering and pagination

### Form & Input Components  
- **FormSubmit**: Modern async form handling with validation support
- **EditContent**: Seamless edit/add form workflows for CRUD operations
- **CodeInput**: Verification code input with auto-focus navigation
- **ImageInput**: Image upload with live preview functionality
- **SelectDropdown**: Enhanced single-select dropdown with search
- **SelectMultipleDropdown**: Multi-select dropdown with advanced features

### UI & Interaction
- **DeleteContent**: Confirmation modals for delete operations
- **Toast**: Beautiful toast notifications with animations
- **LanguageSwitch**: Multi-language interface switching

## 📦 Installation

```bash
npm install @doyosi/laravel
```

## 🔧 Quick Start

```javascript
import { 
    AjaxDivBox, 
    FormSubmit, 
    DeleteContent, 
    Toast,
    SelectDropdown 
} from '@doyosi/laravel';

// Dynamic content loading
const grid = new AjaxDivBox({
    url: '/api/items',
    container: '#content-list'
});

// Form handling
new FormSubmit({
    formSelector: '#myForm',
    method: 'axios'
});

// Delete confirmations
new DeleteContent('.delete-btn');

// Toast notifications
new Toast({ 
    message: 'Welcome!', 
    type: 'success' 
});

// Enhanced dropdowns
new SelectDropdown('#mySelect_dropdown');
```

## 📚 Plugin Documentation

### AjaxDivBox
```javascript
const divBox = new AjaxDivBox({
    url: '/api/posts',
    container: '#posts-container',
    templateId: 'post-template',
    pagination: '#pagination',
    filterSelector: '#filters'
});

divBox.on('rendered', ({ data, meta }) => {
    console.log('Loaded posts:', data);
});
```

### AjaxTable
```javascript
const table = new AjaxTable({
    url: '/api/users',
    container: '#users-table',
    templateId: 'user-row-template'
});
```

### FormSubmit
```javascript
const form = new FormSubmit({
    formSelector: '#contactForm',
    method: 'axios',
    successMessage: 'Message sent!',
    useToast: true
});

form.on('success', response => {
    console.log('Form submitted:', response);
});
```

### DeleteContent
```javascript
new DeleteContent('.delete-btn', {
    confirmText: 'Delete this item?',
    onDelete: (success, data, button) => {
        if (success) {
            button.closest('tr').remove();
        }
    }
});
```

### EditContent
```javascript
new EditContent({
    form: '#itemForm',
    editButtonSelector: '.btn-edit',
    cancelButtonSelector: '.btn-cancel'
});
```

### CodeInput
```javascript
new CodeInput('.code-input', 'verification_code');
```

### ImageInput
```javascript
new ImageInput('#profileImage');
// Auto-updates preview, ESC to cancel
```

### SelectDropdown
```javascript
new SelectDropdown('#categorySelect_dropdown', {
    onSelect: ({ label, value }) => {
        console.log('Selected:', label, value);
    }
});
```

### SelectMultipleDropdown
```javascript
new SelectMultipleDropdown('#tagsSelect_dropdown', {
    maxSelections: 5,
    onSelect: ({ selections }) => {
        console.log('Current selections:', selections);
    }
});
```

### Toast
```javascript
// Success notification
new Toast({
    message: 'Data saved successfully!',
    type: 'success',
    duration: 3000
});

// Error notification
new Toast({
    message: 'Something went wrong',
    type: 'error',
    position: 'top-right'
});
```

### LanguageSwitch
```javascript
new LanguageSwitch({
    localeDropdownSelector: '.language-dropdown',
    buttonSelector: '.btn-locale',
    defaultLocale: 'en'
});
```

## 🔗 Laravel Integration

### CSRF Protection
```javascript
// Set default headers for axios
axios.defaults.headers.common['X-CSRF-TOKEN'] = 
    document.querySelector('meta[name="csrf-token"]').getAttribute('content');
```

### Response Format
Your Laravel controllers should return JSON:

```php
// Success response
return response()->json([
    'message' => 'Success!',
    'data' => $data,
    'redirect' => route('dashboard') // optional
]);

// Error response  
return response()->json([
    'message' => 'Validation failed',
    'errors' => $validator->errors()
], 422);

// Paginated data
return response()->json([
    'data' => $items,
    'meta' => $items->meta() // Laravel pagination meta
]);
```

## 🎨 CSS Framework Support

Designed for **Tailwind CSS** and **DaisyUI**, but works with any CSS framework.

## 📋 Requirements

- Modern browsers with ES6 support
- Optional: Axios for HTTP requests (fallback to fetch)
- Recommended: Tailwind CSS + DaisyUI for styling

## 🏗️ Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Clean build
npm run clean
```

## 📄 License

MIT © [Karyazilim](https://karyazilim.com)

## 🤝 Contributing

Contributions welcome! Please read our [contributing guidelines](https://github.com/doyosi/laravel/blob/main/CONTRIBUTING.md).

---

**Happy coding with @doyosi/laravel! 🚀**
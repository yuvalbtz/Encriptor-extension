# Web Page Decryptor Chrome Extension

A Chrome extension that allows you to decrypt web pages using a mapping file. The extension supports CSV, XLSX, and XLS files containing the mapping between encrypted and original text.

## Features

- Upload mapping files in CSV, XLSX, or XLS format
- Support for any character encoding (including Hebrew and other non-Latin scripts)
- Real-time decryption of web pages
- Automatic updates when the page content changes

## Mapping File Format

The mapping file should contain two columns:
1. `original` - The original text
2. `encrypted` - The encrypted text that appears on the web page

Example:
```
original,encrypted
hello,xyz123
world,abc456
```

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory from this project

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click the "Upload Mapping File" button
3. Select your mapping file (CSV, XLSX, or XLS)
4. The extension will automatically decrypt the current page and any new content that loads

## Development

To start the development server:
```bash
npm run dev
```

## Building

To build the extension:
```bash
npm run build
```

The built extension will be in the `dist` directory.

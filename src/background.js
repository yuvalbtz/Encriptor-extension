// Store the decryption map
let decryptionMap = [];

// Listen for messages from the popup window
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_DECRYPTION_MAP') {
        console.log('Background script received decryption map:', message.payload);
        decryptionMap = message.payload;
        broadcastDecryptionMap();
    }
});

async function broadcastDecryptionMap() {
    try {
        // Get all tabs
        const tabs = await chrome.tabs.query({});

        // For each tab, inject the content script if needed and send the message
        for (const tab of tabs) {
            if (tab.id) {
                try {
                    // Check if we can inject into this tab
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => window.location.protocol,
                    });

                    // Skip if we're on a chrome-extension page
                    if (results[0].result === 'chrome-extension:') {
                        continue;
                    }

                    // Try to inject the content script
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });

                    // Send the message
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'SET_DECRYPTION_MAP',
                        payload: decryptionMap
                    });
                } catch (error) {
                    // Ignore errors for tabs where we can't inject the script
                    console.log(`Could not inject script into tab ${tab.id}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error broadcasting decryption map:', error);
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: 'index.html',
        type: 'popup',
        width: 400,
        height: 600
    });
}); 
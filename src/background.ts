// Store the decryption map
let decryptionMap: Record<string, string> = {};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'DECRYPT_PAGE') {
        decryptionMap = request.mappings;
        console.log('Background script received message:', request);
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'DECRYPT_PAGE',
                        mappings: decryptionMap
                    }).catch((err) => {
                        console.error('Error sending message to tab:', err);
                    });
                }
            });
        });

        sendResponse({ success: true });
    } else if (request.type === 'UN_DECRYPT_PAGE') {
        if (Object.keys(decryptionMap).length === 0) {
            sendResponse({ success: false, error: 'No mappings available' });
            return;
        }

        const reverseMappings: Record<string, string> = {};
        Object.entries(decryptionMap).forEach(([original, encrypted]) => {
            reverseMappings[encrypted] = original;
        });

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'UN_DECRYPT_PAGE',
                        mappings: reverseMappings
                    }).catch((err) => {
                        console.error('Error sending message to tab:', err);
                    });
                }
            });
        });

        sendResponse({ success: true });
    }
});

chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
}); 
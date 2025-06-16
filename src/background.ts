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
    } else if (request.type === 'ENC_WITH_TOOLTIP') {
        console.log('Background script received message:', request);
        const { mappings } = request;
        // Object.entries(mappings).forEach(([original, encrypted]) => {
        //     reverseMappings[encrypted] = original;
        // });

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'ENC_WITH_TOOLTIP',
                        mappings: mappings
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


chrome.webRequest.onBeforeRequest.addListener((details: chrome.webRequest.OnBeforeRequestDetails) => {
    console.log('onBeforeRequest', details);
    if (details.method === 'POST') {
        console.log('POST request', details.url);
        const formData = details.requestBody?.formData;
        console.log('body', details.requestBody);
        if (formData) {
            Object.entries(formData).forEach(([key, values]) => {
                values.forEach(value => {
                    console.log('Form data:', key, value);
                });
            });
        } else {
            console.log('No form data');
        }
    } else if (details.method === 'GET') {
        console.log('GET request', details.url);
    }
    return { cancel: false };
}, { urls: ['<all_urls>'] });


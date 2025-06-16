// import { normalizeText, normalizeMapping } from './utils.tsx';

// Initialize the flag and store mappings
(window as any).webPageDecryptorInitialized = true;
let currentMappings = new Map<string, string>();

// Function to process text nodes
function processTextNode(node: Text, mappings: Map<string, string>) {
    const originalText = node.textContent?.trim() || '';
    let words = originalText?.split(" ") || [];

    // Process each mapping
    mappings.forEach((original, encrypted) => {
        const originalTextWithoutQuotes = original.replace(/['"]+/g, '');
        const encryptedTextWithoutQuotes = encrypted.replace(/['"]+/g, '');

        words.forEach(word => {
            if (word.trim() === encryptedTextWithoutQuotes) {
                // Remove the original node after inserting new ones
                console.log('Found match for:', encryptedTextWithoutQuotes, word.trim());
                const span = document.createElement('span');
                span.style.backgroundColor = '#ffeb3b';  // Yellow highlight
                span.style.padding = '2px';
                // span.setAttribute('data-processed', 'true');
                // span.setAttribute('data-encrypted', encryptedTextWithoutQuotes); // Store original key
                span.textContent = originalTextWithoutQuotes;

                // Create text nodes for before and after the match
                const beforeText = node.textContent?.substring(0, node.textContent.indexOf(word)) || '';
                const afterText = node.textContent?.substring(node.textContent.indexOf(word) + word.length) || '';

                const before = document.createTextNode(beforeText);
                const after = document.createTextNode(afterText);

                // Insert nodes in the correct order
                node.parentNode?.insertBefore(before, node);
                node.parentNode?.insertBefore(span, node);
                node.parentNode?.insertBefore(after, node);

                // 🚨 THIS IS CRUCIAL:
                node.parentNode?.removeChild(node); // Remove the original text node


            }
        });
    });
}

// function cleanupProcessedSpans() {
//     const spans = document.querySelectorAll('span[data-processed="true"]');
//     spans.forEach(span => {
//         const parent = span.parentNode;
//         const encryptedValue = span.getAttribute('data-encrypted');
//         if (parent && encryptedValue) {
//             const textNode = document.createTextNode(encryptedValue);
//             parent.replaceChild(textNode, span);
//         }
//     });
// }

// Function to process the entire document
function processDocument(mappings: Map<string, string>) {
    // cleanupProcessedSpans(); // Clean old spans first
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );
    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
        if (
            node.parentElement &&
            !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)
        ) {
            textNodes.push(node);
        }
    }
    textNodes.forEach(node => processTextNode(node, mappings));
}

function processTextNodeWithTooltip(node: Text, mappings: Map<string, string>) {
    const originalText = node.textContent?.trim() || '';
    let words = originalText?.split(" ") || [];

    // Process each mapping
    mappings.forEach((original, encrypted) => {
        const originalTextWithoutQuotes = original.replace(/['"]+/g, '');
        const encryptedTextWithoutQuotes = encrypted.replace(/['"]+/g, '');

        words.forEach(word => {
            if (word.trim() === encryptedTextWithoutQuotes) {
                console.log('Found match for:', encryptedTextWithoutQuotes, word.trim());

                // Create the span with tooltip
                const span = document.createElement('span');
                span.style.backgroundColor = '#ffeb3b';  // Yellow highlight
                span.style.padding = '2px';
                span.style.position = 'relative';
                span.style.cursor = 'help';
                span.textContent = word;

                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.style.position = 'absolute';
                tooltip.style.backgroundColor = '#333';
                tooltip.style.color = 'white';
                tooltip.style.padding = '5px 10px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.fontSize = '14px';
                tooltip.style.zIndex = '1000';
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
                tooltip.style.transition = 'opacity 0.3s';
                tooltip.style.bottom = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.whiteSpace = 'nowrap';
                tooltip.style.pointerEvents = 'none';
                tooltip.textContent = `Decrypted: ${originalTextWithoutQuotes}`;

                // Add tooltip to span
                span.appendChild(tooltip);

                // Add hover events
                span.addEventListener('mouseenter', () => {
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '1';
                });

                span.addEventListener('mouseleave', () => {
                    tooltip.style.visibility = 'hidden';
                    tooltip.style.opacity = '0';
                });

                // Replace the word in the text node
                const textBefore = node.textContent?.substring(0, node.textContent.indexOf(word)) || '';
                const textAfter = node.textContent?.substring(node.textContent.indexOf(word) + word.length) || '';

                if (textBefore) {
                    const beforeNode = document.createTextNode(textBefore);
                    node.parentNode?.insertBefore(beforeNode, node);
                }

                node.parentNode?.insertBefore(span, node);

                if (textAfter) {
                    const afterNode = document.createTextNode(textAfter);
                    node.parentNode?.insertBefore(afterNode, node);
                }

                node.parentNode?.removeChild(node);
            }
        });
    });
}

function processDocumentWithTooltip(mappings: Map<string, string>) {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );
    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
        if (
            node.parentElement &&
            !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)
        ) {
            textNodes.push(node);
        }
    }
    textNodes.forEach(node => processTextNodeWithTooltip(node, mappings));
}




// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
    if (request.type === 'DECRYPT_PAGE') {
        currentMappings = new Map(Object.entries(request.mappings));
        console.log('DECRYPT_PAGE -->  Current mappings:', currentMappings);
        processDocument(currentMappings);
        sendResponse({ success: true });
    } else if (request.type === 'UN_DECRYPT_PAGE') {
        const reverseMappings = new Map<string, string>();
        if (request.mappings) {
            Object.entries(request.mappings).forEach(([encrypted, original]) => {
                reverseMappings.set(encrypted as string, original as string);
            });
        }

        console.log('UN_DECRYPT_PAGE -->  Reverse mappings:', reverseMappings);
        if (reverseMappings.size === 0) {
            sendResponse({ success: false, error: 'No mappings to reverse' });
            return;
        }

        processDocument(reverseMappings);
        sendResponse({ success: true });
    } else if (request.type === 'ENC_WITH_TOOLTIP') {
        currentMappings = new Map(Object.entries(request.mappings));
        console.log('ENC_WITH_TOOLTIP -->  Current mappings:', currentMappings);
        processDocumentWithTooltip(currentMappings);
        sendResponse({ success: true });
    }
}); 
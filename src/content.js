// Check if the script has already been initialized
if (window.webPageDecryptorInitialized) {
    console.log('Content script already initialized');
} else {
    window.webPageDecryptorInitialized = true;
    console.log('Content script loaded');

    let decryptionMap = [];
    let globalDecryptEnabled = false;
    let tooltip = null;

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);

        if (message.type === 'SET_DECRYPTION_MAP') {
            decryptionMap = message.payload;
            console.log('Content script received decryption map:', decryptionMap);
            decryptPage();
        } else if (message.type === 'TOGGLE_GLOBAL_DECRYPT') {
            globalDecryptEnabled = message.payload;
            updatePageVisibility();
        }
    });

    function updatePageVisibility() {
        const encryptedElements = document.querySelectorAll('.encrypted-text');
        encryptedElements.forEach(element => {
            if (globalDecryptEnabled) {
                element.classList.add('show-decrypted');
            } else {
                element.classList.remove('show-decrypted');
            }
        });
    }

    function decryptPage() {
        console.log('Starting page decryption with map:', decryptionMap);

        // Create a tree walker to traverse all text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    // Skip script and style tags
                    if (node.parentNode &&
                        (node.parentNode.nodeName === 'SCRIPT' ||
                            node.parentNode.nodeName === 'STYLE' ||
                            node.parentNode.nodeName === 'NOSCRIPT')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        let node;
        let replacements = 0;

        // Process each text node
        while (node = walker.nextNode()) {
            const originalText = node.textContent;
            let newText = originalText;

            // Sort decryption map by length (longest first) to handle overlapping words
            const sortedMap = [...decryptionMap].sort((a, b) => b.encrypted.length - a.encrypted.length);

            // Apply each replacement
            for (const { original, encrypted } of sortedMap) {
                if (!encrypted) continue;

                // Create a regex that matches the encrypted word
                const regex = new RegExp(escapeRegExp(encrypted), 'g');

                // Replace the encrypted word with a span element
                newText = newText.replace(regex, (match) => {
                    console.log(`Replacing '${match}' with '${original}'`);
                    replacements++;
                    return `<span class="encrypted-text" data-original="${original}" data-encrypted="${encrypted}">${match}</span>`;
                });
            }

            // Only update the node if changes were made
            if (newText !== originalText) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newText;

                // Replace the text node with the new content
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                node.parentNode.replaceChild(fragment, node);
            }
        }

        // Add event listeners for hover and click
        document.addEventListener('mouseover', handleHover);
        document.addEventListener('mouseout', handleHoverOut);
        document.addEventListener('click', handleClick);

        // Add styles for the different states
        addStyles();

        console.log(`Decryption complete. Made ${replacements} replacements.`);
    }

    function handleHover(event) {
        const target = event.target;
        if (target.classList.contains('encrypted-text')) {
            const original = target.getAttribute('data-original');
            showTooltip(target, original);
        }
    }

    function handleHoverOut(event) {
        const target = event.target;
        if (target.classList.contains('encrypted-text')) {
            hideTooltip();
        }
    }

    function handleClick(event) {
        const target = event.target;
        if (target.classList.contains('encrypted-text')) {
            const original = target.getAttribute('data-original');
            target.textContent = original;
            target.classList.add('clicked-decrypted');
        }
    }

    function showTooltip(element, text) {
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'decrypt-tooltip';
            document.body.appendChild(tooltip);
        }

        const rect = element.getBoundingClientRect();
        tooltip.textContent = text;
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.style.display = 'block';
    }

    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .encrypted-text {
                cursor: pointer;
                position: relative;
            }
            
            .encrypted-text.show-decrypted {
                color: transparent;
            }
            
            .encrypted-text.show-decrypted::after {
                content: attr(data-original);
                position: absolute;
                left: 0;
                color: initial;
            }
            
            .encrypted-text.clicked-decrypted {
                color: initial;
            }
            
            .decrypt-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10000;
                display: none;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Helper function to escape special characters in regex
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Initial decryption when the content script loads
    decryptPage();
} 
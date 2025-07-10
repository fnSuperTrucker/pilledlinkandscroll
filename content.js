// content.js
// This script runs on the pilled.net page when the extension is enabled.
// It combines auto-scrolling for chat with making URLs in messages clickable.

console.log("Pilled.net Chat Auto-Scroller & Linkifier: content.js loaded.");

// Function to scroll the chat to the bottom
function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
        console.log("Chat scrolled to bottom.");
    } else {
        console.warn("Chat element not found for scrolling.");
    }
}

// Function to linkify text, handling URLs separately from mentions
function linkifySpan(span) {
    const text = span.textContent.trim();
    // Regex to match URLs, ensuring they stand alone or are separated from mentions
    const urlRegex = /(?:^|\s)(https?:\/\/[^\s]+)/g;

    // Only process spans that haven't been linkified by this script
    if (!span.dataset.linkified) {
        let newHtml = text;
        let hasLinks = false;

        // Replace URLs with anchor tags, preserving surrounding text like @mentions
        newHtml = text.replace(urlRegex, (match, url) => {
            hasLinks = true;
            // If there's a space before the URL, preserve it
            const prefix = match.startsWith(' ') ? ' ' : '';
            return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1e90ff; text-decoration: underline; cursor: pointer;">${url}</a>`;
        });

        // Only update if we found and replaced a URL
        if (hasLinks) {
            span.innerHTML = newHtml;
            span.dataset.linkified = 'true'; // Mark as linkified
            console.log(`Linkified: "${text}" -> "${span.innerHTML}"`);
        }
    }
}

// Process chat spans to make links clickable
function processChat() {
    // Adjust selector based on Pilled.net's chat structure
    // Target spans that are part of chat messages and haven't been linkified yet.
    // Assuming chat messages are within 'span.ng-star-inserted' or 'span.chat-message'
    const spans = document.querySelectorAll('span.ng-star-inserted:not([data-linkified]), span.chat-message:not([data-linkified])');
    if (spans.length > 0) {
        console.log('Found', spans.length, 'potential URL spans to linkify.');
    }
    spans.forEach(linkifySpan);
}


let chatObserver = null;
let chatContainer = null; // Will store the chat container element
let findChatInterval = null; // To store the interval ID

// Function to find and observe the chat container
function initializeChatObserver() {
    console.log("Attempting to initialize chat observer for scrolling and linkifying...");

    // IMPORTANT: The most precise selector based on your provided HTML is now prioritized.
    // This should make it find the chat container much faster.
    const potentialSelectors = [
        // Prioritizing the div with specific styles that contains the chat tree
        'div[style*="height: 718px"][style*="overflow-x: hidden"]',
        'app-comments > div[style*="overflow-x: hidden"]', // More specific path to that div
        'app-comment-tree-foxhole', // The custom component itself
        '.chat-feed', // General class, might be used elsewhere
        'div[style*="overflow: auto"]',
        'div[style*="overflow: scroll"]',
        '[id*="chat-messages"]', // Generic ID patterns
        '[class*="chat-messages"]', // Generic class patterns
        '[id*="message-list"]',
        '[class*="message-list"]',
        'div.stream-chat-messages-container',
        'div.chat-area > div.messages',
        'div.chat-area > div[style*="overflow"]',
    ];

    let attempts = 0;
    const maxAttempts = 60; // Try for up to 60 * 200ms = 12 seconds for very slow loading

    // Function to try finding the chat container
    const tryFindingChatContainer = () => {
        chatContainer = null; // Reset for each attempt
        for (const selector of potentialSelectors) {
            chatContainer = document.querySelector(selector);
            if (chatContainer) {
                console.log(`Found chat container with selector: '${selector}'`, chatContainer);
                break; // Found it, exit loop
            }
        }

        if (chatContainer) {
            clearInterval(findChatInterval); // Stop trying to find it
            console.log("Pilled.net chat container found. Initializing observer.");

            if (chatObserver) {
                chatObserver.disconnect(); // Disconnect existing observer if any
            }

            // Create a MutationObserver to watch for new messages
            chatObserver = new MutationObserver((mutationsList, observer) => {
                // Scroll to bottom whenever new nodes are added (new messages)
                scrollToBottom(chatContainer);
                // Also process new nodes for links
                processChat();
            });

            // Start observing the chat container for child list changes (new messages)
            chatObserver.observe(chatContainer, { childList: true, subtree: true });

            // Perform initial scroll immediately after finding container
            scrollToBottom(chatContainer);
            console.log("Pilled.net chat auto-scroller initialized and scrolled initially.");

            // Also process existing chat messages for links on initialization
            processChat();
            console.log("Pilled.net chat initial linkification complete.");

        } else {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(findChatInterval); // Stop trying
                console.error("Pilled.net chat container not found after multiple attempts. Auto-scrolling and linkification will not work. Please inspect the element on the live page and update 'potentialSelectors' in content.js.");
            } else {
                console.log(`Attempt ${attempts}/${maxAttempts}: Chat container not found. Retrying...`);
            }
        }
    };

    // Start trying to find the chat container repeatedly
    findChatInterval = setInterval(tryFindingChatContainer, 200); // Reduced interval to 200ms for faster checks

    // Also, ensure an initial check on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded fired. Ensuring chat observer is initialized.");
        // If not found yet, and interval is still running, let the interval handle it.
        // If interval is not running (e.g., already cleared because maxAttempts reached),
        // then try one more time immediately.
        if (!chatContainer && !findChatInterval) {
            tryFindingChatContainer();
        }
        // Also run processChat on DOMContentLoaded for any initial messages
        processChat();
    });

    // Run processChat after delays for initial load (as in the original linkify script)
    setTimeout(processChat, 1000);
    setTimeout(processChat, 3000);
}

// Start the process of finding and observing the chat container
initializeChatObserver();

// Persistent execution on page changes for linkification (from original linkify script)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        processChat();
    }
});

// When the content script is removed (e.g., extension disabled or tab closed),
// disconnect the observer and clear any intervals to clean up resources.
window.addEventListener('beforeunload', () => {
    if (chatObserver) {
        chatObserver.disconnect();
        console.log("Chat observer disconnected on page unload.");
    }
    if (findChatInterval) {
        clearInterval(findChatInterval);
        console.log("Find chat interval cleared on page unload.");
    }
});

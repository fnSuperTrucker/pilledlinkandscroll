// background.js
// This script runs in the background and listens for when a tab is updated.
// It will inject content.js into pilled.net tabs when they are loaded or updated.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the tab URL matches pilled.net and the tab is fully loaded
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('pilled.net')) {
        // Inject the content script into the tab
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            console.log("content.js injected into pilled.net");
        }).catch(err => console.error("Failed to inject content.js:", err));
    }
});

// Listen for when the extension is enabled/disabled by the user
// This will trigger a re-injection of the content script if the tab is already open
chrome.management.onEnabled.addListener((info) => {
    if (info.id === chrome.runtime.id) { // Check if it's this extension
        chrome.tabs.query({ url: "*://pilled.net/*" }, (tabs) => {
            tabs.forEach(tab => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }).then(() => {
                    console.log("content.js re-injected due to extension enabled.");
                }).catch(err => console.error("Failed to re-inject content.js on enable:", err));
            });
        });
    }
});

chrome.management.onDisabled.addListener((info) => {
    if (info.id === chrome.runtime.id) { // Check if it's this extension
        // When disabled, the content script will stop running automatically
        // as its execution context is removed. No explicit action needed here.
        console.log("Extension disabled. Content script will stop.");
    }
});

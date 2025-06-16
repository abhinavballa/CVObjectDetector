// Store verification status
let isVerified = false;
let verificationTimeout = null;
let lockedSites = [];
let currentUrl = '';

// Initialize rules
async function initializeRules() {
    // Get locked sites from storage
    const result = await chrome.storage.local.get('lockedSites');
    lockedSites = result.lockedSites || [];
    
    // Update rules
    await updateRules();
}

// Update rules
async function updateRules() {
    // Remove existing rules
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1]
    });

    // Add new rules for each locked site
    const rules = lockedSites.map((site, index) => ({
        id: index + 1,
        priority: 1,
        action: {
            type: "block"
        },
        condition: {
            urlFilter: site,
            resourceTypes: ["main_frame"]
        }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
    });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.lockedSites) {
        lockedSites = changes.lockedSites.newValue;
        updateRules();
    }
});

// Handle web navigation
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) { // Main frame only
        const url = new URL(details.url);
        const hostname = url.hostname;
        
        // Check if site is locked
        if (lockedSites.some(site => hostname.includes(site))) {
            // Check if already verified
            const result = await chrome.storage.local.get('verifiedSites');
            const verifiedSites = result.verifiedSites || [];
            
            if (!verifiedSites.includes(hostname)) {
                currentUrl = details.url;
                // Open verification page in a new tab (not popup window)
                chrome.tabs.create({
                    url: chrome.runtime.getURL('verification/verification.html')
                });
            }
        }
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentUrl') {
        sendResponse({ url: currentUrl });
    } else if (request.action === 'verificationComplete') {
        // Add site to verified sites
        chrome.storage.local.get('verifiedSites', (result) => {
            const verifiedSites = result.verifiedSites || [];
            const url = new URL(request.url);
            verifiedSites.push(url.hostname);
            chrome.storage.local.set({ verifiedSites });
            
            // Reload the page
            chrome.tabs.reload(sender.tab.id);
        });
    }
});

// Initialize on startup
initializeRules(); 
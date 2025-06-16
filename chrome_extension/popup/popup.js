// Add/Remove blocked sites
const siteInput = document.getElementById('site-input');
const addBtn = document.getElementById('add-btn');
const lockedSitesList = document.getElementById('locked-sites');
const referenceBtn = document.getElementById('reference-btn');

function loadLockedSites() {
    chrome.storage.local.get('lockedSites', (result) => {
        const sites = result.lockedSites || [];
        lockedSitesList.innerHTML = '';
        sites.forEach(site => {
            const li = document.createElement('li');
            li.className = 'site-item';
            const span = document.createElement('span');
            span.textContent = site;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeSite(site);
            li.appendChild(span);
            li.appendChild(removeBtn);
            lockedSitesList.appendChild(li);
        });
    });
}

function addSite() {
    const site = siteInput.value.trim();
    if (site) {
        chrome.storage.local.get('lockedSites', (result) => {
            const sites = result.lockedSites || [];
            if (!sites.includes(site)) {
                sites.push(site);
                chrome.storage.local.set({ lockedSites: sites }, () => {
                    siteInput.value = '';
                    loadLockedSites();
                });
            }
        });
    }
}

function removeSite(site) {
    chrome.storage.local.get('lockedSites', (result) => {
        const sites = result.lockedSites || [];
        const newSites = sites.filter(s => s !== site);
        chrome.storage.local.set({ lockedSites: newSites }, loadLockedSites);
    });
}

addBtn.onclick = addSite;
siteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
});

// Open a new tab for reference image capture/upload
referenceBtn.onclick = function() {
    chrome.tabs.create({ url: chrome.runtime.getURL('capture/capture.html') });
};

// Initial load
loadLockedSites(); 

//debug
captureBtn.onclick = async function() {
    console.log('Capture button clicked');
}; 
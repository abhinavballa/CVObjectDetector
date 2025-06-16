document.getElementById('test-btn').onclick = function() {
    chrome.tabs.create({ url: 'https://www.google.com' });
}; 
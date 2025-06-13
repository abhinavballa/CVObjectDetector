document.addEventListener('DOMContentLoaded', function() {
    const uploadFaceBtn = document.getElementById('upload-face');
    const captureFaceBtn = document.getElementById('capture-face');
    const cameraContainer = document.getElementById('camera-container');
    let video = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const urlInput = document.getElementById('url-input');
    const addUrlBtn = document.getElementById('add-url');
    const lockedSitesList = document.getElementById('locked-sites');
    const statusDiv = document.getElementById('status');
    const referenceList = document.getElementById('reference-list');
    const siteInput = document.getElementById('site-input');
    const addBtn = document.getElementById('add-btn');
    const currentReference = document.getElementById('current-reference');
    const lastUpdated = document.getElementById('last-updated');
    const deleteReferenceBtn = document.getElementById('delete-reference');

    let stream = null;

    // Load reference picture info
    loadReferenceInfo();

    // Load locked sites from storage
    loadLockedSites();

    // Handle face upload
    uploadFaceBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    sendFaceToServer(event.target.result, 'upload');
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    });

    // Handle face capture
    captureFaceBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            cameraContainer.classList.remove('hidden');
        } catch (err) {
            showStatus('Error accessing camera: ' + err.message, 'error');
        }
    });

    // Handle capture button
    captureBtn.addEventListener('click', function() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        sendFaceToServer(imageData, 'capture');
        
        // Stop camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            cameraContainer.classList.add('hidden');
        }
    });

    // Handle adding new URL
    addUrlBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();
        if (url) {
            chrome.storage.local.get(['lockedSites'], function(result) {
                const lockedSites = result.lockedSites || [];
                if (!lockedSites.includes(url)) {
                    lockedSites.push(url);
                    chrome.storage.local.set({ lockedSites: lockedSites }, function() {
                        updateLockedSitesList(lockedSites);
                        urlInput.value = '';
                        showStatus('Website added to locked list', 'success');
                    });
                } else {
                    showStatus('Website already in locked list', 'error');
                }
            });
        }
    });

    // Handle delete reference
    deleteReferenceBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete the reference face?')) {
            fetch('http://localhost:5000/delete-reference', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentReference.src = '';
                    lastUpdated.textContent = '';
                    showStatus('Reference face deleted', 'success');
                } else {
                    showStatus('Error deleting reference face: ' + data.message, 'error');
                }
            })
            .catch(error => {
                showStatus('Error: ' + error.message, 'error');
            });
        }
    });

    // Helper function to load reference info
    function loadReferenceInfo() {
        fetch('http://localhost:5000/get-reference-info')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.has_reference) {
                    currentReference.src = data.image;
                    lastUpdated.textContent = 'Last updated: ' + data.last_modified;
                } else {
                    currentReference.src = '';
                    lastUpdated.textContent = 'No reference face set';
                }
            })
            .catch(error => {
                showStatus('Error loading reference info: ' + error.message, 'error');
            });
    }

    // Helper function to send face data to server
    function sendFaceToServer(imageData, type) {
        fetch('http://localhost:5000/setup-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData,
                type: type
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showStatus('Face ID setup successful!', 'success');
                loadReferenceInfo(); // Reload reference info
            } else {
                showStatus('Face ID setup failed: ' + data.message, 'error');
            }
        })
        .catch(error => {
            showStatus('Error: ' + error.message, 'error');
        });
    }

    // Helper function to update locked sites list
    function updateLockedSitesList(sites) {
        lockedSitesList.innerHTML = '';
        sites.forEach(site => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${site}</span>
                <button class="remove-site" data-url="${site}">Remove</button>
            `;
            lockedSitesList.appendChild(li);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-site').forEach(button => {
            button.addEventListener('click', function() {
                const url = this.dataset.url;
                chrome.storage.local.get(['lockedSites'], function(result) {
                    const lockedSites = result.lockedSites || [];
                    const newLockedSites = lockedSites.filter(site => site !== url);
                    chrome.storage.local.set({ lockedSites: newLockedSites }, function() {
                        updateLockedSitesList(newLockedSites);
                        showStatus('Website removed from locked list', 'success');
                    });
                });
            });
        });
    }

    // Helper function to show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    }

    // Start camera
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            captureBtn.disabled = false;
        } catch (err) {
            statusDiv.textContent = 'Error accessing camera: ' + err.message;
            statusDiv.className = 'error';
            captureBtn.disabled = true;
        }
    }

    // Capture and save reference image
    async function captureReference() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg');
            const timestamp = new Date().toISOString();
            const filename = `reference_${timestamp}.jpg`;
            
            const response = await fetch('http://localhost:5000/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    image: imageData,
                    filename: filename
                })
            });

            const result = await response.json();
            
            if (result.success) {
                statusDiv.textContent = 'Reference image saved successfully!';
                statusDiv.className = 'success';
                loadReferenceImages();
            } else {
                statusDiv.textContent = 'Error saving reference image: ' + result.error;
                statusDiv.className = 'error';
            }
        } catch (err) {
            statusDiv.textContent = 'Error during capture: ' + err.message;
            statusDiv.className = 'error';
        }
    }

    // Load reference images
    async function loadReferenceImages() {
        try {
            const response = await fetch('http://localhost:5000/reference');
            const result = await response.json();
            
            referenceList.innerHTML = '';
            result.references.forEach(ref => {
                const li = document.createElement('li');
                li.className = 'reference-item';
                
                const link = document.createElement('a');
                link.href = `http://localhost:5000/reference/${ref.filename}`;
                link.className = 'reference-name';
                link.textContent = ref.filename;
                link.target = '_blank';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => deleteReference(ref.filename);
                
                li.appendChild(link);
                li.appendChild(deleteBtn);
                referenceList.appendChild(li);
            });
        } catch (err) {
            console.error('Error loading reference images:', err);
        }
    }

    // Delete reference image
    async function deleteReference(filename) {
        try {
            const response = await fetch(`http://localhost:5000/reference/${filename}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadReferenceImages();
            }
        } catch (err) {
            console.error('Error deleting reference image:', err);
        }
    }

    // Load locked sites
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

    // Add locked site
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

    // Remove locked site
    function removeSite(site) {
        chrome.storage.local.get('lockedSites', (result) => {
            const sites = result.lockedSites || [];
            const newSites = sites.filter(s => s !== site);
            chrome.storage.local.set({ lockedSites: newSites }, loadLockedSites);
        });
    }

    // Event listeners
    captureBtn.addEventListener('click', captureReference);
    addBtn.addEventListener('click', addSite);
    siteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addSite();
        }
    });

    // Initialize
    startCamera();
    loadReferenceImages();
    loadLockedSites();
}); 
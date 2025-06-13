let video = document.getElementById('camera-feed');
let statusDiv = document.getElementById('status');
let currentUrl = '';

// Get the URL from the background script
chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
    currentUrl = response.url;
});

// Start camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        statusDiv.textContent = 'Error accessing camera: ' + err.message;
        statusDiv.className = 'error';
    }
}

// Verify face
async function verifyFace() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        
        const response = await fetch('http://localhost:5000/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });

        const result = await response.json();
        
        if (result.verified) {
            statusDiv.textContent = 'Face verified! Access granted.';
            statusDiv.className = 'success';
            
            // Notify background script
            chrome.runtime.sendMessage({ 
                action: 'verificationComplete',
                url: currentUrl
            });
            
            // Close popup after 2 seconds
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            statusDiv.textContent = 'Face not recognized. Please try again.';
            statusDiv.className = 'error';
            setTimeout(verifyFace, 1000);
        }
    } catch (err) {
        statusDiv.textContent = 'Error during verification: ' + err.message;
        statusDiv.className = 'error';
    }
}

// Start verification process
startCamera();
video.onloadedmetadata = () => {
    verifyFace();
}; 
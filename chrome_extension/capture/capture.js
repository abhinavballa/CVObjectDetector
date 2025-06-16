const video = document.getElementById('camera-feed');
const captureBtn = document.getElementById('capture-btn');
const statusDiv = document.getElementById('status');

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => { video.srcObject = stream; })
  .catch(err => { statusDiv.textContent = 'Camera error: ' + err.message; });

captureBtn.onclick = async function() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    const filename = `reference_${Date.now()}.jpg`;

    const response = await fetch('http://localhost:5000/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, filename })
    });
    const result = await response.json();
    if (result.success) {
        statusDiv.textContent = 'Reference image saved!';
        setTimeout(() => window.close(), 1000);
    } else {
        statusDiv.textContent = 'Error: ' + (result.error || result.message || 'No face detected. Please try again.');
    }
}; 
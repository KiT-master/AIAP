const video = document.getElementById('webcam');
const captureButton = document.getElementById('captureButton');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Access the user camera and video
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        video.srcObject = stream;
    })
    .catch((error) => {
        console.error('Error accessing webcam:', error);
    });


// Capture image when the button is clicked
captureButton.addEventListener('click', () => {
    // Capture image logic (same as before)
    // ...

    // Send the image data to the server
    fetch('/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageDataURL }), // Assuming you have the image data URL
    })
        .then((response) => response.text())
        .then((message) => {
            console.log(message);
        })
        .catch((error) => {
            console.error('Error sending image to server:', error);
        });
});
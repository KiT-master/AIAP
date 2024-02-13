const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
const Diary = require('../models/diary');
const date = new Date();
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const nodeWebCam = require('node-webcam');
const fs = require('fs');

const options = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 1,
    saveShots: true,
    output: 'jpeg',
    device: false,
    callbackReturn: 'location'
};

const webcam = nodeWebCam.create(options);

const captureShot = (amount, i, name) => {
    const folderPath = './public/uploads/'+ name;

    // Create folder if it does not exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    // Capture the image
    webcam.capture(`./public/uploads/${name}/${name}${i}.${options.output}`, (err, data) => {
        if (!err) {
            console.log('Image created');
        }
        console.log(err);
        i++;
        if (i <= amount) {
            captureShot(amount, i, name);
        }
    });
};


router.get('/', (req, res) => {
    res.render('./medication/home')
})

router.get('/camera', (req, res) => {
    res.render('./medication/camera')
})

router.get('/capture' , (req, res) => {
    captureShot(1, 1, 'capture')
    res.redirect('./camera')
})

router.post('/save-image', (req, res) => {
    let base64Image = req.body.img.split(';base64,').pop();
    let path = './public/uploads/medication.png'; // specify a filename
    fs.writeFile(path, base64Image, {encoding: 'base64'}, function(err) {
        if(err) {
            console.log('Error:', err);
            res.status(500).send('Error saving image');
        } else {
            console.log('File created at', path);
            res.send('Image saved');
        }
    });
});

module.exports = router;
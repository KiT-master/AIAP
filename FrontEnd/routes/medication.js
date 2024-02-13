const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
const Diary = require('../models/diary');
const date = new Date();
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const nodeWebCam = require('node-webcam');

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
    const folderPath = `./images/${name}`;

    // Create folder if it does not exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    // Capture the image
    webcam.capture(`./images/${name}/${name}${i}.${options.output}`, (err, data) => {
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

router.post('/upload', (req, res) => {
    // Creates user id directory for upload if not exist
    if (!fs.existsSync('./public/uploads/medication')) {
        fs.mkdirSync('./public/uploads/medication', {
            recursive:
                true
        });
    }
    upload(req, res, (err) => {
        if (err) {
            // e.g. File too large
            res.json({ file: '/img/no-image.jpg', err: err });
        }
        else {
            res.json({
                file: `/uploads/medication/capture_img.png`
            });
        }
    });
});

module.exports = router;
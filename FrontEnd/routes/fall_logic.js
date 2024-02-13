const express = require('express');
const router = express.Router();

const bodyParser = require('body-parser');
const cv = require('./opencv.js');
const fs = require('fs');


const net = new cv.Net();
const inWidth = 368;
const inHeight = 368;
const thr = 0.2;

const BODY_PARTS = { "Nose": 0, "Neck": 1, "RShoulder": 2, "RElbow": 3, "RWrist": 4, "LShoulder": 5, "LElbow": 6, "LWrist": 7, "RHip": 8, "RKnee": 9, "RAnkle": 10, "LHip": 11, "LKnee": 12, "LAnkle": 13, "REye": 14, "LEye": 15, "REar": 16, "LEar": 17 };
const POSE_PAIRS = [["Neck", "RShoulder"], ["Neck", "LShoulder"], ["RShoulder", "RElbow"], ["RElbow", "RWrist"], ["LShoulder", "LElbow"], ["LElbow", "LWrist"], ["Neck", "RHip"], ["RHip", "RKnee"], ["RKnee", "RAnkle"], ["Neck", "LHip"], ["LHip", "LKnee"], ["LKnee", "LAnkle"], ["Neck", "Nose"], ["Nose", "REye"], ["REye", "REar"], ["Nose", "LEye"], ["LEye", "LEar"]];

const fallModel = tf.sequential();
const mobileNetV2 = tf.keras.applications.mobileNetV2;

const loadModel = async () => {
    const { model, _ } = await mobileNetV2.load({
        weights: 'imagenet',
        includeTop: false,
        inputShape: [224, 224, 3]
    });
    return model;
};

const isFallen = (points) => {
    const hipPoint = points[BODY_PARTS["RHip"]];
    const kneePoint = points[BODY_PARTS["RKnee"]];
    const anklePoint = points[BODY_PARTS["RAnkle"]];

    if (hipPoint && kneePoint && anklePoint) {
        // Ensure the knee and ankle are below the hip
        if (kneePoint.y > hipPoint.y && anklePoint.y > hipPoint.y) {
            // Additional condition to ensure the knee is not too far forward
            if (Math.abs(kneePoint.x - hipPoint.x) < 50) {
                return true;
            }
        }
    }
    return false;
};

const poseEstimation = (frame) => {
    const frameWidth = frame.cols;
    const frameHeight = frame.rows;

    const blob = cv.blobFromImage(frame, 1.0, new cv.Size(inWidth, inHeight), new cv.Vec(127.5, 127.5, 127.5), true, false);
    net.setInput(blob);
    let out = net.forward();

    out = out.colRange(0, 18);

    const points = [];
    const confidences = [];

    for (let i = 0; i < BODY_PARTS.length; i++) {
        const heatMap = out.at(i);

        let [minVal, _, minLoc] = cv.minMaxLoc(heatMap);
        const x = (frameWidth * minLoc.x) / out.shape[3];
        const y = (frameHeight * minLoc.y) / out.shape[2];

        points.push(minVal > thr ? new cv.Point(x, y) : null);
        confidences.push(minVal);
    }

    for (const pair of POSE_PAIRS) {
        const partFrom = pair[0];
        const partTo = pair[1];

        const idFrom = BODY_PARTS[partFrom];
        const idTo = BODY_PARTS[partTo];

        if (points[idFrom] && points[idTo]) {
            cv.line(frame, points[idFrom], points[idTo], new cv.Vec(0, 255, 0), 3);
            cv.ellipse(frame, points[idFrom], new cv.Size(3, 3), 0, 0, 360, new cv.Vec(0, 0, 255), cv.FILLED);
            cv.ellipse(frame, points[idTo], new cv.Size(3, 3), 0, 0, 360, new cv.Vec(0, 0, 255), cv.FILLED);
        }
    }

    const t = net.getPerfProfile();
    const freq = cv.getTickFrequency() / 1000;
    cv.putText(frame, `${t[0] / freq}ms`, new cv.Point(10, 20), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Vec(0, 0, 0));

    return frame;
};

let fallDetectionResult = false;

router.use(bodyParser.json());
router.use(express.static('static'));

router.get('/', (req, res) => {
    res.render('./fall/logic_home')
})

router.post('/upload', (req, res) => {
    try {
        const image = req.body.content;
        fs.writeFileSync('in.png', image, 'base64');
        const img = cv.imread('in.png');

        // Perform pose estimation on the image
        const estimatedImage = poseEstimation(img);

        // Check for fall detection
        const fallDetected = isFallen(estimatedImage);
        fallDetectionResult = fallDetected;
        console.log(fallDetected);

        fs.writeFileSync('out.png', cv.imencode('.png', estimatedImage));

        res.send('ok');
    } catch (e) {
        console.error(e);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/get_fall_detection_result', (req, res) => {
    res.send(fallDetectionResult.toString());
});

router.get('/get', (req, res) => {
    res.sendFile('out.png', { root: __dirname });
});

module.exports = router;
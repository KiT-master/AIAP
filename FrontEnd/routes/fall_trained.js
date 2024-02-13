const express = require('express');
const bodyParser = require('body-parser');
const cv = require('opencv4nodejs');
const tf = require('@tensorflow/tfjs-node');
const { loadModel } = require('@tensorflow/tfjs');

const app = express();
const PORT = 5000;

const fall_detection_result = false;

const BODY_PARTS = {
    "Nose": 0, "Neck": 1, "RShoulder": 2, "RElbow": 3, "RWrist": 4,
    "LShoulder": 5, "LElbow": 6, "LWrist": 7, "RHip": 8, "RKnee": 9,
    "RAnkle": 10, "LHip": 11, "LKnee": 12, "LAnkle": 13, "REye": 14,
    "LEye": 15, "REar": 16, "LEar": 17
};

const POSE_PAIRS = [
    ["Nose", "Neck"], ["Neck", "RShoulder"], ["Neck", "LShoulder"],
    ["RShoulder", "RElbow"], ["RElbow", "RWrist"], ["LShoulder", "LElbow"],
    ["LElbow", "LWrist"], ["Neck", "RHip"], ["RHip", "RKnee"], ["RKnee", "RAnkle"],
    ["Neck", "LHip"], ["LHip", "LKnee"], ["LKnee", "LAnkle"], ["Nose", "REye"],
    ["REye", "REar"], ["Nose", "LEye"], ["LEye", "LEar"]
];

const EDGES = {
    [`${BODY_PARTS["Nose"]}-${BODY_PARTS["Neck"]}`]: 'm',
    [`${BODY_PARTS["Neck"]}-${BODY_PARTS["RShoulder"]}`]: 'm',
    [`${BODY_PARTS["Neck"]}-${BODY_PARTS["LShoulder"]}`]: 'c',
    [`${BODY_PARTS["RShoulder"]}-${BODY_PARTS["RElbow"]}`]: 'm',
    [`${BODY_PARTS["RElbow"]}-${BODY_PARTS["RWrist"]}`]: 'm',
    [`${BODY_PARTS["LShoulder"]}-${BODY_PARTS["LElbow"]}`]: 'c',
    [`${BODY_PARTS["LElbow"]}-${BODY_PARTS["LWrist"]}`]: 'c',
    [`${BODY_PARTS["Neck"]}-${BODY_PARTS["RHip"]}`]: 'y',
    [`${BODY_PARTS["RHip"]}-${BODY_PARTS["RKnee"]}`]: 'm',
    [`${BODY_PARTS["RKnee"]}-${BODY_PARTS["RAnkle"]}`]: 'm',
    [`${BODY_PARTS["Neck"]}-${BODY_PARTS["LHip"]}`]: 'y',
    [`${BODY_PARTS["LHip"]}-${BODY_PARTS["LKnee"]}`]: 'c',
    [`${BODY_PARTS["LKnee"]}-${BODY_PARTS["LAnkle"]}`]: 'c',
    [`${BODY_PARTS["Nose"]}-${BODY_PARTS["REye"]}`]: 'm',
    [`${BODY_PARTS["REye"]}-${BODY_PARTS["REar"]}`]: 'm',
    [`${BODY_PARTS["Nose"]}-${BODY_PARTS["LEye"]}`]: 'c',
    [`${BODY_PARTS["LEye"]}-${BODY_PARTS["LEar"]}`]: 'c'
};

const net = cv.readNetFromTensorflow("./graph_opt.pb");

const inWidth = 368;
const inHeight = 368;
const thr = 0.2;

const fall_model_path = "./export/fall-detection-model.json";

const loadFallModel = async () => {
    const model = await loadModel(`file://${fall_model_path}`);
    return model;
};

const runMovenet = (image) => {
    const input_details = interpreter.getInputDetails();
    const output_details = interpreter.getOutputDetails();

    const input_image = cv.imencode('.jpg', image);
    interpreter.setInput(input_image);
    interpreter.invoke();

    const keypoints_with_scores = interpreter.getOutputTensor(0).dataSync();
    const keypoints = keypoints_with_scores.slice(0, 34);

    return keypoints;
};

const poseEstimation = (frame) => {
    const frameWidth = frame.cols;
    const frameHeight = frame.rows;

    net.setInput(cv.blobFromImage(frame, 1.0, new cv.Size(inWidth, inHeight), new cv.Vec(127.5, 127.5, 127.5), true, false));
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

const predictImage = (image_path) => {
    // Load the image
    const image = cv.imread(image_path);

    const keypoints = runMovenet(image);

    // Perform fall prediction using the image
    const flattened_keypoints = keypoints.flat().join(',');
    const prediction = fall_model.predict(flattened_keypoints);

    return prediction > 0.5;
};

app.use(bodyParser.json());
app.use(express.static('static'));

router.get('/', (req, res) => {
    res.render('./fall/trained_home')
})

app.post('/upload', (req, res) => {
    try {
        const image = req.files.content;
        image.mv('in.png');

        const img = cv.imread('in.png');
        const estimated_image = poseEstimation(img);

        // Predict fall using the image
        const fall_detected = predictImage('in.png');
        console.log(fall_detected);

        cv.imwrite('out.png', estimated_image);

        res.send('ok');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/get_fall_detection_result', (req, res) => {
    res.send(fall_detection_result.toString());
});

app.get('/get', (req, res) => {
    res.sendFile('out.png', { root: __dirname });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

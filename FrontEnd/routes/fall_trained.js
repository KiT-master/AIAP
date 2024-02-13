const express = require('express');
const router = express.Router();
const fs = require('fs');
const cv = require('opencv4nodejs');
const tf = require('@tensorflow/tfjs');
const { loadGraphModel } = require('@tensorflow/tfjs-converter');
const { createCanvas, Image } = require('canvas');

let fall_detection_result = false;

const BODY_PARTS = {"Nose": 0, "Neck": 1, "RShoulder": 2, "RElbow": 3, "RWrist": 4,
              "LShoulder": 5, "LElbow": 6, "LWrist": 7, "RHip": 8, "RKnee": 9,
              "RAnkle": 10, "LHip": 11, "LKnee": 12, "LAnkle": 13, "REye": 14,
              "LEye": 15, "REar": 16, "LEar": 17};

const POSE_PAIRS = [["Neck", "RShoulder"], ["Neck", "LShoulder"], ["RShoulder", "RElbow"],
              ["RElbow", "RWrist"], ["LShoulder", "LElbow"], ["LElbow", "LWrist"],
              ["Neck", "RHip"], ["RHip", "RKnee"], ["RKnee", "RAnkle"], ["Neck", "LHip"],   
              ["LHip", "LKnee"], ["LKnee", "LAnkle"], ["Neck", "Nose"], ["Nose", "REye"],
              ["REye", "REar"], ["Nose", "LEye"], ["LEye", "LEar"]];

const EDGES = {};
              EDGES[BODY_PARTS["Nose"], BODY_PARTS["Neck"]] = 'm';
              EDGES[BODY_PARTS["Neck"], BODY_PARTS["RShoulder"]] = 'm';
              EDGES[BODY_PARTS["Neck"], BODY_PARTS["LShoulder"]] = 'c';
              EDGES[BODY_PARTS["RShoulder"], BODY_PARTS["RElbow"]] = 'm';
              EDGES[BODY_PARTS["RElbow"], BODY_PARTS["RWrist"]] = 'm';
              EDGES[BODY_PARTS["LShoulder"], BODY_PARTS["LElbow"]] = 'c';
              EDGES[BODY_PARTS["LElbow"], BODY_PARTS["LWrist"]] = 'c';
              EDGES[BODY_PARTS["Neck"], BODY_PARTS["RHip"]] = 'y';
              EDGES[BODY_PARTS["RHip"], BODY_PARTS["RKnee"]] = 'm';
              EDGES[BODY_PARTS["RKnee"], BODY_PARTS["RAnkle"]] = 'm';
              EDGES[BODY_PARTS["Neck"], BODY_PARTS["LHip"]] = 'y';
              EDGES[BODY_PARTS["LHip"], BODY_PARTS["LKnee"]] = 'c';
              EDGES[BODY_PARTS["LKnee"], BODY_PARTS["LAnkle"]] = 'c';
              EDGES[BODY_PARTS["Nose"], BODY_PARTS["REye"]] = 'm';
              EDGES[BODY_PARTS["REye"], BODY_PARTS["REar"]] = 'm';
              EDGES[BODY_PARTS["Nose"], BODY_PARTS["LEye"]] = 'c';
              EDGES[BODY_PARTS["LEye"], BODY_PARTS["LEar"]] = 'c';
              

const net = cv.readNetFromTensorflow('./graph_opt.pb');

const inWidth = 368;
const inHeight = 368;
const thr = 0.2;

const fall_model_path = "/app/export/fall-detection-model.h5";
let fall_model;
async function loadFallModel() {
    try {
        fall_model = await tf.loadLayersModel('file://' + fall_model_path);
    } catch (error) {
        console.error("Error loading fall detection model:", error);
    }
}
loadFallModel();

const interpreter = new tf.lite.Interpreter({ modelPath: "/app/3.tflite" });
interpreter.allocateTensors();

function runMovenet(image) {
    const canvas = createCanvas(192, 192);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = image;
    ctx.drawImage(img, 0, 0, 192, 192);
    const input = tf.browser.fromPixels(canvas);
    const resizedInput = tf.image.resizeBilinear(input, [192, 192]);
    const expandedInput = resizedInput.expandDims(0);
    const inputDetails = interpreter.getInputDetails();
    const outputDetails = interpreter.getOutputDetails();
    interpreter.setTensor(inputDetails[0].index, expandedInput);
    interpreter.invoke();
    const keypointsWithScores = interpreter.getTensor(outputDetails[0].index);
    const keypoints = keypointsWithScores.slice([0, 0, 0], [1, -1, 2]);
    return keypoints.arraySync()[0];
}

function drawKeypoints(frame, keypoints) {
    const shaped = keypoints.map(kp => [kp[0] * frame.cols, kp[1] * frame.rows]);
    shaped.forEach(([kx, ky]) => {
        frame.drawCircle(new cv.Point(kx, ky), 4, new cv.Vec(0, 255, 0), -1);
        frame.putText(`(${parseInt(kx)}, ${parseInt(ky)})`, new cv.Point(kx + 10, ky + 10), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Vec(255, 255, 255), 1);
    });
}

function drawConnections(frame, keypoints, edges) {
    const shaped = keypoints.map(kp => [kp[0] * frame.cols, kp[1] * frame.rows]);
    edges.forEach(([p1, p2]) => {
        const [x1, y1] = shaped[p1];
        const [x2, y2] = shaped[p2];
        frame.drawLine(new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Vec(0, 0, 255), 2);
    });
}

function poseEstimation(frame) {
    const blob = cv.blobFromImage(frame, 1.0, new cv.Size(inWidth, inHeight), new cv.Vec(127.5, 127.5, 127.5), true, false);
    net.setInput(blob);
    let out = net.forward();
    out = out.slice([0, 0, 0], [1, out.sizes[1], out.sizes[2]]);
    const points = [];
    const confidences = [];
    for (let i = 0; i < BODY_PARTS.length; i++) {
        const heatMap = out.at(0, i);
        const [_, conf, __, point] = cv.minMaxLoc(heatMap);
        const x = (frame.cols * point.x) / out.sizes[3];
        const y = (frame.rows * point.y) / out.sizes[2];
        points.push(conf > thr ? new cv.Point(x, y) : null);
        confidences.push(conf);
    }
    for (const pair of POSE_PAIRS) {
        const [partFrom, partTo] = pair;
        const idFrom = BODY_PARTS[partFrom];
        const idTo = BODY_PARTS[partTo];
        if (points[idFrom] && points[idTo]) {
            frame.drawLine(points[idFrom], points[idTo], new cv.Vec(0, 255, 0), 3);
            frame.drawEllipse(points[idFrom], new cv.Size(3, 3), 0, 0, 360, new cv.Vec(0, 0, 255), cv.FILLED);
            frame.drawEllipse(points[idTo], new cv.Size(3, 3), 0, 0, 360, new cv.Vec(0, 0, 255), cv.FILLED);
        }
    }
    return [frame, points, confidences];
}

async function predictImage(imagePath) {
    try {
        if (!fall_model) {
            console.error("Fall detection model not loaded");
            return false;
        }
        
        const image = cv.imread(imagePath);
        const keypoints = runMovenet(image);
        const flattenedKeypoints = keypoints.flat();
        const tensorInput = tf.tensor2d(flattenedKeypoints, [1, flattenedKeypoints.length]);
        const prediction = fall_model.predict(tensorInput).dataSync()[0];
        return prediction > 0.5;
    } catch (error) {
        console.error("Error predicting:", error);
        return false;
    }
}

router.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html');
});

router.use(express.static('static'));

router.post('/upload', async (req, res) => {
    try {
        const content = req.files.content;
        const imagePath = '/tmp/in.png';
        content.mv(imagePath, async (err) => {
            if (err) {
                console.error("Error saving image:", err);
                res.status(500).send("Error saving image");
            } else {
                const img = cv.imread(imagePath);
                const fallDetected = await predictImage(imagePath);
                fall_detection_result = fallDetected;
                console.log(fallDetected);
                cv.imwrite('/tmp/out.png', img);
                res.send("ok");
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error: " + error.message);
    }
});

router.get('/get_fall_detection_result', (req, res) => {
    res.send(fall_detection_result.toString());
});

router.get('/get', (req, res) => {
    res.sendFile(__dirname + '/tmp/out.png');
});

module.exports = router;
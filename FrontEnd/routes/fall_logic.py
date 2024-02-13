from flask import Flask, send_from_directory, request, send_file
import os
import cv2 as cv
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models

fall_detection_result = False

net = cv.dnn.readNetFromTensorflow(r"./graph_opt.pb")
inWidth = 368
inHeight = 368
thr = 0.2

BODY_PARTS = {"Nose": 0, "Neck": 1, "RShoulder": 2, "RElbow": 3, "RWrist": 4,
              "LShoulder": 5, "LElbow": 6, "LWrist": 7, "RHip": 8, "RKnee": 9,
              "RAnkle": 10, "LHip": 11, "LKnee": 12, "LAnkle": 13, "REye": 14,
              "LEye": 15, "REar": 16, "LEar": 17}

POSE_PAIRS = [["Neck", "RShoulder"], ["Neck", "LShoulder"], ["RShoulder", "RElbow"],
              ["RElbow", "RWrist"], ["LShoulder", "LElbow"], ["LElbow", "LWrist"],
              ["Neck", "RHip"], ["RHip", "RKnee"], ["RKnee", "RAnkle"], ["Neck", "LHip"],
              ["LHip", "LKnee"], ["LKnee", "LAnkle"], ["Neck", "Nose"], ["Nose", "REye"],
              ["REye", "REar"], ["Nose", "LEye"], ["LEye", "LEar"]]

pretrained_model = tf.keras.applications.MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))

def is_fallen(points):
    hip_point = points[BODY_PARTS["RHip"]]
    knee_point = points[BODY_PARTS["RKnee"]]
    ankle_point = points[BODY_PARTS["RAnkle"]]

    if hip_point and knee_point and ankle_point:
        # Ensure the knee and ankle are below the hip
        if knee_point[1] > hip_point[1] and ankle_point[1] > hip_point[1]:
            # Additional condition to ensure the knee is not too far forward
            if abs(knee_point[0] - hip_point[0]) < 50:
                return True

    return True

def pose_estimation(frame, args=None):
    frameWidth = frame.shape[1]
    frameHeight = frame.shape[0]

    net.setInput(cv.dnn.blobFromImage(frame, 1.0, (inWidth, inHeight), (127.5, 127.5, 127.5), swapRB=True, crop=False))
    out = net.forward()
    out = out[:, :18, :, :]

    assert (len(BODY_PARTS) == out.shape[1])

    points = []
    confidences = []

    for i in range(len(BODY_PARTS)):
        heatMap = out[0, i, :, :]

        _, conf, _, point = cv.minMaxLoc(heatMap)
        x = (frameWidth * point[0]) / out.shape[3]
        y = (frameHeight * point[1]) / out.shape[2]

        points.append((int(x), int(y)) if conf > thr else None)
        confidences.append(conf)

    for pair in POSE_PAIRS:
        partFrom = pair[0]
        partTo = pair[1]
        assert (partFrom in BODY_PARTS)
        assert (partTo in BODY_PARTS)

        idFrom = BODY_PARTS[partFrom]
        idTo = BODY_PARTS[partTo]

        if points[idFrom] and points[idTo]:
            cv.line(frame, points[idFrom], points[idTo], (0, 255, 0), 3)
            cv.ellipse(frame, points[idFrom], (3, 3), 0, 0, 360, (0, 0, 255), cv.FILLED)
            cv.ellipse(frame, points[idTo], (3, 3), 0, 0, 360, (0, 0, 255), cv.FILLED)

    t, _ = net.getPerfProfile()
    freq = cv.getTickFrequency() / 1000
    cv.putText(frame, '%.2fms' % (t / freq), (10, 20), cv.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0))

    return frame, points, confidences

app = Flask(__name__)

@app.route('/')
def homepage():
    return send_file("./fall/logic_home.handlebars")

@app.route('/<path:path>')
# Serve index.html which contains the code of webcam in Javascript
def index(path):
    return send_from_directory('static', path)

@app.route('/upload', methods=['POST'])
def upload():
    try:
        global fall_detection_result
        image = request.files.get('content')
        image.save("in.png")
        img = cv.imread("in.png")

        # Perform pose estimation on the image
        estimated_image, points, confidences = pose_estimation(img)

        # Check for fall detection
        fall_detected = is_fallen(points)
        fall_detection_result = fall_detected
        print(fall_detected)

        # Print out the coordinates of each keypoint
        for i, point in enumerate(points):
            if point is not None:
                print(f"Keypoint {i}: ({point[0]}, {point[1]})")

        cv.imwrite("out.png", estimated_image)

        return "ok"
    
    except e:
        print(e)
    
@app.route('/get_fall_detection_result', methods=['GET'])
def get_fall_detection_result():
    global fall_detection_result
    return str(fall_detection_result)

@app.route('/get', methods=['GET'])
def get():
    return send_file("./out.png")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)

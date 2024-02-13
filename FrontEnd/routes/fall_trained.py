import cv2
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.preprocessing.image import load_img

from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import os


app = Flask(__name__)

fall_detection_result = False

BODY_PARTS = {"Nose": 0, "Neck": 1, "RShoulder": 2, "RElbow": 3, "RWrist": 4,
              "LShoulder": 5, "LElbow": 6, "LWrist": 7, "RHip": 8, "RKnee": 9,
              "RAnkle": 10, "LHip": 11, "LKnee": 12, "LAnkle": 13, "REye": 14,
              "LEye": 15, "REar": 16, "LEar": 17}

POSE_PAIRS = [["Neck", "RShoulder"], ["Neck", "LShoulder"], ["RShoulder", "RElbow"],
              ["RElbow", "RWrist"], ["LShoulder", "LElbow"], ["LElbow", "LWrist"],
              ["Neck", "RHip"], ["RHip", "RKnee"], ["RKnee", "RAnkle"], ["Neck", "LHip"],   
              ["LHip", "LKnee"], ["LKnee", "LAnkle"], ["Neck", "Nose"], ["Nose", "REye"],
              ["REye", "REar"], ["Nose", "LEye"], ["LEye", "LEar"]]

EDGES = {
    (BODY_PARTS["Nose"], BODY_PARTS["Neck"]): 'm',
    (BODY_PARTS["Neck"], BODY_PARTS["RShoulder"]): 'm',
    (BODY_PARTS["Neck"], BODY_PARTS["LShoulder"]): 'c',
    (BODY_PARTS["RShoulder"], BODY_PARTS["RElbow"]): 'm',
    (BODY_PARTS["RElbow"], BODY_PARTS["RWrist"]): 'm',
    (BODY_PARTS["LShoulder"], BODY_PARTS["LElbow"]): 'c',
    (BODY_PARTS["LElbow"], BODY_PARTS["LWrist"]): 'c',
    (BODY_PARTS["Neck"], BODY_PARTS["RHip"]): 'y',
    (BODY_PARTS["RHip"], BODY_PARTS["RKnee"]): 'm',
    (BODY_PARTS["RKnee"], BODY_PARTS["RAnkle"]): 'm',
    (BODY_PARTS["Neck"], BODY_PARTS["LHip"]): 'y',
    (BODY_PARTS["LHip"], BODY_PARTS["LKnee"]): 'c',
    (BODY_PARTS["LKnee"], BODY_PARTS["LAnkle"]): 'c',
    (BODY_PARTS["Nose"], BODY_PARTS["REye"]): 'm',
    (BODY_PARTS["REye"], BODY_PARTS["REar"]): 'm',
    (BODY_PARTS["Nose"], BODY_PARTS["LEye"]): 'c',
    (BODY_PARTS["LEye"], BODY_PARTS["LEar"]): 'c',
}
net = cv2.dnn.readNetFromTensorflow(r"./graph_opt.pb")

inWidth = 368
inHeight = 368
thr = 0.2

fall_model_path = "C:\Users\user\Downloads\send\export\fall-detection-model.h5"
fall_model = load_model(fall_model_path)

# Load the MoveNet interpreter
interpreter = tf.lite.Interpreter(model_path="3.tflite")
interpreter.allocate_tensors()

def run_movenet(image):
    # Run MoveNet model to detect keypoints
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Preprocess the image
    input_image = cv2.resize(image, (192, 192))  # Resize image to match model input size
    input_image = np.expand_dims(input_image, axis=0)  # Add batch dimension
    input_image = tf.cast(input_image, dtype=tf.float32)

    # Set input tensor
    interpreter.set_tensor(input_details[0]['index'], input_image)
    interpreter.invoke()

    # Get the keypoints from the interpreter
    keypoints_with_scores = interpreter.get_tensor(output_details[0]['index'])
    
    # Extract only the (x, y) coordinates of each keypoint
    keypoints = keypoints_with_scores[0][:, :, :2]  # Extract (x, y) coordinates, ignore the confidence scores
    
    return keypoints

def draw_keypoints(frame, keypoints):
    y, x, c = frame.shape
    shaped = np.squeeze(np.multiply(keypoints, [[y, x]]))
    
    for kp in shaped:
        ky, kx = kp
        # Draw the keypoint
        cv2.circle(frame, (int(kx), int(ky)), 4, (0, 255, 0), -1) 
        # Display coordinates next to the keypoint
        text = f"({int(kx)}, {int(ky)})"
        cv2.putText(frame, text, (int(kx) + 10, int(ky) + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
def draw_connections(frame, keypoints, edges):
    y, x, c = frame.shape
    shaped = np.squeeze(np.multiply(keypoints, [[y, x]]))
    
    for edge, color in edges.items():
        p1, p2 = edge
        y1, x1 = shaped[p1]
        y2, x2 = shaped[p2]
        
        cv2.line(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 2)

def pose_estimation(frame, args=None):
    frameWidth = frame.shape[1]
    frameHeight = frame.shape[0]

    net.setInput(cv2.dnn.blobFromImage(frame, 1.0, (inWidth, inHeight), (127.5, 127.5, 127.5), swapRB=True, crop=False))
    out = net.forward()
    out = out[:, :18, :, :]

    assert (len(BODY_PARTS) == out.shape[1])

    points = []
    confidences = []

    for i in range(len(BODY_PARTS)):
        heatMap = out[0, i, :, :]

        _, conf, _, point = cv2.minMaxLoc(heatMap)
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
            cv2.line(frame, points[idFrom], points[idTo], (0, 255, 0), 3)
            cv2.ellipse(frame, points[idFrom], (3, 3), 0, 0, 360, (0, 0, 255), cv2.FILLED)
            cv2.ellipse(frame, points[idTo], (3, 3), 0, 0, 360, (0, 0, 255), cv2.FILLED)

    t, _ = net.getPerfProfile()
    freq = cv2.getTickFrequency() / 1000
    cv2.putText(frame, '%.2fms' % (t / freq), (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0))

    return frame, points, confidences

def predict_image(image_path):
    # Load the image
    image = cv2.imread(image_path)
    
    keypoints = run_movenet(image)
    
    flattened_keypoints = keypoints.flatten().reshape(1, -1)
    prediction = fall_model.predict(flattened_keypoints)

    if prediction> 0.5:
      return True
    else:
      return False

@app.route('/')
def homepage():
    return send_file("./fall/trained_home.handlebars")

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
        img = cv2.imread("in.png")

        estimated_image, points, confidences = pose_estimation(img)

        # Predict fall using the image
        fall_detected = predict_image("in.png")
        fall_detection_result = fall_detected
        print(fall_detected)

        cv2.imwrite("out.png", estimated_image)

        return "ok"
    
    except Exception as e:
        print(e)

@app.route('/get_fall_detection_result', methods=['GET'])
def get_fall_detection_result():
    global fall_detection_result
    return str(fall_detection_result)

@app.route('/get', methods=['GET'])
def get():
    return send_file("./out.png")

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=5000)
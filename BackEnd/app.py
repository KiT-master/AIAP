from flask import Flask
from flask import jsonify
from flask import request
from transformers import pipeline
import torch
from flask import Flask, jsonify, Response, request
from PIL import Image
import urllib.request
import torchvision.transforms as transforms
from torchvision.transforms import Resize
import cv2
import pandas

app = Flask(__name__)
saved_model = pipeline('text-classification',model = './checkpoint-5154')
# Load custom model
model = torch.hub.load('ultralytics/yolov5', 'custom', path='models/best.pt', force_reload=False)
desired_size = (640, 640)


@app.route("/" , methods=["POST"])
def hello():
    class_lables = {"LABEL_1": "positive","LABEL_0":"negative","LABEL_2":"neutral"}

    input = request.get_json()
    print(input["Message"])
    predictions = saved_model(input["Message"])[0]
    print(predictions)
    predictions['label'] = class_lables[predictions['label']]
    return predictions

@app.route('/predictmeds', methods=['POST'])
def predictmeds():
    print("Hrllo!")
    input = request.get_json()
    # file = request.files['file']
    urllib.request.urlretrieve(input["file_url"], "file_name")
    # url = input["file_url"]
    img = Image.open("file_name")  # PIL image
    resize = Resize(desired_size)
    img = resize(img)

    print(img)
    preds = model(img, size=640)  # Pass the image to the model
    print(preds.pandas().xyxy[0]['name'])
    output = preds.pandas().xyxy[0]['name']
    output_list = output.tolist()

    return output_list


if __name__ == "__main__":
    app.run(debug=False)



from flask import Flask
from flask import jsonify
from flask import request
from transformers import pipeline

app = Flask(__name__)
saved_model = pipeline('text-classification',model = './checkpoint-5154')


@app.route("/" , methods=["POST"])
def hello():
    class_lables = {"LABEL_1": "positive","LABEL_0":"negative","LABEL_2":"neutral"}

    input = request.get_json()
    print(input["Message"])
    predictions = saved_model(input["Message"])[0]
    print(predictions)
    predictions['label'] = class_lables[predictions['label']]
    return predictions

if __name__ == "__main__":
    app.run(debug=False)



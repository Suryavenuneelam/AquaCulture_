from flask import Flask, request, jsonify
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load the dataset
data = pd.read_csv('aquaculture_combined.csv')

# Define feature columns based on your dataset
feature_columns = [
    'pH', 'CO3', 'Salinity', 'HCO3', 'Alkalinity', 'Hardness', 'Ca:Mg Ratio', 'Dissolved Oxygen'
]

# Preprocess the data
X = data[feature_columns]
Y = data['Suitable']

# Train-test split
X_train, X_test, Y_train, Y_test = train_test_split(X, Y, train_size=0.7, random_state=2529)

# Train the model
model = RandomForestClassifier(random_state=2529, class_weight='balanced')
model.fit(X_train, Y_train)

# Evaluate the model and print accuracy
Y_pred = model.predict(X_test)
accuracy = accuracy_score(Y_test, Y_pred)
print(f"Model Accuracy: {accuracy:.4f}")

@app.route('/predict', methods=['POST'])
def predict():
    input_data = request.json
    
    # Extract features from JSON input
    try:
        features = [
            input_data['pH'],
            input_data['CO3'],
            input_data['Salinity'],
            input_data['HCO3'],
            input_data['Alkalinity'],
            input_data['Hardness'],
            input_data['Ca:Mg Ratio'],
            input_data['Dissolved Oxygen']
        ]
    except KeyError as e:
        return jsonify({'error': f'Missing feature: {str(e)}'}), 400

    # Predict using the model
    prediction = model.predict([features])

    return jsonify({'prediction': int(prediction[0])})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)


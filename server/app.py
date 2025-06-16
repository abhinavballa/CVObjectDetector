from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import base64
import cv2
import numpy as np
import sys
sys.path.append('..')
from detect import FaceVerifier
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Initialize face verifier
verifier = FaceVerifier()

@app.route('/setup-face', methods=['POST'])
def setup_face():
    try:
        data = request.json
        image_data = data['image']
        
        # Convert base64 image to OpenCV format
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Save image temporarily
        temp_path = 'temp_face.jpg'
        cv2.imwrite(temp_path, image)
        
        # Set up reference face
        success = verifier.save_reference_face(temp_path)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if success:
            # Update last modified time
            with open('reference_face.jpg', 'a'):
                os.utime('reference_face.jpg', None)
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'No face detected in image'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/verify-face', methods=['POST'])
def verify_face():
    try:
        data = request.json
        image_data = data['image']
        
        # Convert base64 image to OpenCV format
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Verify face
        is_verified, message = verifier.verify_face(image)
        
        return jsonify({
            'success': True,
            'verified': is_verified,
            'message': message
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/get-reference-info', methods=['GET'])
def get_reference_info():
    try:
        if not os.path.exists('reference_face.jpg'):
            return jsonify({
                'success': True,
                'has_reference': False
            })
        
        # Get last modified time
        last_modified = os.path.getmtime('reference_face.jpg')
        last_modified_date = datetime.fromtimestamp(last_modified).strftime('%Y-%m-%d %H:%M:%S')
        
        # Convert image to base64
        with open('reference_face.jpg', 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'has_reference': True,
            'last_modified': last_modified_date,
            'image': f'data:image/jpeg;base64,{img_data}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/delete-reference', methods=['POST'])
def delete_reference():
    try:
        if os.path.exists('reference_face.jpg'):
            os.remove('reference_face.jpg')
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'No reference face found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/setup', methods=['POST'])
def setup_reference():
    try:
        data = request.json
        image_data = data['image']
        filename = data.get('filename', 'reference_face.jpg')
        # Convert base64 image to OpenCV format
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        # Save the image
        cv2.imwrite(filename, image)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/reference', methods=['GET'])
def list_references():
    try:
        files = [f for f in os.listdir('.') if f.startswith('reference_') and f.endswith('.jpg')]
        references = [{'filename': f} for f in files]
        return jsonify({'references': references})
    except Exception as e:
        return jsonify({'references': []})

@app.route('/reference/<filename>', methods=['GET', 'DELETE'])
def handle_reference(filename):
    if request.method == 'GET':
        return send_file(filename, mimetype='image/jpeg')
    elif request.method == 'DELETE':
        try:
            os.remove(filename)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(port=5000) 
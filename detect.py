import cv2
import matplotlib.pyplot as plt
import face_recognition
import numpy as np
import os
import json

class FaceVerifier:
    def __init__(self):
        self.face_classifier = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self.reference_face_encoding = None
        self.reference_face_path = "reference_face.jpg"
        self.verification_threshold = 0.6  # Adjust this threshold as needed
        
    def save_reference_face(self, image_path=None):
        """Save a reference face either from a file or captured from camera"""
        if image_path:
            # Load from file
            image = cv2.imread(image_path)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            # Capture from camera with continuous preview
            cap = cv2.VideoCapture(0)
            face_detected = False
            
            while not face_detected:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                # Convert frame to RGB for face detection
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Detect faces
                face_locations = face_recognition.face_locations(rgb_frame)
                
                # Draw rectangle around face if detected
                if face_locations:
                    for (top, right, bottom, left) in face_locations:
                        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    cv2.putText(frame, "Press SPACE to capture", (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                else:
                    cv2.putText(frame, "No face detected", (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                
                cv2.imshow("Capture Reference Face", frame)
                
                # Wait for space key to capture
                key = cv2.waitKey(1) & 0xFF
                if key == 32:  # Space key
                    if face_locations:
                        image = rgb_frame
                        face_detected = True
                    else:
                        cv2.putText(frame, "No face detected!", (10, 60), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                        cv2.imshow("Capture Reference Face", frame)
                        cv2.waitKey(1000)  # Show message for 1 second
            
            cap.release()
            cv2.destroyAllWindows()
            
            if not face_detected:
                return False
        
        # Detect face and get encoding
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return False
            
        face_encoding = face_recognition.face_encodings(image, face_locations)[0]
        self.reference_face_encoding = face_encoding
        
        # Save the reference image
        cv2.imwrite(self.reference_face_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        return True

    def verify_face(self, frame):
        """Verify if the face in the frame matches the reference face"""
        if self.reference_face_encoding is None:
            return False, "No reference face set"
            
        # Convert frame to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_frame)
        if not face_locations:
            return False, "No face detected"
            
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        # Compare with reference face
        for face_encoding in face_encodings:
            match = face_recognition.compare_faces([self.reference_face_encoding], face_encoding, tolerance=self.verification_threshold)[0]
            if match:
                return True, "Face verified"
                
        return False, "Face not verified"

    def verify_real_time(self):
        """Real-time face verification"""
        if self.reference_face_encoding is None:
            print("Please set a reference face first")
            return
            
        video_capture = cv2.VideoCapture(0)
        
        while True:
            result, frame = video_capture.read()
            if not result:
                break
                
            # Detect faces for visualization
            gray_image = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_classifier.detectMultiScale(gray_image, 1.1, 5, minSize=(40, 40))
            
            # Verify face
            is_verified, message = self.verify_face(frame)
            
            # Draw rectangles and status
            for (x, y, w, h) in faces:
                color = (0, 255, 0) if is_verified else (0, 0, 255)
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 4)
            
            # Add status text
            cv2.putText(frame, message, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0) if is_verified else (0, 0, 255), 2)
            
            cv2.imshow("Face Verification", frame)
            
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
                
        video_capture.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    verifier = FaceVerifier()
    
    # To set up reference face from camera
    print("Setting up reference face...")
    if verifier.save_reference_face():
        print("Reference face saved successfully!")
        print("Starting verification...")
        verifier.verify_real_time()
    else:
        print("Failed to capture reference face")

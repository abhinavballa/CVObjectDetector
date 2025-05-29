import cv2
import matplotlib.pyplot as plt

def detect_image_static(img_path):

    #upload image for initial detection on static image
    image = cv2.imread(img_path)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_classifier = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    face = face_classifier.detectMultiScale(gray_image, scaleFactor= 1.1, minNeighbors=5, minSize=(40, 40))
    for (x, y, w, h) in face:
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 4)
    new_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    plt.figure(figsize=(20,10))
    plt.imshow(new_img)
    plt.axis('off')
    plt.show()

def detect_real_time():
    face_classifier = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    video_capture = cv2.VideoCapture(0)
    def detect_bounding_box(vid):
        gray_image = cv2.cvtColor(vid, cv2.COLOR_BGR2GRAY)
        faces = face_classifier.detectMultiScale(gray_image, 1.1, 5, minSize=(40, 40))
        for (x, y, w, h) in faces:
            cv2.rectangle(vid, (x, y), (x + w, y + h), (0, 255, 0), 4)
        return faces
    
    while True:

        result, video_frame = video_capture.read()  #read frames from the video
        if result is False:
            break 
        faces = detect_bounding_box(
            video_frame
        )

        cv2.imshow(
            "My Face Detection Project", video_frame
        )  # display frame

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    video_capture.release()
    cv2.destroyAllWindows()

    

#detect_image_static('head.jpeg')
detect_real_time()
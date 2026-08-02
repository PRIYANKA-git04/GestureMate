import threading
import time
from pathlib import Path
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from gesture_utils import INDEX_TIP, cursor_smoother, detect_gesture

# ------------------------- HAND CONNECTIONS -------------------------

HAND_CONNECTIONS = [

    # Thumb
    (0, 1), (1, 2), (2, 3), (3, 4),

    # Index finger
    (0, 5), (5, 6), (6, 7), (7, 8),

    # Middle finger
    (5, 9), (9, 10), (10, 11), (11, 12),

    # Ring finger
    (9, 13), (13, 14), (14, 15), (15, 16),

    # Little finger
    (13, 17), (17, 18), (18, 19), (19, 20),

    # Palm
    (0, 17)
]


# ------------------------- GESTURE CONTROLLER -------------------------

class GestureController:

    def __init__(self):

        self.camera = None
        self.landmarker = None

        self.camera_running = False
        self.hand_detected = False

        self.current_gesture = "NONE"
        self.cursor_x = None
        self.cursor_y = None

        self.last_timestamp = 0

        self.state_lock = threading.Lock()
        self.camera_lock = threading.Lock()

        self.model_path = self.find_model_file()

    # ------------------------- FIND MODEL -------------------------

    def find_model_file(self):

        main_folder = Path(__file__).resolve().parent

        possible_names = [ "hand_landmarker.task"]

        for file_name in possible_names:

            model_path = main_folder / file_name

            if model_path.exists():
                return model_path

        return main_folder / "hand_landmarker.task"

    # ------------------------- CREATE LANDMARKER -------------------------

    def create_landmarker(self):

        if not self.model_path.exists():

            raise FileNotFoundError(
                f"Model file not found: {self.model_path.name}"
            )

        base_options = python.BaseOptions(
            model_asset_path=str(self.model_path)
        )

        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )

        self.landmarker = (
            vision.HandLandmarker.create_from_options(options)
        )

    # ------------------------- START CAMERA -------------------------

    def start_camera(self):

        with self.camera_lock:

            if self.camera_running:

                return {
                    "success": True,
                    "message": "Camera is already running."
                }

            try:

                if self.landmarker is None:
                    self.create_landmarker()

                self.camera = cv2.VideoCapture(0)

                self.camera.set( cv2.CAP_PROP_FRAME_WIDTH,640)

                self.camera.set( cv2.CAP_PROP_FRAME_HEIGHT,480)

                if not self.camera.isOpened():

                    self.camera.release()
                    self.camera = None

                    return {
                        "success": False,
                        "message": "Unable to open the webcam."
                    }

                self.camera_running = True
                self.last_timestamp = 0

                cursor_smoother.reset()
                self.clear_detection()

                return {
                    "success": True,
                    "message": "Camera started successfully."
                }

            except Exception as error:

                self.camera_running = False

                return {
                    "success": False,
                    "message": str(error)
                }

    # ------------------------- STOP CAMERA -------------------------

    def stop_camera(self):

        with self.camera_lock:

            self.camera_running = False

            if self.camera is not None:

                self.camera.release()
                self.camera = None

            cursor_smoother.reset()
            self._clear_detection()

            return {
                "success": True,
                "message": "Camera stopped successfully."
            }

    # ------------------------- PROCESS FRAME -------------------------

    def process_frame(self, frame):

        frame = cv2.flip(frame, 1)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        media_pipe_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        timestamp = int(time.monotonic() * 1000)

        # VIDEO mode requires continuously increasing timestamps

        if timestamp <= self.last_timestamp:
            timestamp = self.last_timestamp + 1

        self.last_timestamp = timestamp

        result = self.landmarker.detect_for_video(
            media_pipe_image,
            timestamp
        )

        if not result.hand_landmarks:

            self.clear_detection()

            return frame

        handedness = result.handedness[0][0].category_name

        if handedness.lower() != "left":

            self.clear_detection()

            return frame

        landmarks = result.hand_landmarks[0]

        gesture = detect_gesture(landmarks)

        index_tip = landmarks[INDEX_TIP]

        smooth_x, smooth_y = cursor_smoother.update( index_tip.x, index_tip.y)

        with self.state_lock:

            self.hand_detected = True
            self.current_gesture = gesture

            if gesture == "POINT" or self.cursor_x is None:

                self.cursor_x = max( 0.0, min(1.0, (smooth_x - 0.25) / 0.40))

                self.cursor_y  = max( 0.0, min(1.0, (smooth_y - 0.30) / 0.35))

        self.draw_landmarks( frame, landmarks)

        return frame

    # ------------------------- DRAW LANDMARKS -------------------------

    def draw_landmarks(self, frame, landmarks):

        frame_height, frame_width, _ = frame.shape

        points = []

        for landmark in landmarks:

            x = int(landmark.x * frame_width)
            y = int(landmark.y * frame_height)

            points.append((x, y))

        # Drawing hand connections

        for start, end in HAND_CONNECTIONS:

            cv2.line( frame, points[start], points[end], (0, 200, 0), 2)

        # Draw all 21 landmarks

        for point in points:

            cv2.circle( frame, point, 5, (0, 255, 0), -1)

            cv2.circle(frame, point, 7, (0, 90, 0), 1)

    # ------------------------- VIDEO STREAM -------------------------

    def generate_frames(self):

        while self.camera_running:

            if self.camera is None:
                break

            success, frame = self.camera.read()

            if not success:
                break

            try:

                processed_frame = self.process_frame(frame)

            except Exception as error:

                print("Frame processing error:", error)

                processed_frame = frame

                self.clear_detection()

            encoded, buffer = cv2.imencode( ".jpg", processed_frame)

            if not encoded:
                continue

            frame_bytes = buffer.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )

        self.clear_detection()

    # ------------------------- GESTURE DATA -------------------------

    def get_gesture_data(self):

        with self.state_lock:

            return {
                "camera_running": self.camera_running,
                "hand_detected": self.hand_detected,
                "gesture": self.current_gesture,
                "x": self.cursor_x,
                "y": self.cursor_y
            }

    # ------------------------- CLEAR DETECTION -------------------------

    def clear_detection(self):

        with self.state_lock:

            self.hand_detected = False
            self.current_gesture = "NONE"

            self.cursor_x = None
            self.cursor_y = None



gesture_controller = GestureController()

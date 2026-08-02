import math
# ------------------------- LANDMARK NUMBERS -------------------------
THUMB_TIP = 4
INDEX_PIP = 6
INDEX_TIP = 8
MIDDLE_PIP = 10
MIDDLE_TIP = 12
RING_PIP = 14
RING_TIP = 16
LITTLE_PIP = 18
LITTLE_TIP = 20
WRIST = 0
MIDDLE_MCP = 9

# ------------------------- DISTANCE CALCULATION -------------------------

def landmark_distance(first_landmark, second_landmark):

    return math.sqrt(
        (first_landmark.x - second_landmark.x) ** 2 + (first_landmark.y - second_landmark.y) ** 2)


# ------------------------- FINGER POSITION -------------------------

def finger_is_up(landmarks, tip_number, pip_number):

    return ( landmarks[tip_number].y < landmarks[pip_number].y)


def finger_is_folded(landmarks, tip_number, pip_number):

    return (landmarks[tip_number].y > landmarks[pip_number].y)


# ------------------------- PINCH DETECTION -------------------------

def is_pinching(landmarks, threshold=0.32):

    thumb_index_distance = landmark_distance( landmarks[THUMB_TIP], landmarks[INDEX_TIP])

    palm_size = landmark_distance( landmarks[WRIST], landmarks[MIDDLE_MCP])

    if palm_size == 0:
        return False

    pinch_ratio = thumb_index_distance / palm_size

    return pinch_ratio < threshold


# ------------------------- POINT DETECTION -------------------------

def is_pointing(landmarks):

    index_up = finger_is_up( landmarks, INDEX_TIP, INDEX_PIP)

    middle_folded = finger_is_folded(landmarks, MIDDLE_TIP, MIDDLE_PIP)

    ring_folded = finger_is_folded( landmarks, RING_TIP, RING_PIP)

    little_folded = finger_is_folded( landmarks, LITTLE_TIP, LITTLE_PIP)

    return ( index_up and middle_folded and ring_folded and little_folded)


# ------------------------- GESTURE DETECTION -------------------------

def detect_gesture(landmarks):

    if not landmarks or len(landmarks) < 21:
        return "NONE"

    if is_pinching(landmarks):
        return "PINCH"

    if is_pointing(landmarks):
        return "POINT"

    return "NONE"


# ------------------------- CURSOR SMOOTHING -------------------------

class CursorSmoother:

    def __init__(self, smoothing=0.20):

        self.smoothing = smoothing

        self.previous_x = None
        self.previous_y = None

    def update(self, x, y):

        if self.previous_x is None:

            self.previous_x = x
            self.previous_y = y

            return x, y

        smooth_x = ( self.smoothing * x + (1 - self.smoothing) * self.previous_x)

        smooth_y = ( self.smoothing * y + (1 - self.smoothing) * self.previous_y)

        self.previous_x = smooth_x
        self.previous_y = smooth_y

        return smooth_x, smooth_y

    def reset(self):

        self.previous_x = None
        self.previous_y = None


cursor_smoother = CursorSmoother()
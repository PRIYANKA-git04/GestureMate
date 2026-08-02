# GestureMate – Gesture-Controlled Chess Controller

GestureMate is a touch-free chess web application that allows users to control a virtual chessboard using hand gestures captured through a webcam.

The project uses MediaPipe for hand tracking, OpenCV for real-time camera processing, Flask for the backend, and python-chess for chess rules and move validation.

## Technologies Used

- Python
- Flask
- OpenCV
- MediaPipe
- python-chess
- HTML5
- CSS3
- JavaScript
- Jinja2

## Key Features

- Real-time webcam-based hand tracking.
- Virtual cursor controlled using the index finger.
- Pinch gesture for selecting and moving chess pieces.
- Touch-free chessboard interaction.
- Automatic validation of legal and illegal chess moves.
- White and Black turn management.
- Check, checkmate, stalemate and draw detection.
- Pawn promotion with multiple piece choices.
- Start, restart, start-camera and stop-camera controls.

## Gesture Controls

| Gesture | Action |
|---|---|
| Point with the index finger | Move the virtual cursor across the chessboard |
| Pinch the thumb and index finger | Select a piece or confirm its destination square |

The application is configured to use the right hand. Unsupported hand poses are displayed as `NONE`.

## Project Structure

```text
GestureMate/
│
├── app.py
├── chess_game.py
├── gesture_controller.py
├── gesture_utils.py
├── hand_landmarker.task
├── requirements.txt
├── README.md
├── .gitignore
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   ├── images/
│   │   └── chess-hero.png
│   │
│   └── js/
│       └── game.js
│
└── templates/
    ├── base.html
    ├── contact.html
    ├── game.html
    └── index.html
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/PRIYANKA-git04/GestureMate.git
cd GestureMate
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

### 3. Install the dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the application

```bash
python app.py
```

### 5. Open the website

Open the following address in your browser:

```text
http://127.0.0.1:5000
```



## Important Notes

- Make sure `hand_landmarker.task` is present in the main project folder.
- Allow camera access when prompted.
- Close other applications that may be using the webcam.
- Use the application in a well-lit environment.
- Keep your complete hand visible inside the camera frame.

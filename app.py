from flask import Flask, Response, jsonify, render_template, request
from gesture_controller import gesture_controller
from chess_game import chess_game

app = Flask(__name__)

@app.route("/")
def home():

    return render_template("index.html")


@app.route("/game")
def game():

    return render_template("game.html")


@app.route("/contact", methods=["GET", "POST"])
def contact():

    message = None

    if request.method == "POST":

        message = (
            "Thank you for contacting us! "
            "Your message has been received."
        )

    return render_template(
        "contact.html",
        message=message
    )


# ------------------------- GET GAME STATE -------------------------

@app.route("/api/game/state", methods=["GET"])
def game_state():

    return jsonify(chess_game.get_state())


# ------------------------- START GAME -------------------------

@app.route("/api/game/start", methods=["POST"])
def start_game():

    result = chess_game.start_game()

    return jsonify(result)


# ------------------------- RESTART GAME -------------------------

@app.route("/api/game/restart", methods=["POST"])
def restart_game():

    result = chess_game.restart_game()

    return jsonify(result)


# ------------------------- MAKE CHESS MOVE -------------------------

@app.route("/api/game/move", methods=["POST"])
def make_move():

    data = request.get_json(silent=True) or {}

    from_square = data.get("from_square")
    to_square = data.get("to_square")
    promotion = data.get("promotion")

    if not from_square or not to_square:

        return jsonify({
            "success": False,
            "message": (
                "Starting and destination squares are required."
            )
        }), 400

    result = chess_game.make_move(
        from_square=from_square,
        to_square=to_square,
        promotion=promotion
    )

    return jsonify(result)

# ------------------------- START CAMERA -------------------------

@app.route("/api/camera/start", methods=["POST"])
def start_camera():

    result = gesture_controller.start_camera()

    return jsonify(result)


# ------------------------- STOP CAMERA -------------------------

@app.route("/api/camera/stop", methods=["POST"])
def stop_camera():

    result = gesture_controller.stop_camera()

    return jsonify(result)


# ------------------------- VIDEO STREAM -------------------------

@app.route("/video-feed")
def video_feed():

    if not gesture_controller.camera_running:

        return jsonify({
            "success": False,
            "message": "Camera is not running."
        }), 400

    return Response(
        gesture_controller.generate_frames(),
        mimetype=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        )
    )


# ------------------------- GESTURE INFORMATION -------------------------

@app.route("/api/gesture")
def gesture_data():

    return jsonify(
        gesture_controller.get_gesture_data()
    )

if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False
    )
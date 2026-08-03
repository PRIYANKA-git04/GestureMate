import chess
from threading import Lock


class ChessGame:

    def __init__(self):

        self.board = chess.Board()
        self.started = False
        self.lock = Lock()

    # ------------------------- START GAME -------------------------

    def start_game(self):

        with self.lock:

            self.board.reset()
            self.started = True

            return {
                "success": True,
                "message": "Game started.",
                **self.create_state()
            }

    # ------------------------- RESTART GAME -------------------------

    def restart_game(self):

        with self.lock:

            self.board.reset()
            self.started = True

            return {
                "success": True,
                "message": "Game restarted.",
                **self.create_state()
            }

    # ------------------------- MAKE MOVE -------------------------

    def make_move(
        self,
        from_square,
        to_square,
        promotion=None
    ):

        with self.lock:

            if not self.started:

                return {
                    "success": False,
                    "message": "Start the game before making a move.",
                    **self.create_state()
                }

            if self.board.is_game_over(claim_draw=True):

                return {
                    "success": False,
                    "message": "The game has already ended.",
                    **self.create_state()
                }

            # Validate square names

            try:

                start = chess.parse_square(from_square)
                destination = chess.parse_square(to_square)

            except (ValueError, TypeError):

                return {
                    "success": False,
                    "message": "Invalid chessboard square.",
                    **self.create_state()
                }

            piece = self.board.piece_at(start)

            # Check whether a piece exists

            if piece is None:

                return {
                    "success": False,
                    "message": (
                        "No chess piece exists on the selected square."
                    ),
                    **self.create_state()
                }

            # Check whether the correct player selected the piece

            if piece.color != self.board.turn:

                current_player = (
                    "White" if self.board.turn else "Black"
                )

                return {
                    "success": False,
                    "message": f"It is {current_player}'s turn.",
                    **self.create_state()
                }

            promotion_piece = None

            # Check whether pawn promotion is required

            if (
                piece.piece_type == chess.PAWN
                and chess.square_rank(destination) in (0, 7)
            ):

                if promotion is None:

                    return {
                        "success": False,
                        "promotion_required": True,
                        "from_square": from_square,
                        "to_square": to_square,
                        "promotion_choices": [
                            "queen",
                            "rook",
                            "bishop",
                            "knight"
                        ],
                        "message": "Select a piece for pawn promotion.",
                        **self.create_state()
                    }

                promotion_pieces = {
                    "queen": chess.QUEEN,
                    "rook": chess.ROOK,
                    "bishop": chess.BISHOP,
                    "knight": chess.KNIGHT
                }

                promotion_piece = promotion_pieces.get(
                    str(promotion).lower()
                )

                if promotion_piece is None:

                    return {
                        "success": False,
                        "message": "Invalid promotion choice.",
                        **self.create_state()
                    }

            move = chess.Move(
                start,
                destination,
                promotion=promotion_piece
            )

            # Disable en passant

            if self.board.is_en_passant(move):

                return {
                    "success": False,
                    "message": "En passant is disabled in this game.",
                    **self.create_state()
                }

            # Validate the move

            if move not in self.board.legal_moves:

                return {
                    "success": False,
                    "message": (
                        "Invalid move. Select a legal destination."
                    ),
                    **self.create_state()
                }

            self.board.push(move)

            return {
                "success": True,
                "message": "Move completed successfully.",
                "last_move": {
                    "from": from_square,
                    "to": to_square
                },
                **self.create_state()
            }

    # ------------------------- GET GAME STATE -------------------------

    def get_state(self):

        with self.lock:

            return self.create_state()

    # ------------------------- CREATE GAME STATE -------------------------

    def create_state(self):

        pieces = {}

        for square, piece in self.board.piece_map().items():

            square_name = chess.square_name(square)

            pieces[square_name] = {
                "symbol": piece.unicode_symbol(),
                "colour": (
                    "white" if piece.color else "black"
                ),
                "type": chess.piece_name(piece.piece_type)
            }

        current_turn = (
            "White" if self.board.turn else "Black"
        )

        return {
            "started": self.started,
            "pieces": pieces,
            "turn": current_turn,
            "status": self.get_status(),
            "game_over": self.board.is_game_over(
                claim_draw=True
            )
        }

    # ------------------------- GAME STATUS -------------------------

    def get_status(self):

        if not self.started:

            return "Press Start Game"

        if self.board.is_checkmate():

            winner = (
                "Black" if self.board.turn
                else "White"
            )

            return f"Checkmate! {winner} wins."

        if self.board.is_stalemate():

            return "Game drawn by stalemate."

        if self.board.is_insufficient_material():

            return "Game drawn due to insufficient material."

        if self.board.is_fivefold_repetition():

            return "Game drawn by fivefold repetition."

        if self.board.is_seventyfive_moves():

            return (
                "Game drawn by the seventy-five-move rule."
            )

        if self.board.can_claim_threefold_repetition():

            return (
                "A draw can be claimed by threefold repetition."
            )

        if self.board.can_claim_fifty_moves():

            return (
                "A draw can be claimed by the fifty-move rule."
            )

        current_turn = (
            "White" if self.board.turn else "Black"
        )

        if self.board.is_check():

            return f"{current_turn} is in check."

        return f"{current_turn} to move."


chess_game = ChessGame()

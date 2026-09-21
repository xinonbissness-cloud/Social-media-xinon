from datetime import datetime
from flask import Blueprint, request, jsonify
from models.user import db, User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    required = ["name", "birthday", "gender", "username", "email", "password"]
    if any(not str(data.get(k, "")).strip() for k in required):
        return jsonify({"error": "All fields are required."}), 400
    try:
        birthday = datetime.strptime(str(data["birthday"]), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid birthday format."}), 400
    if User.query.filter_by(email=str(data["email"]).strip().lower()).first():
        return jsonify({"error": "Email already exists."}), 409
    if User.query.filter_by(username=str(data["username"]).strip()).first():
        return jsonify({"error": "Username already exists."}), 409
    user = User(
        name=str(data["name"]).strip(), birthday=birthday, gender=str(data["gender"]).strip(),
        username=str(data["username"]).strip(), email=str(data["email"]).strip().lower(),
        email_verified=False, verification_code=None, verification_expires_at=None
    )
    user.set_password(str(data["password"]))
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Account created successfully!", "user_id": user.id}), 201

@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    return jsonify({"error": "Email verification is currently disabled."}), 503

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401
    return jsonify({"message": "Login successful!", "user_id": user.id}), 200

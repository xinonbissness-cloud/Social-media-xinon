from datetime import datetime

from flask import Blueprint, request, jsonify

from models.user import db, User


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    birthday_text = data.get("birthday")
    gender = data.get("gender")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([
        name,
        birthday_text,
        gender,
        username,
        email,
        password
    ]):
        return jsonify({
            "error": "All fields are required"
        }), 400

    try:
        birthday = datetime.strptime(
            birthday_text,
            "%Y-%m-%d"
        ).date()
    except ValueError:
        return jsonify({
            "error": "Birthday must use YYYY-MM-DD format"
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "Email already exists"
        }), 409

    if User.query.filter_by(username=username).first():
        return jsonify({
            "error": "Username already exists"
        }), 409

    user = User(
        name=name,
        birthday=birthday,
        gender=gender,
        username=username,
        email=email
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Account created successfully",
        "user_id": user.id
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    return jsonify({
        "message": "Login successful",
        "user_id": user.id
    }), 200

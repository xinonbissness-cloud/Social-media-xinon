from datetime import datetime

from flask import Blueprint, request, jsonify

from models.user import db, User


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    print("REGISTER ROUTE HIT", flush=True)

    data = request.get_json(silent=True) or {}

    name = data.get("name")
    birthday_text = data.get("birthday")
    gender = data.get("gender")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    print("REGISTER DATA RECEIVED", flush=True)

    if not all([
        name,
        birthday_text,
        gender,
        username,
        email,
        password
    ]):
        print("REGISTER VALIDATION FAILED", flush=True)

        return jsonify({
            "error": "All fields are required"
        }), 400

    try:
        birthday = datetime.strptime(
            birthday_text,
            "%Y-%m-%d"
        ).date()

    except ValueError:
        print("BIRTHDAY FORMAT ERROR", flush=True)

        return jsonify({
            "error": "Birthday must use YYYY-MM-DD format"
        }), 400

    if User.query.filter_by(email=email).first():
        print("EMAIL ALREADY EXISTS", flush=True)

        return jsonify({
            "error": "Email already exists"
        }), 409

    if User.query.filter_by(username=username).first():
        print("USERNAME ALREADY EXISTS", flush=True)

        return jsonify({
            "error": "Username already exists"
        }), 409

    user = User(
        name=name,
        birthday=birthday,
        gender=gender,
        username=username,
        email=email,
        email_verified=False,
        verification_code=None,
        verification_expires=None
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    print("USER CREATED IN DATABASE", flush=True)
    print("REGISTER SUCCESS", flush=True)

    return jsonify({
        "message": "Account created successfully",
        "user_id": user.id
    }), 201


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    return jsonify({
        "error": "Email verification is currently disabled"
    }), 503


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
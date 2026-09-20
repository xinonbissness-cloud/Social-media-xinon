from datetime import datetime, timedelta
import secrets

from flask import Blueprint, request, jsonify

from models.user import db, User
from services.email import send_verification_email


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

    verification_code = str(secrets.randbelow(1000000)).zfill(6)

    user = User(
        name=name,
        birthday=birthday,
        gender=gender,
        username=username,
        email=email,
        email_verified=False,
        verification_code=verification_code,
        verification_expires=datetime.utcnow() + timedelta(minutes=10)
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    try:
        send_verification_email(
            email,
            verification_code
        )
    except Exception:
        db.session.delete(user)
        db.session.commit()

        return jsonify({
            "error": "Could not send verification email"
        }), 500

    return jsonify({
        "message": "Verification code sent to your email"
    }), 201


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        return jsonify({
            "error": "Email and verification code are required"
        }), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    if user.email_verified:
        return jsonify({
            "message": "Email already verified"
        }), 200

    if not user.verification_code:
        return jsonify({
            "error": "No verification code found"
        }), 400

    if user.verification_expires < datetime.utcnow():
        return jsonify({
            "error": "Verification code has expired"
        }), 400

    if user.verification_code != code:
        return jsonify({
            "error": "Invalid verification code"
        }), 400

    user.email_verified = True
    user.verification_code = None
    user.verification_expires = None

    db.session.commit()

    return jsonify({
        "message": "Email verified successfully"
    }), 200


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

    if not user.email_verified:
        return jsonify({
            "error": "Please verify your email first"
        }), 403

    return jsonify({
        "message": "Login successful",
        "user_id": user.id
    }), 200

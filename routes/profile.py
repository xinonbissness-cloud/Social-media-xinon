from flask import Blueprint, jsonify, request
from models.user import db, User
from models.media import ProfileMedia

profile_bp = Blueprint("profile", __name__)


@profile_bp.get("/profile/me")
def get_my_profile():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    media = ProfileMedia.query.filter_by(user_id=user.id).first()

    return jsonify({
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "profile_picture_url": f"/api/profile/{user.id}/picture" if media else None,
        }
    })


@profile_bp.post("/profile/me/picture")
def upload_profile_picture():
    user_id = request.form.get("user_id", type=int)
    file = request.files.get("picture")

    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401
    if not file or not file.filename:
        return jsonify({"error": "Please choose an image."}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.mimetype not in allowed:
        return jsonify({"error": "Only JPG, PNG, WEBP, or GIF images are allowed."}), 400

    data = file.read()
    if not data:
        return jsonify({"error": "The selected image is empty."}), 400
    if len(data) > 8 * 1024 * 1024:
        return jsonify({"error": "Profile picture must be 8 MB or smaller."}), 400

    media = ProfileMedia.query.filter_by(user_id=user.id).first()
    if media:
        media.data = data
        media.mime_type = file.mimetype
    else:
        media = ProfileMedia(
            user_id=user.id,
            data=data,
            mime_type=file.mimetype,
        )
        db.session.add(media)

    db.session.commit()

    return jsonify({
        "message": "Profile picture updated successfully!",
        "profile_picture_url": f"/api/profile/{user.id}/picture"
    })


@profile_bp.get("/profile/<int:user_id>/picture")
def get_profile_picture(user_id):
    media = ProfileMedia.query.filter_by(user_id=user_id).first()
    if not media:
        return jsonify({"error": "Profile picture not found."}), 404

    from flask import Response
    return Response(media.data, mimetype=media.mime_type)
                               

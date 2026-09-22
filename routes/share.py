from flask import Blueprint, jsonify, request

from models.user import db, User
from models.post import Post
from models.share import PostShare

share_bp = Blueprint("share", __name__)


@share_bp.post("/posts/<int:post_id>/share")
def share_post(post_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401

    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404

    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    existing = PostShare.query.filter_by(post_id=post.id, user_id=user.id).first()
    if existing:
        return jsonify({
            "message": "You already shared this post.",
            "share_count": PostShare.query.filter_by(post_id=post.id).count(),
        }), 200

    share = PostShare(post_id=post.id, user_id=user.id)
    db.session.add(share)
    db.session.commit()

    return jsonify({
        "message": "Post shared to your feed!",
        "share_count": PostShare.query.filter_by(post_id=post.id).count(),
    }), 201


@share_bp.get("/posts/<int:post_id>/shares")
def share_count(post_id):
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    return jsonify({
        "post_id": post.id,
        "share_count": PostShare.query.filter_by(post_id=post.id).count(),
    })
    

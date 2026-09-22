from flask import Blueprint, jsonify, request

from models.user import db, User
from models.post import Post

posts_bp = Blueprint("posts", __name__)


@posts_bp.post("/posts")
def create_post():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    content = (data.get("content") or "").strip()

    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401
    if not content:
        return jsonify({"error": "Post content is required."}), 400

    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404

    post = Post(user_id=user.id, content=content)
    db.session.add(post)
    db.session.commit()

    return jsonify({
        "message": "Post created successfully!",
        "post": {
            "id": post.id,
            "content": post.content,
            "created_at": post.created_at.isoformat(),
            "user": {
                "id": user.id,
                "name": user.name,
                "username": user.username,
            },
        },
    }), 201


@posts_bp.get("/posts")
def list_posts():
    posts = Post.query.order_by(Post.created_at.desc()).limit(50).all()

    return jsonify({
        "posts": [
            {
                "id": post.id,
                "content": post.content,
                "created_at": post.created_at.isoformat(),
                "user": {
                    "id": post.user.id,
                    "name": post.user.name,
                    "username": post.user.username,
                },
            }
            for post in posts
        ]
    })

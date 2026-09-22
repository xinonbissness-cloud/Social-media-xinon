from flask import Blueprint, jsonify, request, Response

from models.user import db, User
from models.post import Post
from models.media import PostMedia

posts_bp = Blueprint("posts", __name__)


@posts_bp.post("/posts")
def create_post():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        user_id = request.form.get("user_id", type=int)
        content = (request.form.get("content") or "").strip()
        file = request.files.get("media")
    else:
        data = request.get_json(silent=True) or {}
        user_id = data.get("user_id")
        content = (data.get("content") or "").strip()
        file = None

    if not user_id:
        return jsonify({"error": "You must be logged in."}), 401
    if not content and not file:
        return jsonify({"error": "Write something or choose a photo/video."}), 400

    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found."}), 404

    if file:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"}
        if file.mimetype not in allowed:
            return jsonify({"error": "Unsupported photo/video format."}), 400

        data = file.read()
        if not data:
            return jsonify({"error": "The selected file is empty."}), 400

        max_size = 50 * 1024 * 1024 if file.mimetype.startswith("video/") else 10 * 1024 * 1024
        if len(data) > max_size:
            return jsonify({"error": "Photo limit is 10 MB and video limit is 50 MB."}), 400

    post = Post(user_id=user.id, content=content or "")
    db.session.add(post)
    db.session.flush()

    if file:
        media = PostMedia(
            post_id=post.id,
            data=data,
            mime_type=file.mimetype,
        )
        db.session.add(media)

    db.session.commit()

    return jsonify({
        "message": "Post created successfully!",
        "post": serialize_post(post)
    }), 201


def serialize_post(post):
    media = PostMedia.query.filter_by(post_id=post.id).first()
    return {
        "id": post.id,
        "content": post.content,
        "created_at": post.created_at.isoformat(),
        "media_url": f"/api/posts/{post.id}/media" if media else None,
        "media_type": media.mime_type if media else None,
        "user": {
            "id": post.user.id,
            "name": post.user.name,
            "username": post.user.username,
        },
    }


@posts_bp.get("/posts")
def list_posts():
    posts = Post.query.order_by(Post.created_at.desc()).limit(50).all()
    return jsonify({"posts": [serialize_post(post) for post in posts]})


@posts_bp.get("/posts/<int:post_id>/media")
def get_post_media(post_id):
    media = PostMedia.query.filter_by(post_id=post_id).first()
    if not media:
        return jsonify({"error": "Media not found."}), 404

    return Response(media.data, mimetype=media.mime_type)
            

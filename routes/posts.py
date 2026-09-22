from flask import Blueprint, request, jsonify, Response
from sqlalchemy import or_, and_, desc
from models.user import db, User
from models.post import Post, Comment, Reaction, Friend, UserMedia, Share

posts_bp = Blueprint("posts", __name__)

MAX_MEDIA_BYTES = 30 * 1024 * 1024
MAX_PROFILE_BYTES = 10 * 1024 * 1024
MAX_COVER_BYTES = 15 * 1024 * 1024


def valid_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


def json_user_id(payload):
    value = payload.get("user_id") if isinstance(payload, dict) else None
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def user_json(user):
    if not user:
        return None
    media = UserMedia.query.filter_by(user_id=user.id).first()
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "profile_url": f"/api/users/{user.id}/profile-photo" if media and media.profile_data else None,
        "cover_url": f"/api/users/{user.id}/cover-photo" if media and media.cover_data else None,
        "bio": media.bio if media else None,
        "about": media.about if media else None,
    }


def friendship_between(a_id, b_id):
    a_id, b_id = int(a_id), int(b_id)
    return Friend.query.filter(
        or_(
            and_(Friend.requester_id == a_id, Friend.addressee_id == b_id),
            and_(Friend.requester_id == b_id, Friend.addressee_id == a_id),
        )
    ).first()


def post_json(post, viewer_id=None):
    user = db.session.get(User, post.user_id)
    comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.created_at.asc()).all()
    shares = Share.query.filter_by(post_id=post.id).count()
    mine = None
    if viewer_id:
        mine = Reaction.query.filter_by(post_id=post.id, user_id=int(viewer_id)).first()
    return {
        "id": post.id,
        "text": post.text or "",
        "media_type": post.media_type,
        "media_url": f"/api/posts/{post.id}/media" if post.media_data else None,
        "created_at": post.created_at.isoformat() + "Z",
        "user": user_json(user),
        "reaction_count": Reaction.query.filter_by(post_id=post.id).count(),
        "my_reaction": mine.reaction if mine else None,
        "comment_count": len(comments),
        "share_count": shares,
        "comments": [
            {
                "id": c.id,
                "text": c.text,
                "created_at": c.created_at.isoformat() + "Z",
                "user": user_json(db.session.get(User, c.user_id)),
            }
            for c in comments
        ],
    }


@posts_bp.get("/me")
def me():
    uid = request.args.get("user_id", type=int)
    user = valid_user(uid)
    if not user:
        return jsonify({"error": "Login required"}), 401
    return jsonify(user_json(user))


@posts_bp.get("/posts")
def list_posts():
    uid = request.args.get("user_id", type=int)
    kind = request.args.get("type")
    q = Post.query
    if kind == "video":
        q = q.filter(Post.media_type == "video")
    elif kind == "image":
        q = q.filter(Post.media_type == "image")
    posts = q.order_by(desc(Post.created_at)).limit(100).all()
    return jsonify({"posts": [post_json(p, uid) for p in posts]})


@posts_bp.post("/posts")
def create_post():
    payload = request.get_json(silent=True) or {}
    uid = request.form.get("user_id", type=int) or json_user_id(payload)
    if not valid_user(uid):
        return jsonify({"error": "Login required"}), 401

    data = request.form if request.form else payload
    text = (data.get("text") or "").strip()
    file = request.files.get("media")
    if not text and not file:
        return jsonify({"error": "Write something or choose media"}), 400

    post = Post(user_id=int(uid), text=text)
    if file and file.filename:
        blob = file.read()
        if len(blob) > MAX_MEDIA_BYTES:
            return jsonify({"error": "Media is too large (max 30 MB)"}), 413
        mime = (file.mimetype or "").lower()
        if mime.startswith("image/"):
            post.media_type = "image"
        elif mime.startswith("video/"):
            post.media_type = "video"
        else:
            return jsonify({"error": "Only image or video files are supported"}), 400
        post.media_mime = mime
        post.media_data = blob

    db.session.add(post)
    db.session.commit()
    return jsonify({"message": "Post published", "post": post_json(post, int(uid))}), 201


@posts_bp.get("/posts/<int:post_id>/media")
def post_media(post_id):
    post = db.session.get(Post, post_id)
    if not post or not post.media_data:
        return "", 404
    return Response(post.media_data, mimetype=post.media_mime or "application/octet-stream",
                    headers={"Cache-Control": "public, max-age=31536000"})


@posts_bp.post("/posts/<int:post_id>/reaction")
def react(post_id):
    if not db.session.get(Post, post_id):
        return jsonify({"error": "Post not found"}), 404
    data = request.get_json(silent=True) or {}
    uid = json_user_id(data)
    reaction = str(data.get("reaction") or "👍")[:20]
    if not valid_user(uid):
        return jsonify({"error": "Login required"}), 401

    row = Reaction.query.filter_by(post_id=post_id, user_id=uid).first()
    if row and row.reaction == reaction:
        db.session.delete(row)
        result = None
    elif row:
        row.reaction = reaction
        result = reaction
    else:
        db.session.add(Reaction(post_id=post_id, user_id=uid, reaction=reaction))
        result = reaction
    db.session.commit()
    return jsonify({"reaction": result, "count": Reaction.query.filter_by(post_id=post_id).count()})


@posts_bp.post("/posts/<int:post_id>/comments")
def comment(post_id):
    if not db.session.get(Post, post_id):
        return jsonify({"error": "Post not found"}), 404
    data = request.get_json(silent=True) or {}
    uid = json_user_id(data)
    text = (data.get("text") or "").strip()
    if not valid_user(uid):
        return jsonify({"error": "Login required"}), 401
    if not text:
        return jsonify({"error": "Comment is empty"}), 400
    if len(text) > 5000:
        return jsonify({"error": "Comment is too long"}), 400

    c = Comment(post_id=post_id, user_id=uid, text=text)
    db.session.add(c)
    db.session.commit()
    return jsonify({"comment": {
        "id": c.id,
        "text": c.text,
        "user": user_json(db.session.get(User, c.user_id)),
    }}), 201


@posts_bp.post("/posts/<int:post_id>/share")
def share(post_id):
    if not db.session.get(Post, post_id):
        return jsonify({"error": "Post not found"}), 404
    uid = json_user_id(request.get_json(silent=True) or {})
    if not valid_user(uid):
        return jsonify({"error": "Login required"}), 401
    existing = Share.query.filter_by(post_id=post_id, user_id=uid).first()
    if not existing:
        db.session.add(Share(post_id=post_id, user_id=uid))
        db.session.commit()
    return jsonify({"count": Share.query.filter_by(post_id=post_id).count()})


@posts_bp.post("/friends/<int:user_id>/request")
def friend_request(user_id):
    if not valid_user(user_id):
        return jsonify({"error": "User not found"}), 404
    uid = json_user_id(request.get_json(silent=True) or {})
    if not valid_user(uid) or uid == user_id:
        return jsonify({"error": "Invalid user"}), 400
    row = friendship_between(uid, user_id)
    if row:
        return jsonify({"status": row.status, "requester_id": row.requester_id, "addressee_id": row.addressee_id})
    row = Friend(requester_id=uid, addressee_id=user_id, status="pending")
    db.session.add(row)
    db.session.commit()
    return jsonify({"status": "pending", "requester_id": uid, "addressee_id": user_id}), 201


@posts_bp.post("/friends/<int:user_id>/accept")
def friend_accept(user_id):
    uid = json_user_id(request.get_json(silent=True) or {})
    if not valid_user(uid):
        return jsonify({"error": "Invalid user"}), 400
    row = Friend.query.filter_by(requester_id=user_id, addressee_id=uid, status="pending").first()
    if not row:
        return jsonify({"error": "Request not found"}), 404
    row.status = "accepted"
    db.session.commit()
    return jsonify({"status": "accepted"})


@posts_bp.get("/friends")
def friends():
    uid = request.args.get("user_id", type=int)
    if not valid_user(uid):
        return jsonify({"friends": []})
    rows = Friend.query.filter(
        or_(Friend.requester_id == uid, Friend.addressee_id == uid),
        Friend.status == "accepted",
    ).all()
    ids = [r.addressee_id if r.requester_id == uid else r.requester_id for r in rows]
    return jsonify({"friends": [user_json(db.session.get(User, x)) for x in ids]})


@posts_bp.get("/friends/requests")
def friend_requests():
    uid = request.args.get("user_id", type=int)
    if not valid_user(uid):
        return jsonify({"requests": []})
    rows = Friend.query.filter_by(addressee_id=uid, status="pending").order_by(desc(Friend.created_at)).all()
    return jsonify({"requests": [{
        "id": r.id,
        "created_at": r.created_at.isoformat() + "Z",
        "user": user_json(db.session.get(User, r.requester_id)),
    } for r in rows]})


@posts_bp.get("/users/<int:user_id>")
def profile(user_id):
    user = valid_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    viewer = request.args.get("viewer_id", type=int)
    rows = Post.query.filter_by(user_id=user_id).order_by(desc(Post.created_at)).limit(100).all()
    media = UserMedia.query.filter_by(user_id=user_id).first()
    friend = friendship_between(viewer, user_id) if viewer and viewer != user_id else None
    return jsonify({
        "user": user_json(user),
        "about": media.about if media else None,
        "friend_status": friend.status if friend else None,
        "friend_requester_id": friend.requester_id if friend else None,
        "posts": [post_json(p, viewer) for p in rows],
    })


@posts_bp.get("/search")
def search():
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"users": []})
    users = User.query.filter(
        or_(User.name.ilike(f"%{q}%"), User.username.ilike(f"%{q}%"))
    ).order_by(User.name.asc()).limit(30).all()
    return jsonify({"users": [user_json(u) for u in users]})


def save_user_media(uid, field, mime, blob):
    media = UserMedia.query.filter_by(user_id=uid).first()
    if not media:
        media = UserMedia(user_id=uid)
        db.session.add(media)
    setattr(media, field + "_mime", mime)
    setattr(media, field + "_data", blob)
    db.session.commit()


def media_upload(user_id, field, max_bytes):
    if not valid_user(user_id):
        return jsonify({"error": "User not found"}), 404
    file = request.files.get("photo")
    if not file or not file.filename:
        return jsonify({"error": "Choose a photo"}), 400
    blob = file.read()
    if len(blob) > max_bytes:
        return jsonify({"error": "Image is too large"}), 413
    mime = (file.mimetype or "").lower()
    if not mime.startswith("image/"):
        return jsonify({"error": "Image only"}), 400
    save_user_media(user_id, field, mime, blob)
    return jsonify({"url": f"/api/users/{user_id}/{field}-photo"})


@posts_bp.post("/users/<int:user_id>/profile-photo")
def upload_profile_photo(user_id):
    # The UI only exposes this control on the current user's profile.
    return media_upload(user_id, "profile", MAX_PROFILE_BYTES)


@posts_bp.get("/users/<int:user_id>/profile-photo")
def profile_photo(user_id):
    media = UserMedia.query.filter_by(user_id=user_id).first()
    if not media or not media.profile_data:
        return "", 404
    return Response(media.profile_data, mimetype=media.profile_mime or "image/jpeg",
                    headers={"Cache-Control": "public, max-age=31536000"})


@posts_bp.post("/users/<int:user_id>/cover-photo")
def upload_cover(user_id):
    return media_upload(user_id, "cover", MAX_COVER_BYTES)


@posts_bp.get("/users/<int:user_id>/cover-photo")
def cover_photo(user_id):
    media = UserMedia.query.filter_by(user_id=user_id).first()
    if not media or not media.cover_data:
        return "", 404
    return Response(media.cover_data, mimetype=media.cover_mime or "image/jpeg",
                    headers={"Cache-Control": "public, max-age=31536000"})


@posts_bp.post("/users/<int:user_id>/about")
def update_about(user_id):
    if not valid_user(user_id):
        return jsonify({"error": "User not found"}), 404
    data = request.get_json(silent=True) or {}
    media = UserMedia.query.filter_by(user_id=user_id).first()
    if not media:
        media = UserMedia(user_id=user_id)
        db.session.add(media)
    media.bio = (data.get("bio") or "").strip()
    media.about = (data.get("about") or "").strip()
    db.session.commit()
    return jsonify({"message": "Updated", "user": user_json(db.session.get(User, user_id))})
    

import json
from datetime import datetime

from flask import Blueprint, jsonify, request

from models.user import db, User
from models.live import LiveSession, LiveViewer, LiveComment, LiveReaction, LiveSignal

live_bp = Blueprint("live", __name__)


def get_user(user_id):
    try:
        return db.session.get(User, int(user_id)) if user_id else None
    except (TypeError, ValueError):
        return None


def get_live(session_id):
    session = db.session.get(LiveSession, session_id)
    if not session or session.status != "live":
        return None
    return session


@live_bp.get("/live/active")
def active_live():
    sessions = LiveSession.query.filter_by(status="live").order_by(LiveSession.started_at.desc()).limit(20).all()
    return jsonify({
        "lives": [
            {
                "id": s.id,
                "title": s.title,
                "host_user_id": s.host_user_id,
                "host": {"name": s.host.name, "username": s.host.username},
                "started_at": s.started_at.isoformat(),
                "viewer_count": LiveViewer.query.filter_by(session_id=s.id, left_at=None).count(),
            }
            for s in sessions
        ]
    })


@live_bp.post("/live/start")
def start_live():
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    title = (data.get("title") or "Live").strip()[:200]
    if not user:
        return jsonify({"error": "You must be logged in."}), 401
    if LiveSession.query.filter_by(host_user_id=user.id, status="live").first():
        return jsonify({"error": "You already have an active live."}), 409

    session = LiveSession(host_user_id=user.id, title=title or "Live")
    db.session.add(session)
    db.session.commit()
    return jsonify({
        "message": "Live started.",
        "live": {"id": session.id, "title": session.title, "host_user_id": user.id}
    }), 201


@live_bp.post("/live/<int:session_id>/end")
def end_live(session_id):
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    session = db.session.get(LiveSession, session_id)
    if not user or not session:
        return jsonify({"error": "Live session not found."}), 404
    if session.host_user_id != user.id:
        return jsonify({"error": "Only the host can end this live."}), 403
    if session.status != "live":
        return jsonify({"message": "Live already ended."})

    session.status = "ended"
    session.ended_at = datetime.utcnow()
    LiveViewer.query.filter_by(session_id=session.id, left_at=None).update({"left_at": datetime.utcnow()})
    db.session.commit()
    return jsonify({"message": "Live ended."})


@live_bp.get("/live/<int:session_id>")
def live_state(session_id):
    session = db.session.get(LiveSession, session_id)
    if not session:
        return jsonify({"error": "Live session not found."}), 404
    return jsonify({
        "live": {
            "id": session.id,
            "title": session.title,
            "status": session.status,
            "host_user_id": session.host_user_id,
            "host": {"name": session.host.name, "username": session.host.username},
            "started_at": session.started_at.isoformat(),
            "viewer_count": LiveViewer.query.filter_by(session_id=session.id, left_at=None).count(),
            "reaction_count": LiveReaction.query.filter_by(session_id=session.id).count(),
        }
    })


@live_bp.post("/live/<int:session_id>/join")
def join_live(session_id):
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    session = get_live(session_id)
    if not user or not session:
        return jsonify({"error": "Live session not found."}), 404

    viewer = LiveViewer.query.filter_by(session_id=session.id, user_id=user.id).first()
    if viewer:
        viewer.left_at = None
        viewer.joined_at = datetime.utcnow()
    else:
        viewer = LiveViewer(session_id=session.id, user_id=user.id)
        db.session.add(viewer)
    db.session.commit()

    if user.id != session.host_user_id:
        signal = LiveSignal(
            session_id=session.id,
            sender_user_id=user.id,
            target_user_id=session.host_user_id,
            signal_type="viewer_join",
            payload=json.dumps({"viewer_user_id": user.id}),
        )
        db.session.add(signal)
        db.session.commit()

    return jsonify({"message": "Joined live.", "viewer_count": LiveViewer.query.filter_by(session_id=session.id, left_at=None).count()})


@live_bp.post("/live/<int:session_id>/leave")
def leave_live(session_id):
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    session = db.session.get(LiveSession, session_id)
    if not user or not session:
        return jsonify({"error": "Live session not found."}), 404
    viewer = LiveViewer.query.filter_by(session_id=session.id, user_id=user.id).first()
    if viewer:
        viewer.left_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"message": "Left live."})


@live_bp.get("/live/<int:session_id>/comments")
def get_comments(session_id):
    if not db.session.get(LiveSession, session_id):
        return jsonify({"error": "Live session not found."}), 404
    try:
        after = int(request.args.get("after", 0))
    except ValueError:
        after = 0
    comments = LiveComment.query.filter(LiveComment.session_id == session_id, LiveComment.id > after).order_by(LiveComment.id.asc()).limit(100).all()
    return jsonify({"comments": [
        {"id": c.id, "text": c.text, "created_at": c.created_at.isoformat(), "user": {"id": c.user.id, "name": c.user.name, "username": c.user.username}}
        for c in comments
    ]})


@live_bp.post("/live/<int:session_id>/comments")
def add_comment(session_id):
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    session = get_live(session_id)
    text = (data.get("text") or "").strip()
    if not user or not session:
        return jsonify({"error": "Live session not found."}), 404
    if not text:
        return jsonify({"error": "Comment is required."}), 400
    comment = LiveComment(session_id=session.id, user_id=user.id, text=text[:500])
    db.session.add(comment)
    db.session.commit()
    return jsonify({"message": "Comment added.", "comment": {"id": comment.id, "text": comment.text, "user": {"name": user.name, "username": user.username}}}), 201


@live_bp.post("/live/<int:session_id>/react")
def react_live(session_id):
    data = request.get_json(silent=True) or {}
    user = get_user(data.get("user_id"))
    session = get_live(session_id)
    reaction = (data.get("reaction") or "like").strip()[:20]
    if not user or not session:
        return jsonify({"error": "Live session not found."}), 404
    existing = LiveReaction.query.filter_by(session_id=session.id, user_id=user.id).first()
    if existing:
        existing.reaction = reaction
    else:
        db.session.add(LiveReaction(session_id=session.id, user_id=user.id, reaction=reaction))
    db.session.commit()
    return jsonify({"message": "Reaction sent.", "reaction_count": LiveReaction.query.filter_by(session_id=session.id).count()})


@live_bp.post("/live/<int:session_id>/signals")
def send_signal(session_id):
    data = request.get_json(silent=True) or {}
    sender = get_user(data.get("user_id"))
    target = get_user(data.get("target_user_id"))
    session = get_live(session_id)
    signal_type = (data.get("type") or "").strip()[:30]
    payload = data.get("payload")
    if not sender or not target or not session:
        return jsonify({"error": "Live session not found."}), 404
    if signal_type not in {"viewer_join", "offer", "answer", "candidate"}:
        return jsonify({"error": "Unsupported signal type."}), 400
    db.session.add(LiveSignal(
        session_id=session.id,
        sender_user_id=sender.id,
        target_user_id=target.id,
        signal_type=signal_type,
        payload=json.dumps(payload if payload is not None else {}),
    ))
    db.session.commit()
    return jsonify({"message": "Signal sent."}), 201


@live_bp.get("/live/<int:session_id>/signals")
def get_signals(session_id):
    user = get_user(request.args.get("user_id"))
    if not user or not db.session.get(LiveSession, session_id):
        return jsonify({"error": "Live session not found."}), 404
    try:
        after = int(request.args.get("after", 0))
    except ValueError:
        after = 0
    signals = LiveSignal.query.filter(
        LiveSignal.session_id == session_id,
        LiveSignal.target_user_id == user.id,
        LiveSignal.id > after,
    ).order_by(LiveSignal.id.asc()).limit(100).all()
    return jsonify({"signals": [
        {"id": s.id, "sender_user_id": s.sender_user_id, "type": s.signal_type, "payload": json.loads(s.payload)}
        for s in signals
    ]})

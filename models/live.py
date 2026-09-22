from datetime import datetime
from models.user import db


class LiveSession(db.Model):
    __tablename__ = "live_sessions"

    id = db.Column(db.Integer, primary_key=True)
    host_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False, default="Live")
    status = db.Column(db.String(20), nullable=False, default="live", index=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ended_at = db.Column(db.DateTime, nullable=True)

    host = db.relationship("User", backref=db.backref("live_sessions", lazy=True))


class LiveViewer(db.Model):
    __tablename__ = "live_viewers"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("live_sessions.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    left_at = db.Column(db.DateTime, nullable=True)

    session = db.relationship("LiveSession", backref=db.backref("viewers", lazy=True))
    user = db.relationship("User", backref=db.backref("live_views", lazy=True))


class LiveComment(db.Model):
    __tablename__ = "live_comments"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("live_sessions.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    session = db.relationship("LiveSession", backref=db.backref("comments", lazy=True))
    user = db.relationship("User", backref=db.backref("live_comments", lazy=True))


class LiveReaction(db.Model):
    __tablename__ = "live_reactions"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("live_sessions.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    reaction = db.Column(db.String(20), nullable=False, default="like")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    session = db.relationship("LiveSession", backref=db.backref("reactions", lazy=True))
    user = db.relationship("User", backref=db.backref("live_reactions", lazy=True))


class LiveSignal(db.Model):
    __tablename__ = "live_signals"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("live_sessions.id"), nullable=False, index=True)
    sender_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    signal_type = db.Column(db.String(30), nullable=False)
    payload = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    session = db.relationship("LiveSession", backref=db.backref("signals", lazy=True))

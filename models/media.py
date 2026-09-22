from datetime import datetime
from models.user import db


class ProfileMedia(db.Model):
    __tablename__ = "profile_media"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False, index=True)
    data = db.Column(db.LargeBinary, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("profile_media", uselist=False))


class PostMedia(db.Model):
    __tablename__ = "post_media"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), unique=True, nullable=False, index=True)
    data = db.Column(db.LargeBinary, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    post = db.relationship("Post", backref=db.backref("media", uselist=False))

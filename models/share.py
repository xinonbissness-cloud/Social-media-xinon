from datetime import datetime
from models.user import db


class PostShare(db.Model):
    __tablename__ = "post_shares"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    post = db.relationship("Post", backref=db.backref("shares", lazy=True))
    user = db.relationship("User", backref=db.backref("post_shares", lazy=True))

from flask import Blueprint, render_template

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/notifications")
def page():
    return render_template("notifications.html")

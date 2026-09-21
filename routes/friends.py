from flask import Blueprint, render_template

friends_bp = Blueprint("friends", __name__)

@friends_bp.route("/friends")
def page():
    return render_template("friends.html")

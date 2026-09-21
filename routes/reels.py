from flask import Blueprint, render_template

reels_bp = Blueprint("reels", __name__)

@reels_bp.route("/reels")
def page():
    return render_template("reels.html")

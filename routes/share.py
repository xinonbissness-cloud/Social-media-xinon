from flask import Blueprint, render_template

share_bp = Blueprint("share", __name__)

@share_bp.route("/share")
def page():
    return render_template("share.html")

from flask import Blueprint, render_template

channel_bp = Blueprint("channel", __name__)

@channel_bp.route("/channel/create")
def page():
    return render_template("channel_create.html")

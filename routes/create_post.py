from flask import Blueprint, render_template

create_post_bp = Blueprint("create_post", __name__)

@create_post_bp.route("/create-post")
def page():
    return render_template("create_post.html")

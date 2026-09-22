from flask import Flask, render_template, redirect
from flask_cors import CORS

from config import Config
from models.user import db
from routes.auth import auth_bp
from routes.posts import posts_bp
from models.post import Post
from models.media import ProfileMedia, PostMedia
from routes.profile import profile_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(posts_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")

@app.route("/")
def root():
    return redirect("/login")

@app.route("/login")
def login(): return render_template("login.html")

UI_ROUTES = {
    "/home":"home.html", "/reels":"reels.html", "/profile":"profile.html",
    "/friends":"friends.html", "/search":"search.html", "/notifications":"notifications.html",
    "/create-post":"create_post.html", "/share":"share.html", "/settings":"settings.html",
    "/channel/create":"channel_create.html", "/terms":"terms.html"
}
for path, template in UI_ROUTES.items():
    app.add_url_rule(path, endpoint="ui_"+path.strip("/").replace("/","_"), view_func=lambda template=template: render_template(template))

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
    

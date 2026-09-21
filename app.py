from flask import Flask, render_template
from flask_cors import CORS

from config import Config
from models.user import db
from routes.auth import auth_bp
from routes.home import home_bp
from routes.profile import profile_bp
from routes.friends import friends_bp
from routes.reels import reels_bp
from routes.search import search_bp
from routes.notifications import notifications_bp
from routes.create_post import create_post_bp
from routes.share import share_bp
from routes.settings import settings_bp
from routes.channel import channel_bp
from routes.terms import terms_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db.init_app(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(home_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(friends_bp)
app.register_blueprint(reels_bp)
app.register_blueprint(search_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(create_post_bp)
app.register_blueprint(share_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(channel_bp)
app.register_blueprint(terms_bp)

@app.route("/")
def index():
    return render_template("login.html")

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

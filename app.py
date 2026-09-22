from flask import Flask, render_template
from flask_cors import CORS
from config import Config
from models.user import db
from models.post import Post, Comment, Reaction, Friend, UserMedia, Share
from routes.auth import auth_bp
from routes.posts import posts_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True)

db.init_app(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(posts_bp, url_prefix="/api")

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/create-post")
def create_post_page():
    return render_template("create_post.html")

@app.route("/health")
def health():
    return {"status": "ok"}

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
    

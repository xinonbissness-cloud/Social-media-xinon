from flask import Flask
from config import Config
from models.user import db
from routes.auth import auth_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")


@app.route("/")
def home():
    return "Xinon Social Backend is running!"


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

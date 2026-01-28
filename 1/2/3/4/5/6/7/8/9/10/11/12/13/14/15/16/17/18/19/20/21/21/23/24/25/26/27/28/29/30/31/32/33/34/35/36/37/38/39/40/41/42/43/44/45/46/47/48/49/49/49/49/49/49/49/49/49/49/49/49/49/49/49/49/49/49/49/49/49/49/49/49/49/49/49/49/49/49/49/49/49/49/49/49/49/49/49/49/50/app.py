from flask import Flask, request, jsonify, render_template, redirect
from flask_sqlalchemy import SQLAlchemy
import uuid

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite"
app.config["SECRET_KEY"] = "MUDE_ESSA_CHAVE"
db = SQLAlchemy(app)

class License(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True)
    hwid = db.Column(db.String(128))
    active = db.Column(db.Boolean, default=True)

with app.app_context():
    db.create_all()

# ================= API =================
@app.route("/validate", methods=["POST"])
def validate():
    data = request.json
    key = data.get("key")
    hwid = data.get("hwid")

    lic = License.query.filter_by(key=key).first()
    if not lic or not lic.active:
        return jsonify(status="invalid")

    if lic.hwid is None:
        lic.hwid = hwid
        db.session.commit()

    if lic.hwid != hwid:
        return jsonify(status="invalid")

    return jsonify(status="ok")

# ================= PANEL =================
@app.route("/", methods=["GET", "POST"])
def panel():
    if request.method == "POST":
        new_key = "PRO-" + uuid.uuid4().hex[:16].upper()
        db.session.add(License(key=new_key))
        db.session.commit()
        return redirect("/")

    licenses = License.query.all()
    return render_template("panel.html", licenses=licenses)

app.run(host="0.0.0.0", port=5000)

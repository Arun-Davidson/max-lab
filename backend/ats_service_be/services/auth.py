from functools import wraps
from flask import request, jsonify
from services.database import verify_api_key

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-KEY')
        if not api_key:
            return jsonify({"error": "Missing API Key"}), 401
        
        if not verify_api_key(api_key):
            return jsonify({"error": "Invalid API Key"}), 401
            
        return f(*args, **kwargs)
    return decorated_function

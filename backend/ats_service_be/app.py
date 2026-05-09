from flask import Flask, request, jsonify
from flask_cors import CORS
from services.pdf_parser import get_text_from_url, extract_text_from_stream
from services.nlp_engine import analyze_resume, extract_name, extract_skills, extract_experience, extract_summary
from services.database import generate_api_key
from services.auth import require_api_key
import os
import io

app = Flask(__name__)
CORS(app)


@app.route('/api/v1/keys/generate', methods=['POST'])
def generate_key():
    data = request.json
    name = data.get('name', 'Default')
    key = generate_api_key(name)
    if key:
        return jsonify({"api_key": key})
    return jsonify({"error": "Failed to generate API key"}), 500

@app.route('/api/v1/analyze', methods=['POST'])
@require_api_key
def analyze():
    data = request.json
    if not data:
        return jsonify({"error": "No payload provided"}), 400
    
    resume_link = data.get('resume_link')
    job_description = data.get('job_description')

    print(resume_link)
    print(job_description)
    
    if not resume_link or not job_description:
        return jsonify({"error": "Missing resume_link or job_description"}), 400
    
    # 1. Get Text
    resume_text = get_text_from_url(resume_link)
    if not resume_text:
        return jsonify({"error": "Could not extract text from resume link"}), 400
    
    # 2. Extract Basic Info
    candidate_name = extract_name(resume_text)
    
    # 3. Analyze
    analysis = analyze_resume(resume_text, job_description, data.get('role', 'Developer'))
    
    # 4. Format Output
    response = {
        "candidate": candidate_name,
        "role": data.get('role', "Software Developer"), # Optional role from payload
        **analysis
    }
    
    return jsonify(response)

@app.route('/api/v1/extract', methods=['POST'])
@require_api_key
def extract():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
    
    resume_file = request.files['resume']
    if resume_file.filename == '':
        return jsonify({"error": "No resume file selected"}), 400
    
    # Extract text from file stream
    resume_stream = io.BytesIO(resume_file.read())
    resume_text = extract_text_from_stream(resume_stream, filename=resume_file.filename)
    
    if not resume_text:
        return jsonify({"error": "Could not extract text from resume"}), 400
    
    # Extract details
    candidate_name = extract_name(resume_text)
    skills = extract_skills(resume_text)
    experience = extract_experience(resume_text)
    
    # Enhanced summary extraction
    summary = extract_summary(resume_text)
    
    response = {
        "success": True,
        "data": {
            "resourceName": candidate_name,
            "technicalSkills": skills,
            "totalExperience": experience,
            "professionalSummary": summary,
            # Placeholder/Inferred
            # "currentRole": skills[0].title() if skills else "",
            # "designation": skills[0].title() if skills else ""
        }
    }
    
    return jsonify(response)


@app.route('/api/v1/extract-skills', methods=['POST'])
@require_api_key
def extract_skills_endpoint():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    title = data.get('title', '')
    content = data.get('content', '')

    if not title:
        return jsonify({"error": "No title provided"}), 400
    
    if not content:
        return jsonify({"error": "No content provided"}), 400
    
    main_content = content + '\n' + title
    
    skills = extract_skills(main_content)
    
    response = {
        "success": True,
        "data": {
            "technicalSkills": skills,
        }
    }
    
    return jsonify(response)



if __name__ == '__main__':
    # Initialize models on startup
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

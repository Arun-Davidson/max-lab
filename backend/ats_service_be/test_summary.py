
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'services'))

from services.nlp_engine import extract_summary

test_text = """
JOHN DOE
Software Engineer

SUMMARY
Highly motivated Software Engineer with 5+ years of experience in building scalable web applications. 
Proficient in Python, React, and AWS. Passionate about solving complex problems and collaborating with cross-functional teams.

EXPERIENCE
Software Engineer | ABC Tech | 2020 - Present
- Developed new features for the core product.
- Mentored junior developers.

Senior Developer | XYZ Corp | 2018 - 2020
- Lead the migration to microservices.
"""

print("--- Header Based Extraction ---")
summary = extract_summary(test_text)
print(f"Summary: {summary}")

test_text_no_header = """
JOHN DOE
Software Engineer

I am a Software Engineer with 5+ years of experience. I love coding and building great products. 
I have worked on many projects using various technologies. 
My goal is to continue learning and growing as a professional.
I am always looking for new challenges and opportunities.
"""

print("\n--- Fallback (Sumy) Extraction ---")
summary_fallback = extract_summary(test_text_no_header)
print(f"Summary: {summary_fallback}")

test_text_gibberish = """
Skilled in HTML, CSS, CONTACT JavaScript, Tailwind CSS, and React.js with expertise in Redux.js, Redux Toolkit, and React Router for efficient state and route management. Thodupuzha, Idukki, Kerala Todo List Web App ( https://vishnufd.github.io/my-todo-list/ ) SKILLS Tech Stack: React.js (v18), Tailwind, CSS Developed a responsive Todo-List web app using React and Tailwind CSS. Ensured a clean, responsive design across devices and deployed the app via GitHub Pages.
"""

print("\n--- User Gibberish Case ---")
summary_gibberish = extract_summary(test_text_gibberish)
print(f"Summary: {summary_gibberish}")

test_text_name_noise = """
VISHNU ANIL | Frontend Developer
vishnu@example.com | 999 888 7777

Experienced React developer with a passion for clean UI.
"""

print("\n--- Name/Title Noise Case ---")
summary_name_noise = extract_summary(test_text_name_noise)
print(f"Summary: {summary_name_noise}")

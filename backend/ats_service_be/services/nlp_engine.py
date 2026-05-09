import spacy
import re
from sentence_transformers import SentenceTransformer, util
import numpy as np
import nltk
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer

# Download NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
except (LookupError, AttributeError):
    nltk.download('punkt')

# Load spaCy model and Sentence Transformer
# Note: In a production environment, these should be pre-loaded
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # If not found, we might need to handle it or download it
    nlp = None

model = SentenceTransformer('all-MiniLM-L6-v2')

# Common skills taxonomy (expandable)
# SKILLS_LIST = [
#     "node.js", "javascript", "express.js", "docker", "aws", "git", "python", 
#     "react", "angular", "vue", "mongodb", "postgresql", "sql", "redis", 
#     "kubernetes", "typescript", "rest api", "graphql", "java", "spring boot",
#     "html", "css", "tailwind css", "redux", "redux toolkit", "react router",
#     "asp.net", "c#", ".net", "sql server", "mysql", "oracle", "postman",
#     "asp.net core", "entity framework", "web api", "microservices"
# ]

SKILLS_LIST = [
    # Programming Languages
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go",
    "rust", "kotlin", "swift", "php", "ruby", "scala", "dart",

    # Frontend
    "html", "css", "sass", "less", "bootstrap", "tailwind css",
    "react", "next.js", "angular", "vue", "nuxt.js", "redux",
    "redux toolkit", "react router", "jquery",

    # Backend
    "node.js", "express.js", "nestjs", "spring", "spring boot",
    "django", "flask", "fastapi", "laravel", "asp.net", "asp.net core",
    "entity framework", "hibernate","fastapi","django","flask","fastapi",
    "laravel","asp.net","asp.net core","entity framework",
    "hibernate","web api","microservices"

    # Databases
    "mysql", "postgresql", "mongodb", "oracle", "sql server",
    "redis", "cassandra", "dynamodb", "sqlite", "elasticsearch",

    # Cloud Platforms
    "aws", "azure", "google cloud", "gcp", "firebase",
    "aws lambda", "ec2", "s3", "cloudformation",

    # DevOps / CI-CD
    "docker", "kubernetes", "jenkins", "github actions",
    "gitlab ci", "terraform", "ansible", "helm", "nginx","ci/cd","CI/CD pipelines"

    # APIs / Integration
    "rest api", "graphql", "websockets", "soap", "openapi",
    "swagger", "postman",

    # Testing
    "jest", "mocha", "chai", "selenium", "cypress",
    "junit", "pytest", "karma",

    # Architecture / Concepts
    "microservices", "monolith", "event-driven architecture",
    "design patterns", "oop", "mvc", "clean architecture",

    # Data / AI / ML
    "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
    "machine learning", "deep learning", "nlp", "computer vision",

    # Tools
    "git", "github", "bitbucket", "jira", "confluence",
    "linux", "bash", "shell scripting",

    # Mobile
    "react native", "flutter", "android", "ios", "swiftui"

     # -------------------- Java Ecosystem --------------------
    "java 8", "java 11", "java 17", "maven", "gradle",
    "spring security", "spring cloud", "jpa", "jdbc",
    "lombok", "mapstruct",

    # -------------------- Python Ecosystem --------------------
    "celery", "sqlalchemy", "pydantic", "airflow",
    "streamlit", "jupyter", "matplotlib", "seaborn",

    # -------------------- .NET / C# --------------------
    ".net mvc", "blazor", "wpf", "wcf",
    "linq", "xunit", "nunit",

    # -------------------- PHP --------------------
    "codeigniter", "symfony", "composer",

    # -------------------- Go --------------------
    "gin", "gorm", "fiber",

    # -------------------- Node / JS Advanced --------------------
    "typeorm", "prisma", "socket.io",
    "passport.js", "webpack", "vite",

    # -------------------- Frontend Advanced --------------------
    "material ui", "ant design", "chakra ui",
    "storybook", "figma", "responsive design",
    "pwa", "web accessibility",

    # -------------------- Mobile --------------------
    "jetpack compose", "kotlin coroutines",
    "rxjava", "objective-c", "cocoa touch",
    "xamarin forms", "ionic",

    # -------------------- DevOps Advanced --------------------
    "ci/cd pipelines", "prometheus", "grafana",
    "elk stack", "logstash", "datadog",
    "argocd", "circleci",

    # -------------------- Cloud Advanced --------------------
    "iam", "vpc", "cloudfront",
    "azure devops", "azure functions",
    "bigquery", "cloud run",

    # -------------------- Security --------------------
    "owasp", "oauth2", "jwt",
    "saml", "penetration testing",
    "vulnerability assessment",
    "burp suite", "metasploit",

    # -------------------- Data Engineering --------------------
    "hadoop", "spark", "kafka",
    "hive", "pig", "databricks",
    "snowflake", "redshift",
    "etl pipelines", "data modeling",

    # -------------------- BI / Analytics --------------------
    "tableau", "power bi", "looker",
    "dax", "ssis", "ssrs",

    # -------------------- AI / ML Advanced --------------------
    "xgboost", "lightgbm", "mlflow",
    "hugging face", "transformers",
    "opencv", "spacy", "bert",
    "llms", "rag", "vector databases",

    # -------------------- Testing Advanced --------------------
    "testng", "playwright",
    "appium", "loadrunner",
    "jmeter", "cucumber",

    # -------------------- Architecture --------------------
    "domain driven design",
    "cqrs", "event sourcing",
    "tdd", "bdd",
    "scalability", "high availability",

    # -------------------- ERP / CRM --------------------
    "sap abap", "sap fico", "sap mm",
    "sap sd", "salesforce apex",
    "salesforce lightning",
    "servicenow scripting",
    "dynamics crm",

    # -------------------- RPA --------------------
    "uipath", "automation anywhere",
    "blue prism",

    # -------------------- Blockchain --------------------
    "solidity", "web3.js",
    "ethereum", "smart contracts",

    # -------------------- Game / AR / VR --------------------
    "unity", "unreal engine",
    "three.js", "arcore",
    "arkit",

    # -------------------- Embedded / IoT --------------------
    "arduino", "raspberry pi",
    "mqtt", "rtos",
    "embedded c",

    # -------------------- Networking / Infra --------------------
    "tcp/ip", "dns",
    "load balancing",
    "firewalls", "vpn",
    "active directory",

    # -------------------- Project / Agile --------------------
    "agile", "scrum",
    "kanban", "stakeholder management",
    "roadmapping", "risk management",

    # -------------------- API / Integration --------------------
    "mulesoft", "apache camel",
    "kafka streams", "api gateway",
    "kong", "apigee",

    # -------------------- MLOps --------------------
    "kubeflow", "sagemaker",
    "model deployment",
    "feature engineering",

    # -------------------- Misc / Modern --------------------
    "monorepo", "nx",
    "turborepo", "serverless",
    "edge computing",

   # -------------------- TIBCO --------------------
    "tibco", "tibco businessworks", "tibco spotfire",
    "tibco ems", "tibco bw6", "tibco cim",

    #-------------------- Sitecore --------------------
    "sitecore", "sitecore cms", "sitecore experience platform",
    "sitecore jss", "sitecore mvc", "sitecore helix",

    #-------------------- Business Analyst --------------------
    "business analysis", "requirements gathering",
    "use cases", "user stories", "bpmn", "uml",
    "swot analysis", "gap analysis", "stakeholder interviews",
    "data mapping", "process modeling",
    
    #-------------------- Oracle EBS --------------------
    "oracle ebs", "oracle applications", "oracle financials",
    "oracle hcm", "oracle supply chain", "oracle forms",
    "oracle reports", "oracle workflow", "oracle bi publisher"

    # -------------------- Additional IT / Tech --------------------
    "code rabbit", "app store", "google play", "manual testing",
    "automation testing", "api testing", "load testing",
    "statistics", "r", "nosql", "networking",
    "cost optimization", "cdn", "siem",
    "ethical hacking", "network security", "cissp",
    "iso 27001", "incident response", "kali linux", "wireshark",

    # -------------------- Oil & Gas --------------------
    "reservoir simulation", "drilling engineering", "well logging",
    "petrel", "eclipse", "pipesim", "prosper",
    "wellbore simulation", "eor methods", "formation evaluation",
    "material balance", "cmg", "decline curve analysis",
    "fluid pvt", "reservoir characterization", "well testing",
    "well design", "drilling fluids", "bha design",
    "casing design", "cementing", "directional drilling",
    "mud engineering", "well control", "iadc standards",
    "hysys", "aspen plus", "p&id", "pfd",
    "process safety", "hazop", "gas processing",
    "distillation", "heat exchangers", "psv sizing",
    "well surveillance", "artificial lift", "esp",
    "gas lift", "wellhead maintenance", "production optimization",
    "scada", "nebosh", "hse auditing",
    "incident investigation", "coshh", "ptw systems",
    "emergency response", "iso 45001",
    "seismic interpretation", "kingdom",
    "structural geology", "stratigraphy",
    "wireline log analysis", "core analysis",
    "arcgis", "pipeline design", "caesar ii",
    "pipeline integrity", "cathodic protection",
    "piping standards", "asme b31", "flow assurance",

    # -------------------- Construction --------------------
    "revit", "staad pro", "sap2000", "structural design",
    "quantity surveying", "ms project", "site supervision",
    "boq", "iso standards", "etabs",
    "steel design", "concrete design", "load analysis",
    "foundation design", "seismic analysis",
    "solidworks", "ansys", "hvac",
    "piping systems", "plc", "hydraulics",
    "pneumatics", "maintenance planning",
    "autocad electrical", "etap", "power systems",
    "hv/lv", "cable sizing", "protection relays",
    "panel design", "iec standards",
    "primavera p6", "pmp", "cost control",
    "fidic contracts", "earned value",
    "navisworks", "bim 360", "ifc",
    "coordination", "clash detection",
    "lod standards", "4d bim", "5d bim",
    "mep design", "autocad mep", "revit mep",
    "plumbing", "fire fighting systems",
    "electrical design", "bim coordination",

    # -------------------- Healthcare --------------------
    "patient diagnosis", "emr systems", "icd-10",
    "clinical assessment", "prescription management",
    "emergency care", "cpr", "acls",
    "uae dha license", "uae haad license",
    "patient care", "iv administration",
    "wound care", "triage", "icu care",
    "bls", "drug dispensing", "pharmacokinetics",
    "drug interactions", "uae moh license",
    "hospital pharmacy", "clinical pharmacy",
    "inventory management", "mri", "ct scan",
    "x-ray", "ultrasound", "pacs", "ris",
    "diagnostic imaging", "interventional radiology",
    "pcr", "hematology", "microbiology",
    "biochemistry", "lis systems",
    "specimen processing", "iso 15189",

    # -------------------- Finance --------------------
    "excel", "bloomberg", "financial modeling",
    "dcf", "valuation", "cfa", "acca",
    "financial reporting", "ifrs", "vat",
    "quickbooks", "tally", "financial statements",
    "audit", "reconciliation", "risk modeling",
    "basel iii", "credit risk", "market risk",
    "operational risk", "sas", "frm", "var",
    "m&a", "capital markets", "pitch decks",
    "due diligence", "aml", "kyc",
    "uae cbuae regulations", "fatf",
    "regulatory reporting", "ica certificate",
    "actuarial science", "life insurance",
    "non-life insurance", "soa", "cas exams",
    "pricing", "reserving",

    # -------------------- Legal --------------------
    "uae commercial law", "contract drafting",
    "corporate governance", "arbitration",
    "difc law", "company formation",
    "contract review", "uae civil law",
    "dispute resolution", "litigation",
    "legal research", "adgm regulations",
    "document drafting", "case management",
    "court filing", "contract administration",
    "lexisnexis", "westlaw",

    # -------------------- Education --------------------
    "curriculum development", "classroom management",
    "ib curriculum", "british curriculum",
    "edtech", "google classroom",
    "assessment & grading", "academic writing",
    "lms", "moodle", "canvas",
    "spss", "publication",
    "instructional design", "articulate 360",
    "adobe captivate", "facilitation",
    "needs assessment", "elearning",

    # -------------------- Logistics --------------------
    "sap scm", "oracle scm", "demand planning",
    "lean", "six sigma", "erp",
    "procurement", "logistics kpis",
    "freight management", "customs clearance",
    "wms", "tms", "incoterms",
    "uae customs", "import/export",
    "carrier negotiations", "forklift",
    "osha", "5s", "stock reconciliation",
    "vendor management", "rfq",
    "contract negotiation", "cost analysis",
    "supplier evaluation",

    # -------------------- Real Estate --------------------
    "uae rera license", "property valuation",
    "dld transactions", "property management",
    "lease management", "tenant relations",
    "rera compliance", "facility management",
    "budgeting", "property inspection",
    "rics", "uae real estate law",
    "report writing", "gis",

    # -------------------- Hospitality --------------------
    "opera pms", "revenue management",
    "f&b management", "guest relations",
    "ota platforms", "haccp",
    "menu planning", "kitchen management",
    "food cost control", "culinary skills",
    "team leadership", "tour planning",
    "uae tourism regulations",
    "booking systems", "amadeus", "sabre",
    "customer service",

    # -------------------- Marketing --------------------
    "seo", "sem", "google ads",
    "meta ads", "social media marketing",
    "hubspot", "email marketing",
    "analytics", "content strategy",
    "brand strategy", "market research",
    "consumer insights", "campaign management",
    "adobe creative suite", "pr",
    "copywriting", "seo writing",
    "wordpress", "adobe premiere",
    "video editing", "storytelling",
    "adobe photoshop", "illustrator",
    "indesign", "motion graphics",
    "after effects", "branding",

    # -------------------- HR --------------------
    "hr information systems", "sap hr",
    "uae labour law", "talent acquisition",
    "performance management", "payroll",
    "cipd", "ats", "linkedin recruiter",
    "job posting", "headhunting",
    "sourcing", "interviewing",
    "hrms", "employer branding",
    "uae wps", "payroll processing",
    "end of service calculation",
    "gratuity", "labour law",

    # -------------------- Renewable Energy --------------------
    "pv system design", "pvsyst", "homer",
    "grid connection", "o&m",
    "energy yield analysis", "wind turbine design",
    "fluid mechanics", "matlab",
    "wasp", "gh bladed",
    "grid integration", "energy modelling",
    "retscreen", "feasibility studies",
    "carbon footprint", "energy auditing",

    # -------------------- Aviation --------------------
    "atpl", "cpl", "ifr",
    "multi-engine", "boeing type rating",
    "airbus type rating", "aviation safety",
    "gcaa license", "icao standards",
    "easa part 66", "aircraft systems",
    "avionics", "mro", "amm",
    "ndt", "engine run-up",
    "icao procedures", "radar",
    "atc license", "traffic management",
    "atis",

    # -------------------- Maritime --------------------
    "marine diesel engines", "stcw",
    "vessel maintenance", "ship systems",
    "classification societies", "dnv",
    "lloyds", "p&i",
    "oil record book", "port management",
    "terminal operating systems",
    "shipping logistics", "isps code",
    "crane operations",

    # -------------------- Retail --------------------
    "pos systems", "merchandising",
    "sales forecasting", "customer experience",
    "kpi reporting", "shopify",
    "magento", "amazon seller",
    "google analytics",
    "conversion optimization",

    # -------------------- Manufacturing --------------------
    "lean manufacturing", "quality control",
    "iso 9001", "kaizen", "oee",
    "production planning", "gd&t",
    "cmm", "statistical process control",
    "fmea", "internal auditing",
    "root cause analysis", "simulation",
    "arena", "ergonomics",
    "time study", "process optimization",

    # -------------------- Government --------------------
    "policy writing", "stakeholder engagement",
    "uae government frameworks",
    "master planning", "zoning regulations",

    # -------------------- Media --------------------
    "scriptwriting", "teleprompter",
    "live reporting", "cms",
    "3d modeling", "blender",
    "maya", "game physics",
    "multiplayer networking"

    # Oil & Gas Production / Reservoir Additions
    "well monitoring",
    "production data analysis",
    "reservoir evaluation",
    "rod pump selection",
    "system design",
    "well inspections",
    "preventive maintenance",
    "troubleshooting",
    "nodal analysis",
    "performance enhancement",
    "real-time monitoring",
    "alarm management",
    "process control",
    "forecasting",
    "kpi reporting",
    "ofm",
    "wellview",
    "scada automation",
]

# Cleanup patterns for noise removal
CLEANUP_PATTERNS = [
    r'[\w\.-]+@[\w\.-]+\.\w+',  # Emails
    r'\+?\d{1,4}?[\s.-]?\(?\d{1,3}?\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}', # Phone numbers
    r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+', # URLs
    r'github\.com/\S+|linkedin\.com/in/\S+', # Social profiles
    r'\b(?:Thodupuzha|Idukki|Kerala|India|Pin|Zip)\b', # Common locations (can be expanded)
]

from datetime import datetime

# def extract_name(text):
#     """Extracts candidate name using patterns for spaced names and spaCy NER."""
#     # 1. Check for spaced capital names (e.g., "B H A R A T H")
#     # specific to the start of the file or early lines
#     lines = text.split('\n')[:10]
#     for line in lines:
#         clean_line = line.strip()
#         # Pattern: Single uppercased chars separated by space, at least 3 chars
#         if re.match(r'^([A-Z]\s)+[A-Z]$', clean_line):
#             return clean_line.replace(" ", "")
            
#     if not nlp:
#         return "Unknown Candidate"
        
#     doc = nlp(text[:1000]) # Scan first 1000 chars
#     for ent in doc.ents:
#         if ent.label_ == "PERSON":
#             return ent.text
#     return "Unknown Candidate"
def extract_name(text):
    """Extracts candidate name using patterns and spaCy NER."""
    lines = text.split('\n')[:15]  # Scan a few more lines
    for i, line in enumerate(lines):
        clean_line = line.strip()
        
        # Pattern 1: Spaced single letters (your original, for Bharath)
        if re.match(r'^([A-Z]\s)+[A-Z]$', clean_line):
            return ''.join(clean_line.split())  # Better than replace(" ", "")
        
        # Pattern 2: All caps words (e.g., "VISHNU ANIL" or "BHARATH KUMAR M")
        if re.match(r'^[A-Z\s]+$', clean_line) and len(clean_line.split()) >= 2:
            return clean_line.title()  # Convert to title case for nicer output
        
        # Pattern 3: Title case words, likely a name (e.g., "Jobin Varghese")
        if re.match(r'^([A-Z][a-z]+\s)+[A-Z][a-z]+$', clean_line):
            return clean_line
        
        # Pattern 4: Check if line looks like a name and next lines have contact (email/phone)
        if len(clean_line.split()) >= 2 and re.search(r'[A-Z]', clean_line):
            next_lines = " ".join(lines[i+1:i+4]).lower()
            if re.search(r'(email|contact|phone|linkedin|github|\+?\d{10}|@)', next_lines):
                return clean_line.title()
    
    # NEW: Check for Name labels throughout the text
    name_labels = [r'name\s*:', r'candidate\s*name\s*:', r'full\s*name\s*:']
    for label in name_labels:
        match = re.search(rf'{label}\s*([A-Z][a-zA-Z\s\.]+)', text, re.IGNORECASE)
        if match:
            name = match.group(1).strip().split('\n')[0].strip()
            if len(name.split()) >= 1:
                return name.title()

    # NEW: Check for "Sincerely" or "Regards" at the bottom (common in some formats)
    # Using \s+ to handle any whitespace/newlines between sign-off and name
    sign_off_match = re.search(r'(?:Sincerely|Regards|Thanking you|Yours faithfully|Sincerely yours),?[\s\t\n]+([A-Z][a-zA-Z\s\.\u00A0]+)', text, re.IGNORECASE)
    if sign_off_match:
        name_candidate = sign_off_match.group(1).strip().split('\n')[0].strip()
        # Clean up any trailing labels like "Place:"
        name_candidate = re.split(r'[\t\s]{2,}|Place:', name_candidate)[0].strip()
        if len(name_candidate.split()) >= 1 and len(name_candidate) > 2:
            return name_candidate.title().strip('.,')
            
    # Fallback to spaCy NER
    if nlp:
        doc = nlp(text[:1500])  # Increase to 1500 chars
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                return ent.text
    else:
        return "Unknown Candidate"
def extract_skills(text):
    """Extracts skills from text using a combination of spaCy and keyword matching."""
    found_skills = set()
    text_lower = text.lower()
    
    # Keyword matching for known skills
    for skill in SKILLS_LIST:
        if skill in text_lower:
            # Special handling for skills with symbols like C#, .NET
            if any(char in skill for char in ['#', '.', '+']):
                # Just check if it's not preceded/followed by alpha-numeric chars
                pattern = rf"(?<![a-zA-Z0-9]){re.escape(skill)}(?![a-zA-Z0-9])"
            else:
                pattern = rf"\b{re.escape(skill)}\b"
                
            if re.search(pattern, text_lower):
                found_skills.add(skill)
                
    return list(found_skills)

def calculate_years(start_year, end_year_str):
    try:
        start = int(start_year)
        if end_year_str.lower() in ['present', 'current', 'now']:
            end = datetime.now().year
        else:
            end = int(end_year_str)
        return max(0, end - start)
    except ValueError:
        return 0

def extract_experience(text):
    """Estimates years of experience from text (Date ranges and explicit mentions)."""
    # 1. Look for date ranges (e.g., 2020 - 2024, 2021 - Present)
    # We iterate line by line (or chunks) to check context
    lines = text.split('\n')
    
    total_years = 0
    # Pattern 1: Year-Year (2020-2024)
    year_pattern = r'(\d{4})\s*[-–]\s*(\d{4}|present|current|now)'
    
    # Pattern 2: Month Year to Month Year (August 2022 to May 2024)
    month_names = r'(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
    period_pattern = rf'({month_names}\s+\d{{4}})\s*(?:to|[-–])\s*({month_names}\s+\d{{4}}|present|current|now|till\s+date)'
    
    # Context keywords to exclude
    education_keywords = ['university', 'college', 'school', 'bachelor', 'master', 'degree', 'education', 'diploma', 'bsc', 'mca', 'bca', 'srm']
    # NEW: Keywords to exclude numeric values from being counted as experience
    noise_keywords = ['age', 'dob', 'date of birth', 'birth', 'year of birth']
    
    for match in re.finditer(period_pattern, text, re.IGNORECASE):
        start_str, end_str = match.groups()
        # Heuristic: convert to years
        # Extract years from the strings
        start_year_match = re.search(r'\d{4}', start_str)
        if end_str.lower() in ['present', 'current', 'now', 'till date']:
            end_year = datetime.now().year
        else:
            end_year_match = re.search(r'\d{4}', end_str)
            end_year = int(end_year_match.group()) if end_year_match else datetime.now().year
            
        if start_year_match:
            start_year = int(start_year_match.group())
            years = max(0, end_year - start_year)
            if years < 30:
                total_years += years

    for i, line in enumerate(lines):
        line_lower = line.lower()
        # Check if line has a year date range
        matches = re.findall(year_pattern, line_lower)
        if matches:
            # Check context (current line and previous 2 lines)
            context = " ".join(lines[max(0, i-2):i+1]).lower()
            
            if any(k in context for k in education_keywords + noise_keywords):
               continue
               
            for start_str, end_str in matches:
                years = calculate_years(start_str, end_str)
                if years > 0 and years < 30: 
                     total_years += years
        
    # 2. Look for "X years", "X+ years" (Explicit mention fallback or validator)
    explicit_matches = list(re.finditer(r"(\d+|\d+\+)\s*(?:year|yr)s?", text, re.IGNORECASE))
    explicit_max = 0
    if explicit_matches:
        filtered_nums = []
        for match in explicit_matches:
            val_str = match.group(1).rstrip('+')
            if val_str.isdigit():
                val = int(val_str)
                # Check context around this SPECIFIC match position
                start, end = match.span()
                context = text.lower()[max(0, start-40):min(len(text), end+40)]
                if not any(k in context for k in noise_keywords):
                    filtered_nums.append(val)
        
        if filtered_nums:
            explicit_max = max(filtered_nums)
            
    return max(total_years, explicit_max)

def is_mostly_noise(text):
    """Detects if a string is mostly contact details, locations, or raw skill lists."""
    if len(text) < 30: # Too short to be a summary sentence
        return True
        
    # Checked against cleanup patterns
    for pattern in CLEANUP_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    
    # Check for raw skill lists (very high concentration of commas or pipes)
    if text.count(',') > 8 or text.count('|') > 4:
        return True

    # Check for "NAME | TITLE" or just names (All caps or Title Case at start of line)
    # This catches blocks like "VISHNU ANIL | Developer"
    if re.match(r'^[A-Z\s]{4,}.*?\|', text):
        return True
        
    return False

def extract_summary(text):
    """Extracts a professional summary using section identification or Transformers-based ranking."""
    # 1. Try to find a professional summary section using headers
    summary_headers = [
        "SUMMARY", "PROFESSIONAL SUMMARY", "PROFESSIONAL PROFILE", 
        "PROFILE", "ABOUT ME", "CAREER OBJECTIVE", "OBJECTIVE", "EXECUTIVE SUMMARY"
    ]
    
    # Boundary headers that usually signal the end of a summary section
    boundary_headers = [
        "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT", "SKILLS", 
        "TECHNICAL SKILLS", "EDUCATION", "PROJECTS", "CERTIFICATIONS", "CONTACT"
    ]
    
    # Try header-based extraction
    for header in summary_headers:
        # Match header followed by text until next boundary header or double newline
        # The boundary lookahead is more robust now
        boundary_pattern = "|".join(boundary_headers)
        pattern = rf"(?i)\b{header}\b[:\-]?\s*(.*?)(?=\n\s*\n|\n\s*(?:{boundary_pattern})|[A-Z][A-Z\s]{5,}(?:\n|$))"
        match = re.search(pattern, text, re.DOTALL)
        
        if match:
            extracted = match.group(1).strip()
            # Clean up: remove internal newlines and noise
            clean_extracted = re.sub(r'\s+', ' ', extracted)
            if len(clean_extracted) > 40 and not is_mostly_noise(clean_extracted):
                return clean_extracted

    # 2. Fallback: Transformers-based Sentence Ranking
    # We rank sentences by similarity to a "Ideal Summary" prototype
    try:
        # Improved splitting: split on periods, exclamation marks, OR double newlines
        # and also filter out very long blobs that didn't split (might be raw skills)
        raw_chunks = re.split(r'(?:(?<=[.!?])\s+)|(?:\n\s*\n)', text)
        sentences = []
        for chunk in raw_chunks:
            # Sub-split on single newlines if the lines look independent
            lines = chunk.split('\n')
            for line in lines:
                s = line.strip()
                if len(s) > 20 and len(s) < 500: # Limit length to avoid raw text blobs
                    sentences.append(s)

        if not sentences:
            return re.sub(r'\s+', ' ', text[:400]).strip() + "..."

        # Prototype embeddings for what a summary sounds like
        summary_prototypes = [
            "Experienced software developer with a strong background in building scalable web applications.",
            "Highly motivated professional with expertise in modern technologies and frameworks.",
            "Passionate about solving complex problems and collaborating with cross-functional teams.",
            "Proven track record of delivering high-quality code and optimizing system performance.",
            "Specialized in frontend and backend development with a focus on user experience.",
            "Looking for opportunities to apply my skills in a challenging environment."
        ]
        
        sentence_embeddings = model.encode(sentences)
        prototype_embeddings = model.encode(summary_prototypes)
        
        # Calculate max similarity of each sentence to ANY prototype
        cos_sims = util.cos_sim(sentence_embeddings, prototype_embeddings)
        max_sims = cos_sims.max(dim=1).values.tolist()
        
        # Match sentences with their scores and filter out noise
        scored_sentences = []
        for i, score in enumerate(max_sims):
            if not is_mostly_noise(sentences[i]):
                scored_sentences.append((sentences[i], score))
        
        # Sort by score and pick top 3 (preserving original order if they are close in relevance)
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        top_sentences = scored_sentences[:3]
        
        # Re-sort top sentences by their original appearance in text for readability
        top_sentences.sort(key=lambda x: text.find(x[0]))
        
        result_summary = " ".join([s[0] for s in top_sentences])
        if len(result_summary) > 50:
            return result_summary
            
    except Exception as e:
        print(f"Transformers logic error: {e}")
        
    # Last resort fallback
    return re.sub(r'\s+', ' ', text[:400]).strip() + "..."

def analyze_resume(resume_text, job_description, role_name="Developer"):
    """Performs the full ATS analysis."""
    # 1. Skill Extraction
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(job_description)
    
    matched_skills = [s for s in jd_skills if s in resume_skills]
    missing_skills = [s for s in jd_skills if s not in resume_skills]
    
    # 2. Experience Analysis
    resume_exp = extract_experience(resume_text)
    # JD experience extraction
    jd_exp_match = re.search(r"(\d+)[-–](\d+)\s*(?:year|yr)s?", job_description, re.IGNORECASE)
    jd_required_exp = "Not specified"
    if jd_exp_match:
        jd_required_exp = f"{jd_exp_match.group(1)}–{jd_exp_match.group(2)} years"
    
    # 3. Semantic Similarity
    embeddings = model.encode([resume_text, job_description])
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    
    # 4. Scoring Logic (Simplified)
    skill_score = len(matched_skills) / len(jd_skills) if jd_skills else 1.0
    final_score = (0.4 * skill_score) + (0.4 * similarity) + (0.2 * (1.0 if resume_exp > 0 else 0.5))
    
    # 5. Ranking Decision (Tuned to look like the example)
    ranking = role_name
    if final_score > 0.8:
        ranking = f"Strong {role_name}"
    elif final_score > 0.6:
        ranking = f"Strong Junior / Entry-level {role_name}"
    else:
        ranking = f"Junior {role_name} (Review Needed)"
        
    # Signals and Flags
    positive_signals = []
    if similarity > 0.7: positive_signals.append("High semantic alignment")
    if matched_skills: positive_signals.append(f"Matches key skills: {', '.join(matched_skills[:3])}")
    
    risk_flags = []
    if missing_skills: risk_flags.append(f"Missing skills: {', '.join(missing_skills[:3])}")
    if resume_exp == 0: risk_flags.append("Limited experience mentioned")

    return {
        "final_score": round(final_score, 2),
        "ranking_decision": ranking,
        "reason": {
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "experience_analysis": f"{resume_exp} year experience vs required {jd_required_exp}",
            "semantic_similarity": round(similarity, 2),
            "positive_signals": positive_signals,
            "risk_flags": risk_flags
        }
    }

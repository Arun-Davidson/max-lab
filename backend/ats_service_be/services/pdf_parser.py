import requests
import pdfplumber
import io
import os
from docx import Document

def download_file(url):
    """Downloads a file from a raw URL and returns a file-like object."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; FileDownloader/1.0)"
    }
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    response.raise_for_status()
    return io.BytesIO(response.content)

def extract_text_from_pdf(pdf_file):
    text = ""
    try:
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                # 1. Extract regular text
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                
                # 2. Extract tables and format them as text
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # Join row elements with tabs to preserve some structure
                        row_text = "\t".join([str(cell) if cell is not None else "" for cell in row])
                        if row_text.strip():
                            text += row_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return None

def extract_text_from_docx(docx_file):
    """Extracts text from a .docx file using python-docx."""
    try:
        doc = Document(docx_file)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text).strip()
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
        return None

def extract_text_from_stream(stream, filename=None):
    """Extracts text from a file-like object, detecting format."""
    # Try to detect by file signature first
    header = stream.read(4)
    stream.seek(0)
    
    if header.startswith(b'%PDF'):
        return extract_text_from_pdf(stream)
    
    # Simple extension check if signature not definitive or for docx (which is a zip)
    if filename:
        ext = filename.lower().split('.')[-1]
        if ext == 'docx':
            return extract_text_from_docx(stream)
        elif ext == 'pdf':
            return extract_text_from_pdf(stream)
            
    # Fallback to docx if it might be one (PK is zip header)
    if header.startswith(b'PK\x03\x04'):
        return extract_text_from_docx(stream)
        
    # Final fallback: try PDF
    return extract_text_from_pdf(stream)

def get_text_from_url(url):
    """Helper to download and extract text in one go."""
    try:
        file_stream = download_file(url)
        # We don't have a filename here usually, but stream detection should work
        return extract_text_from_stream(file_stream)
    except Exception as e:
        print(f"Failed to process file from {url}: {e}")
        return None

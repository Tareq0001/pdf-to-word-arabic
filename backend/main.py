from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import os
import requests
import base64
import io
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Gemini Vision PDF Extractor")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def pdf_to_base64_images(pdf_bytes):
    """
    Converts PDF pages to Base64 images for Gemini to read.
    """
    doc = fitz.open("pdf", pdf_bytes)
    base64_images = []
    
    # Process up to 5 pages to keep it fast
    max_pages = min(len(doc), 5)
    
    for page_num in range(max_pages):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=300)
        
        png_bytes = pix.tobytes("png")
        base64_string = base64.b64encode(png_bytes).decode('utf-8')
        base64_images.append(base64_string)
            
    doc.close()
    return base64_images

def extract_text_with_gemini_rest(api_key: str, base64_image: str) -> str:
    """
    Sends the image to Gemini Flash using REST API to extract Arabic text.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    headers = {
        'x-goog-api-key': api_key,
        'Content-Type': 'application/json'
    }
    
    prompt = "استخرج النص العربي من هذه الصورة كما هو بالضبط. لا تضف أي مقدمات أو شروحات، أعطني النص الخام فقط مع الحفاظ على الفقرات والأسطر."
    
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": base64_image
                        }
                    }
                ]
            }
        ]
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code != 200:
        raise Exception(f"Gemini API Error {response.status_code}: {response.text}")
        
    result = response.json()
    try:
        return result['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError):
        return ""

@app.post("/api/verify")
async def verify_auth(
    api_key: str = Form(None),
    site_password: str = Form(None)
):
    """Verifies the site password or API key before allowing upload."""
    server_api_key = os.environ.get("GEMINI_API_KEY")
    server_password = os.environ.get("SITE_PASSWORD", "0534418634")
    
    if api_key and api_key.strip():
        # A simple check could be added here to call Google API, but we'll accept it
        return {"status": "success", "message": "API key provided."}
    elif site_password and site_password.strip() == server_password:
        return {"status": "success", "message": "Password correct."}
    else:
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة، أو مفتاح API غير صالح.")

@app.post("/api/extract")
async def extract_text(
    file: UploadFile = File(...),
    api_key: str = Form(None),
    site_password: str = Form(None)
):
    """Uploads a PDF and extracts its text using Gemini Flash REST API."""
    server_api_key = os.environ.get("GEMINI_API_KEY")
    server_password = os.environ.get("SITE_PASSWORD", "0534418634")
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    final_api_key = None
    if api_key and api_key.strip():
        final_api_key = api_key.strip()
    elif site_password and site_password.strip() == server_password:
        final_api_key = server_api_key
    else:
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة، يرجى التأكد منها أو استخدام مفتاحك الخاص.")
        
    if not final_api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server and no key was provided.")
    
    try:
        # Read the uploaded file into memory
        pdf_bytes = await file.read()
        
        # Convert to Base64 images
        images = pdf_to_base64_images(pdf_bytes)
        
        extracted_pages = []
        for i, img in enumerate(images):
            text = extract_text_with_gemini_rest(final_api_key, img)
            extracted_pages.append(text)
            
            
            
        full_text = "\n\n".join(extracted_pages)
        
        return {"status": "SUCCESS", "text": full_text}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class TextPayload(BaseModel):
    text: str

@app.post("/api/download-docx")
async def download_docx(payload: TextPayload):
    """Generates a DOCX file from the provided text."""
    try:
        doc = Document()
        
        # Configure styles for Arabic (RTL)
        style = doc.styles['Normal']
        style.font.name = 'Arial'
        
        # Add paragraphs
        for line in payload.text.split('\n'):
            p = doc.add_paragraph(line)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            # Try to force RTL direction for Arabic support
            p_format = p.paragraph_format
            p_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # Save to memory
        doc_io = io.BytesIO()
        doc.save(doc_io)
        doc_io.seek(0)
        
        return StreamingResponse(
            doc_io,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename=extracted_text.docx"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

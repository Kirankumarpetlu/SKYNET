import re
import io
import json
import logging
from PIL import Image
import pytesseract
from app.core.config import settings

logger = logging.getLogger(__name__)

def perform_ocr(image_bytes: bytes) -> tuple[str, float, str]:
    """
    Performs OCR on image bytes using pytesseract.
    Returns:
        extracted_text (str): The raw text.
        confidence (float): The average word confidence (0-100).
        warning_message (str): Empty if confidence >= 70, else warning description.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Get OCR data (including confidence)
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        
        # Extract words and filter out empty strings and confidence -1
        confidences = []
        words = []
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            conf = data['conf'][i]
            if word and conf != -1:
                words.append(word)
                confidences.append(float(conf))
                
        extracted_text = pytesseract.image_to_string(image)
        
        avg_conf = sum(confidences) / len(confidences) if confidences else 100.0
        
        warning = ""
        if avg_conf < 70.0:
            warning = f"Low OCR quality detected (confidence: {avg_conf:.1f}%). The document may contain scanning artifacts."
            
        return extracted_text, avg_conf, warning

    except Exception as e:
        logger.warning(f"Tesseract OCR failed or not installed: {e}. Falling back to simulated OCR.")
        # Fallback simulation
        text = "SKYNET DOCUMENT INTELLIGENCE REPORT\nThis is a simulated OCR text. Please install Tesseract OCR for local scanned document parsing."
        return text, 80.0, "Tesseract OCR not available on system. Running in fallback simulation mode."

def clean_ocr_text_with_llm(ocr_text: str) -> str:
    """
    Optional helper using Groq to post-process and clean OCR errors.
    """
    if not ocr_text or len(ocr_text.strip()) < 10:
        return ocr_text

    try:
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        prompt = (
            "You are an expert OCR post-processing engine. Your task is to correct common OCR errors: "
            "broken words split across lines, ligature misreadings (e.g. 'f1' instead of 'fl'), and general typos. "
            "Maintain the exact layout and content of the document as much as possible. Do not summarize or add comment. "
            "Only return the cleaned document text itself.\n\n"
            f"Text to clean:\n{ocr_text}"
        )
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that only outputs clean text without commentary."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 4096,
            "temperature": 0.1
        }
        with httpx.Client() as client:
            response = client.post(url, json=payload, headers=headers, timeout=30.0)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"OCR LLM cleaning failed: {e}")
        
    # Python-based regex cleaning fallback
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', ocr_text)  # Join hyphenated words split across lines
    return text

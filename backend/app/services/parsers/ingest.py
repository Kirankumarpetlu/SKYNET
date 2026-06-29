import os
import logging
from app.services.parsers.pdf import parse_pdf
from app.services.parsers.docx import parse_docx
from app.services.parsers.xlsx import parse_xlsx
from app.services.parsers.ocr import perform_ocr, clean_ocr_text_with_llm

logger = logging.getLogger(__name__)

def parse_document(filename: str, file_bytes: bytes) -> tuple[str, float, str, str]:
    """
    Ingests and normalizes any document format (PDF, DOCX, XLSX, PNG, JPG).
    Returns:
        extracted_text (str): Organized, structured content.
        confidence (float): Extraction/OCR confidence (0-100).
        warning_message (str): Low quality or formatting warnings.
        doc_format (str): Extracted format (e.g. 'pdf', 'docx', 'xlsx', 'image')
    """
    ext = os.path.splitext(filename.lower())[1]
    
    if ext == ".pdf":
        text, conf, warn, p_type = parse_pdf(file_bytes)
        return text, conf, warn, f"pdf ({p_type})"
        
    elif ext in [".docx", ".doc"]:
        text, conf, warn = parse_docx(file_bytes)
        return text, conf, warn, "docx"
        
    elif ext in [".xlsx", ".xls"]:
        text, conf, warn = parse_xlsx(file_bytes)
        return text, conf, warn, "xlsx"
        
    elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
        logger.info(f"Processing image document via OCR: {filename}")
        raw_text, conf, warn = perform_ocr(file_bytes)
        cleaned_text = clean_ocr_text_with_llm(raw_text)
        return cleaned_text, conf, warn, "image"
        
    else:
        # Fallback to general text if supported, or raise error
        try:
            text = file_bytes.decode("utf-8")
            return text, 100.0, "Decoded file as plain text fallback.", "text"
        except Exception as e:
            raise ValueError(f"Unsupported file format: {ext}. Only PDF, DOCX, XLSX, and images are supported.")

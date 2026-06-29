import io
import logging
from pypdf import PdfReader
import pypdfium2 as pdfium
from app.services.parsers.ocr import perform_ocr, clean_ocr_text_with_llm

logger = logging.getLogger(__name__)

def parse_pdf(file_bytes: bytes) -> tuple[str, float, str, str]:
    """
    Parses PDF document. Automatically routes to digital parsing or OCR.
    Returns:
        extracted_text (str)
        confidence (float)
        warning_message (str)
        parser_type (str): "digital" or "scanned"
    """
    # 1. Try extracting text digitally
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        total_pages = len(reader.pages)
        digital_text_parts = []
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                digital_text_parts.append(text)
                
        digital_text = "\n\n".join(digital_text_parts).strip()
        avg_chars_per_page = len(digital_text) / total_pages if total_pages > 0 else 0
        
        # If it has substantial text, treat as digitally authored
        if avg_chars_per_page > 150:
            logger.info(f"PDF parsed digitally. Pages: {total_pages}, Avg chars: {avg_chars_per_page:.1f}")
            return digital_text, 100.0, "", "digital"
            
    except Exception as e:
        logger.warning(f"Digital PDF extraction failed, falling back to OCR: {e}")

    # 2. Scanned PDF / OCR fallback
    logger.info("PDF appears to be scanned. Starting OCR page-by-page.")
    ocr_texts = []
    confidences = []
    warnings = []
    
    try:
        doc = pdfium.PdfDocument(file_bytes)
        for i, page in enumerate(doc):
            # Render page to PIL image
            bitmap = page.render(scale=2)  # Scale=2 is good for OCR accuracy
            pil_image = bitmap.to_pil()
            
            # Save to bytes
            img_byte_arr = io.BytesIO()
            pil_image.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            # Run OCR
            page_text, page_conf, page_warn = perform_ocr(img_bytes)
            
            # Clean text
            cleaned_text = clean_ocr_text_with_llm(page_text)
            ocr_texts.append(f"--- PAGE {i+1} ---\n{cleaned_text}")
            confidences.append(page_conf)
            if page_warn:
                warnings.append(f"Page {i+1}: {page_warn}")
                
        full_text = "\n\n".join(ocr_texts).strip()
        avg_conf = sum(confidences) / len(confidences) if confidences else 80.0
        warning_msg = "; ".join(warnings) if warnings else ""
        
        if avg_conf < 70.0 and not warning_msg:
            warning_msg = f"Low OCR quality detected (average confidence: {avg_conf:.1f}%)."
            
        return full_text, avg_conf, warning_msg, "scanned"
        
    except Exception as e:
        logger.error(f"OCR PDF extraction failed: {e}")
        return "Failed to parse scanned PDF.", 0.0, f"Error: {e}", "scanned"

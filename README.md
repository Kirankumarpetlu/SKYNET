# SKYNET – Enterprise AI Document Intelligence Platform

SKYNET is an enterprise-grade AI-powered Document Intelligence Platform that automates document ingestion, clause extraction, risk analysis, anomaly detection, cross-document comparison, and CRM synchronization. The platform enables organizations to analyze contracts, invoices, financial statements, NDAs, and other business documents through an intelligent multi-stage processing pipeline.


---

# Live Demo

| Service           | URL                                                |
| ----------------- | -------------------------------------------------- |
| Frontend          | https://skynet-n2mz.vercel.app/projects            |
| Backend API       | https://skynet-production-68c2.up.railway.app      |
| API Documentation | https://skynet-production-68c2.up.railway.app/docs |

---
---

# Demo Video
https://drive.google.com/file/d/11UXNpSeqXl07US-etNb9JGDUCCAVju2D/view?usp=sharing

---

# Application Preview

Add screenshots inside a `screenshots/` folder.

Suggested screenshots:

* Dashboard
* Projects View
* Document Processing Pipeline
* AI Document Chat
* Risk Analysis
* CRM Records
* Cross-Document Comparison

---

# Features

## Intelligent Multi-Format Document Processing

Supports automatic ingestion and parsing of:

* PDF (Digital and Scanned)
* Microsoft Word (.docx)
* Excel (.xlsx)
* Images (.png, .jpg, .jpeg)
* Plain Text

The platform automatically detects the document type and routes it through the appropriate processing pipeline.

---

## Real-Time Processing Pipeline

Each uploaded document passes through the following stages:

1. Upload
2. OCR and Text Extraction
3. Document Classification
4. Entity Extraction
5. Clause Extraction
6. Risk Analysis
7. Cross-Document Comparison
8. CRM Synchronization

Pipeline progress is streamed to the frontend using WebSockets.

---

## Intelligent Clause Extraction

The platform automatically extracts:

* Parties
* Effective Dates
* Jurisdiction
* Payment Terms
* Termination Clauses
* Confidentiality Clauses
* Liability Clauses
* Intellectual Property Assignment
* Non-Compete Clauses
* Financial Metrics

---

## Risk Analysis and Anomaly Detection

Automatically detects:

* Missing standard clauses
* Incomplete payment terms
* Short termination notice periods
* Legal inconsistencies
* Financial risks
* Operational risks

Each issue is categorized by severity:

* Critical
* Warning
* Informational

---

## Cross-Document Comparison

When multiple documents belong to the same project, SKYNET compares them to identify contradictions such as:

* Contract payment terms vs Invoice due dates
* Financial statement values vs Invoice totals
* Conflicting clauses between contract versions

---

## AI Document Assistant

Interact with uploaded documents using natural language.

Example questions:

* Summarize this contract.
* What are the payment terms?
* What risks exist?
* Who are the parties?
* What clauses are missing?

Responses include references to the relevant document content.

---

## Project Insights Dashboard

Provides:

* Overall Risk Score
* Risk Category Breakdown
* Critical Findings
* Processing Status
* Recent Activity
* CRM Synchronization Status

---

## CRM Integration

Automatically synchronizes extracted document metadata into Notion.

Stored information includes:

* Document Type
* Primary Parties
* Extracted Metadata
* Risk Score
* Anomaly Counts
* Processing Timestamp
* Source Document Link

Duplicate documents are updated instead of creating duplicate records.

---

# System Architecture

```text
                User Upload
                     │
                     ▼
          Document Ingestion
                     │
                     ▼
      OCR / Text Extraction
                     │
                     ▼
      Document Classification
                     │
                     ▼
 Entity and Clause Extraction
                     │
                     ▼
    Risk and Anomaly Detection
                     │
                     ▼
 Cross-Document Comparison
                     │
                     ▼
      AI Document Assistant
                     │
                     ▼
       CRM Synchronization
                     │
                     ▼
         React Dashboard
```

---

# Technology Stack

## Frontend

* React 19
* Vite
* TypeScript
* Tailwind CSS
* TanStack Router
* TanStack Query
* Framer Motion
* Supabase JavaScript Client

## Backend

* FastAPI
* Python 3.11
* AsyncIO
* Uvicorn
* Pydantic v2

## AI and Document Processing

* Groq API
* PyMuPDF
* Tesseract OCR
* python-docx
* openpyxl

## Database and Storage

* Supabase PostgreSQL
* Supabase Storage

## Integrations

* Notion API

## Deployment

* Frontend: Vercel
* Backend: Railway

---

# Project Structure

```text
skynet/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   ├── nixpacks.toml
│   └── .env.example
│
├── skynetfrontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
│
├── screenshots/
│
└── README.md
```

---

# Local Setup

## Clone the Repository

```bash
git clone https://github.com/your-username/skynet.git

cd skynet
```

## Backend Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

The backend will be available at:

```
http://localhost:8000
```

API documentation:

```
http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd skynetfrontend

npm install

npm run dev
```

The frontend will be available at:

```
http://localhost:5173
```

---

# Environment Variables

Create a `.env` file inside the `backend` directory.

```env
GROQ_API_KEY=

SUPABASE_URL=

SUPABASE_KEY=

NOTION_API_KEY=

NOTION_DATABASE_ID=

SECRET_KEY=
```

Do not commit the `.env` file to GitHub.

Commit only the `.env.example` file.

---

# Assignment Requirements Covered

* Multi-format document ingestion
* OCR support for scanned documents
* Document classification
* Entity extraction
* Clause extraction
* Risk scoring
* Anomaly detection
* Cross-document comparison
* AI document question answering
* CRM synchronization
* Real-time processing pipeline
* Responsive web interface
* Railway deployment

---

# Known Limitations

* OCR accuracy depends on document quality.
* Cross-document comparison requires multiple documents within the same project.
* Very large documents may require additional processing time.
* AI responses depend on the quality of extracted document text.

---

# Future Enhancements

* Multi-language document processing
* Clause comparison between contract versions
* PDF report generation
* Role-based authentication
* Email and Slack notifications
* Advanced analytics dashboard

---

# License

This project was developed as part of an AI Document Intelligence assignment.

Developed by **Kiran Kumar**.

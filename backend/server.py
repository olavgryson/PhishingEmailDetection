from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import uvicorn
import os
import sys

# Ensure backend module is in path
sys.path.append(os.getcwd())
try:
    from backend.features import HtmlFeatureExtractor, UrlFeatureExtractor
except ImportError:
    # Try relative import if running from backend dir
    from features import HtmlFeatureExtractor, UrlFeatureExtractor

# Initialize app
app = FastAPI(title="Phishing Detection API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
MODEL_PATH = "backend/models/phishing_model.joblib"
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully")
    else:
        print("Model not found. Please run train_model.py first.")
        model = None
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

class EmailRequest(BaseModel):
    subject: str = ""
    body: str = ""
    sender: str = ""

class PredictionResponse(BaseModel):
    is_phishing: bool
    confidence: float
    risk_level: str

@app.get("/")
def health_check():
    return {"status": "online", "model_loaded": model is not None}

@app.post("/predict", response_model=PredictionResponse)
def predict(email: EmailRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # The pipeline expects a list of text bodies
    text_content = [email.body + " " + email.subject]

    import re
    from bs4 import BeautifulSoup
    from urllib.parse import parse_qs, urlparse, urlencode, urlunparse

    # Pre-process to find HTML start if binary garbage is present
    body_content = email.body
    lower_body = body_content.lower()
    if "<html" in lower_body:
        start_idx = lower_body.find("<html")
        body_content = body_content[start_idx:]
    elif "<!doctype html" in lower_body:
        start_idx = lower_body.find("<!doctype html")
        body_content = body_content[start_idx:]

    soup = BeautifulSoup(body_content, 'html.parser')
    
    # Remove noise tags that don't contain user-visible links
    for noise in soup(["script", "style", "meta", "noscript", "link", "object", "embed"]):
        noise.decompose()
        
    urls_found = []
    
    # Extract hrefs from <a> tags
    for a in soup.find_all('a', href=True):
        urls_found.append(a['href'])
        
    # If no HTML links found, or mixed content, try regex on the *text* content only
    # This avoids matching URLs inside attributes of hidden tags
    text_content_clean = soup.get_text(" ", strip=True)
    url_pattern = r'https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)'
    text_urls = re.findall(url_pattern, text_content_clean)
    urls_found.extend(text_urls)
    
    # Helper to unwrap SafeLinks and Trackers
    def unwrap_url(url):
        max_depth = 5
        for _ in range(max_depth):
            try:
                # Microsoft SafeLinks
                if "safelinks.protection.outlook.com" in url:
                    parsed = urlparse(url)
                    qs = parse_qs(parsed.query)
                    if 'url' in qs:
                        url = qs['url'][0]
                        continue
                
                # Inflection.io Tracking
                if "tracking.inflection.io" in url:
                    parsed = urlparse(url)
                    qs = parse_qs(parsed.query)
                    if 'redirect' in qs:
                        url = qs['redirect'][0]
                        continue
                
                # If no wrapper matched, we are done
                break
            except:
                break
        return url

    # Helper to clean URL for display/dedup (remove tracking params)
    def clean_url_display(url):
        try:
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            
            # Remove common tracking parameters
            tracking_params = ['inf_ver', 'inf_ctx', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
            new_qs = {}
            for k, v in qs.items():
                if k not in tracking_params:
                    new_qs[k] = v
            
            # Rebuild URL
            new_query = urlencode(new_qs, doseq=True)
            new_parsed = parsed._replace(query=new_query)
            return urlunparse(new_parsed)
        except:
            return url

    # Filter and Clean
    ignored_domains = ['w3.org', 'xml.org', 'schemas.microsoft.com', 'purl.org', 'xmlns.com', 'fonts.googleapis.com', 'fonts.gstatic.com']
    ignored_exts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.woff', '.woff2', '.ico']
    
    cleaned_urls = []
    for url in urls_found:
        # Unwrap first
        url = unwrap_url(url)
        
        # Basic cleanup
        url = url.strip()
        if url.endswith(')'): # Fix regex artifact if present
            url = url[:-1]
            
        is_ignored = False
        # Check domain
        for d in ignored_domains:
            if d in url:
                is_ignored = True
                break
        
        # Check extension
        if not is_ignored:
            parsed_path = urlparse(url).path
            for ext in ignored_exts:
                if parsed_path.lower().endswith(ext):
                    is_ignored = True
                    break
                    
        if not is_ignored:
            # Clean for display/dedup
            display_url = clean_url_display(url)
            cleaned_urls.append(display_url)

    # Dedup
    filtered_urls = sorted(list(set(cleaned_urls)))

    print("\n" + "="*50)
    print(f"ANAYLZING EMAIL: {email.subject}")
    print(f"URLS FOUND IN BODY ({len(filtered_urls)}):")
    for i, url in enumerate(filtered_urls):
        print(f"  {i+1}. {url}")
    print("="*50 + "\n")
    
    try:
        # Get probability
        proba = model.predict_proba(text_content)[0][1]# 1 =phishing
        is_phishing = proba > 0.5
        
        risk_level = "safe"
        if proba > 0.8:
            risk_level = "dangerous"
        elif proba > 0.4:
            risk_level = "suspicious"
            
        return {
            "is_phishing": bool(is_phishing),
            "confidence": float(proba),
            "risk_level": risk_level
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

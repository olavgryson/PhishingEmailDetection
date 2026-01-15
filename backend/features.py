from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
import warnings

# Suppress warnings when parsing URLs/filenames as HTML
warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)

class UrlTokenizer:
    """Custom tokenizer for URLs to split by special characters."""
    def __call__(self, doc):
        # Split by common URL delimiters
        import re
        return re.split(r'[/\-._~:?#\[\]@!$&\'()*+,;=]', doc)

class HtmlFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extracts counts of specific HTML tags and attributes."""
    def fit(self, x, y=None):
        return self

    def transform(self, posts):
        output = []
        for text in posts:
            features = {}
            try:
                soup = BeautifulSoup(text, 'html.parser')
                
                # Count scripts before removing them
                features['num_script'] = len(soup.find_all('script'))
                features['num_iframe'] = len(soup.find_all('iframe'))
                features['num_forms'] = len(soup.find_all('form'))
                
                # Count hidden elements (simple heuristic)
                features['num_hidden'] = text.count('display:none') + text.count('visibility:hidden')
                
                # Remove noise tags to prevent counting links in scripts/styles/meta
                for noise in soup(["script", "style", "meta", "noscript", "link", "object", "embed"]):
                    noise.decompose()
                
                # Count 'http' in the cleaned HTML/Text
                # This counts links in hrefs AND plain text links, but excludes noise
                features['num_links'] = str(soup).count('http')
                
            except Exception:
                # Fallback if parsing fails
                features['num_script'] = text.count('<script>')
                features['num_iframe'] = text.count('<iframe')
                features['num_hidden'] = text.count('display:none') + text.count('visibility:hidden')
                features['num_forms'] = text.count('<form')
                features['num_links'] = text.count('http')
                
            output.append(list(features.values()))
        return np.array(output)

class UrlFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extracts features from URLs found in text."""
    def fit(self, x, y=None):
        return self
    
    def transform(self, posts):
        output = []
        for text in posts:
            # Simple heuristics for demo
            features = {}
            features['has_ip'] = 1 if 'http://1' in text or 'http://192' in text else 0
            features['len_long'] = 1 if len(text) > 200 else 0
            features['is_shortener'] = 1 if 'bit.ly' in text or 'tinyurl' in text else 0
            output.append(list(features.values()))
        return np.array(output)

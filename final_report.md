# Assignment Task 2: Phishing Email Detection Report

**Student Name:** Olav Gryson-Modaert
**Course:** Cloud for AI

---

## 1. Introduction

Phishing attacks remain a primary vector for cybersecurity breaches, often bypassing traditional filters by using legitimate-looking HTML structures and obfuscated URLs. The goal of this project was to build an end-to-end automated system that analyzes incoming emails to detect suspicious elements before a user interacts with them.

The solution consists of:
1.  **A Machine Learning Model**: Analyzes the email body for structural phishing indicators (HTML tags, hidden elements) and text patterns.
2.  **A URL Analysis Engine**: Extracts and evaluates links for suspicious characteristics (shorteners, IP usage, length).
3.  **A User Interface**: A modern web application allowing users to upload `.eml` files for instant analysis.

---

## 2. Data Exploration & Methodology

### 2.1 Dataset Strategy
To build a robust model, we focused on two key aspects of phishing emails:
*   **HTML Structure**: Phishing emails often contain hidden elements, iframes, and excessive script tags.
*   **URL Patterns**: Malicious links often use URL shorteners, possess excessive length, or use IP addresses instead of domains.

For the purpose of this assignment, a synthetic dataset generator was implemented to simulate these characteristics, producing labeled samples of "Legitimate" vs. "Phishing" emails based on known templates.

### 2.2 Exploratory Data Analysis (EDA)
Analysis of the data revealed distinct patterns:

**Finding 1: URL Length Distribution**
Phishing URLs tend to be significantly longer than legitimate ones due to the inclusion of tracking parameters and obfuscation tokens.
*(See generated graph: `backend/graphs/feature_distribution.png`)*

**Finding 2: Correlation of Hidden Elements**
There is a strong positive correlation between key phishing indicators like `num_hidden_elements` and the `is_phishing` label. Attackers often use `display:none` to hide keywords to bypass spam filters.
*(See generated graph: `backend/graphs/correlation_heatmap.png`)*

### 2.3 Model Selection & Training
We selected a **Random Forest Classifier** for this task.
*   **Justification**: Random Forest is robust against overfitting, handles mix of numerical (counts) and categorical features well, and provides feature importance which explains *why* an email was flagged.
*   **Pipeline**: The training pipeline uses a `FeatureUnion` to combine:
    *   **TF-IDF Vectorization**: Analyzes text content.
    *   **HTML Feature Extractor**: Counts `<script>`, `<iframe>`, `hidden` tags.
    *   **URL Feature Extractor**: Detects IP usage, shorteners, etc.

---

## 3. Results & Evaluation

The model was evaluated using the F1-score metric, which balances precision and recall—critical for security applications where missing a phishing email (False Negative) is dangerous, but flagging legitimate email (False Positive) disrupts business.

**Performance Metrics (on Test Set):**
*   **Precision**: 1.00 (Synthetic Data)
*   **Recall**: 1.00 (Synthetic Data)
*   **F1 Score**: 1.00

*Note: The perfect score is expected due to the synthetic nature of the dataset. On real-world data (e.g., Nazario Corpus), we would expect F1 scores around 0.92-0.95.*

---

## 4. Deployment Considerations

The system was designed with production deployment in mind:
*   **API-First Design**: The ML model is served via **FastAPI**, creating a decoupled microservice that can be scaled independently of the frontend.
*   **Model Serialization**: The trained pipeline is saved as a `.joblib` artifact, allowing for versioned model updates without code changes.
*   **Frontend Integration**: The UI (React/Vite) communicates with the backend via REST API, simulating a real cloud architecture.

### Data Leakage Prevention
To ensure valid results:
*   Feature extraction logic (e.g., `HtmlFeatureExtractor`) is encapsulated in scikit-learn transformers.
*   The `fit_transform` is only called on the Training set, while the Test set (and live data) goes through `transform` only, preventing information from the test set leaking into the training process.

---

## 5. Conclusion

The project successfully delivers a working proof-of-concept for automated phishing detection. The combination of structural HTML analysis and URL heuristics provides a multi-layered defense. The modern UI ensures the tool is accessible to end-users, while the API-based backend allows for easy integration into existing mail servers or security workflows.

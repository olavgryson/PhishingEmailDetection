# Phishing Email Detection System

A full-stack application designed to detect phishing attempts in emails using Machine Learning and heuristic URL analysis. This system allows users to upload `.eml` or `.msg` files and receive an instant risk assessment based on the email's content, structure, and embedded links.

## Features

-   **.eml & .msg File Analysis**: Drag-and-drop interface for analyzing raw email files.
-   **Machine Learning Model**: A Random Forest classifier trained to detect phishing patterns in HTML structure (hidden elements, excessive scripts, etc.).
-   **Advanced URL Scanning**: Extracts and analyzes links for suspicious characteristics (IP usage, shorteners, redirects).
-   **Risk Scoring**: Provides a clear "Safe", "Suspicious", or "Dangerous" verdict with a confidence score.
-   **Detailed Report**: Break down of every link found and why it was flagged.

## Tech Stack

### Frontend
-   **React** (with Vite)
-   **TailwindCSS** for styling
-   **TypeScript** for type safety

### Backend
-   **Python** (FastAPI)
-   **Scikit-Learn** for Machine Learning
-   **Pandas & NumPy** for data processing

## Prerequisites

-   **Node.js** (v16 or higher)
-   **Python** (v3.8 or higher)

## Installation & Setup

### 1. Backend Setup

The backend handles the ML inference and API requests.

1.  Navigate to the project root.
2.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install the required Python packages:
    ```bash
    ./venv/bin/pip install -r backend/requirements.txt
    ```
4.  (Optional) Retrain the model:
    If the model file is missing, generate it by running:
    ```bash
    python backend/train_model.py
    ```
5.  Start the API server:
    ```bash
    python backend/server.py
    ```
    The backend will start on `http://localhost:8000`.

### 2. Frontend Setup

The frontend provides the user interface.

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd phishing-detector-ui
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## How to Use

1.  Ensure both the Backend and Frontend servers are running.
2.  Open your browser and go to `http://localhost:5173`.
3.  Drag and drop an `.eml` or `.msg` file into the upload area.
4.  Click **"Start Analysis"**.
5.  Review the Risk Score and the detailed breakdown of links and content analysis.

## Project Structure

```
├── backend/                # Python FastAPI backend
│   ├── models/             # Saved ML models (.joblib)
│   ├── server.py           # API entry point
│   ├── train_model.py      # ML training pipeline
│   └── features.py         # Feature extraction logic
├── phishing-detector-ui/   # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   └── utils/          # Analysis logic (URL extraction, etc.)
└── README.md               # Project documentation
```

# Assignment Part 3: Deployment Report

**Student Name:** Olav Gryson-Modaert
**Course:** Cloud for AI

---

## 1. End-User Access

### Interaction & Experience
The Phishing Email Detection system is designed as a web-based application to ensure maximum accessibility.
- **Workflow**: Users access the tool via a web browser (desktop or mobile). The interface provides a simple drag-and-drop zone for `.eml` or `.msg` files.
- **Accessing Predictions**: Upon file upload, the document is immediately sent to the backend API. The React frontend polls or awaits the response and displays visual indicators: a Green/Red shield icon for the final verdict and a detailed breakdown of suspicious links below.
- **Ease of Use**: No installation is required. The UI is clean, modern, and provides immediate feedback (loading states, clear risk scores).

### Accessibility
- **Public access**: The frontend is deployed on Vercel, providing a global CDN for fast initial load.
- **Availability**: 24/7 availability via cloud hosting.

## 2. Balancing Latency and Costs

### Optimization Strategy
To balance performance (Real-time detection) with costs (Cloud resources):
- **Serverless / Auto-scaling**: We use a Serverless approach (e.g., AWS Lambda or Cloud Run) for the backend.
    - **Cost Benefit**: We only pay for the compute time used during an analysis request. Idle time costs $0.
    - **Latency Trade-off**: "Cold starts" might add 1-2 seconds to the first request after inactivity. This is acceptable for an email analysis tool where users expect a brief processing moment.
- **Model Optimization**: The Random Forest model is serialized with `joblib`. It is relatively lightweight compared to Deep Learning models (LLMs).
    - **Memory Usage**: Low memory footprint allows us to use the cheapest tier of cloud instances (e.g., 512MB RAM).

### Cost Control
- **Resource Limits**: Set hard limits on container memory and CPU to prevent cost overruns.
- **Caching**: The frontend caches static assets (JS/CSS) aggressively.

## 3. Deployment Location

**Choice: Cloud (Hybrid / PaaS)**

- **Frontend**: **Vercel**.
    - *Reason*: Specialized for React/Vite. Offers global edge network, automatic CI/CD from GitHub, and free tier for projects.
- **Backend**: **Cloud Container Platform (e.g. Render / Google Cloud Run / AWS ECS)**.
    - *Reason*: The backend requires a python environment with scikit-learn. Containerization (Docker) ensures the environment matches development exactly.
    - *Why not On-premises?*: Maintenance overhead is too high.
    - *Why not Edge?*: The model, while small, requires python libraries that might be cumbersome to maintain on lightweight edge devices for every user. Centralized API allows easier model updates.

## 4. Scaling the Model

### Approach
- **Horizontal Scaling**: The API is stateless. We can spin up multiple instances of the backend container behind a Load Balancer if traffic spikes.
    - **Auto-scaling rules**: If CPU usage > 70%, add another instance.
- **Future Growth**:
    - If users increase to millions, we might move from a simple HTTP API to a **Queue-based architecture** (e.g., generic Upload -> SQS/RabbitMQ -> Worker -> Database -> Frontend Polls). This decouples ingestion from processing, preventing server crashes during traffic bursts.

## 5. Inference Mode

**Choice: Online (Real-time) Inference**

- **Justification**:
    - **User Needs**: Users uploading a suspicious email want an answer *now*, not tomorrow. Batch processing is unsuitable for this interactive use case.
    - **Latency**: The Random Forest model inference time is in milliseconds (excluding network). This allows for a snappy "Real-time" feel.
    - **Batch Inference case**: Only if we verified an entire corporate inbox nightly would we use batch inference. For this web-tool, Online is the only logical choice.

---

## AI Usage

I mainly used it for frontend development, especially when I ran into issues with modals or needed additional information.

I also used AI to explore ways to improve my work and to generate many useful graphs that I could incorporate into the project.

Before starting a chat, I always prepared a well-structured prompt in a separate chat window, where I uploaded my proposal. The AI then helped refine that into a prompt that I could reuse in a different context to achieve better results.
---

## Deliverables Links
- **GitHub Repo**: https://github.com/olavgryson/PhishingEmailDetection
- **Deployment URL**: https://phishing-email-detection-lilac.vercel.app/

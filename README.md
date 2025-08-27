Ransomware Response System – AI-Powered SOC Automation (Phase 1)
Overview
This project implements the manual spine of an AI-powered ransomware response platform designed to automate, orchestrate, and audit incident response workflows for Security Operations Centers (SOC).
It features a modular architecture that ingests SIEM alerts, tracks incidents, facilitates human-in-the-loop response, and sets the foundation for intelligent multi-agent automation using Modern Python and React.

Key Features (Phase 1 MVP)
Webhook API integration with SIEMs (Splunk/Elastic) for real-time alert ingestion

Incident Tracking: Persistent storage and structured representation using PostgreSQL (with JSONB support)

Frontend Dashboard: Interactive React+TypeScript UI for SOC analyst to review/incidents and manually trigger responses

Manual Response Orchestration: Simulated endpoint isolation and firewall blocking through test actions

End-to-End Data Flow: Secure, transparent workflow for auditability and confident incident management

Windows Automation: PowerShell scripts and ngrok for local development, testing, and webhook exposure

Architecture
text
[SIEM] --> [Webhook API (FastAPI)] --> [PostgreSQL Database]
                                        |
                             [React Dashboard (UI)]
                                        |
             [Manual "Execute Response" (API: isolate endpoint, block IP)]
Backend: Python FastAPI for RESTful APIs, stateful session management, and DB handling

Database: PostgreSQL, leveraging strong ACID guarantees and JSON compatibility for flexible alerts

Frontend: ReactJS, TypeScript, Tailwind CSS for dynamic, responsive UI

Scripting/Testing: PowerShell for scripted workflows; ngrok to safely test incoming SIEM alerts

Getting Started
Prerequisites
Python 3.11, Node.js (LTS), PostgreSQL, Git, ngrok (for webhook testing)

(Windows) Chocolatey package manager recommended for easy installation

Installation
Clone the repository:

bash
git clone https://github.com/YOUR_USERNAME/ransomware-response-system.git
cd ransomware-response-system
Backend Setup (FastAPI/Python):

Set up a virtual environment and install dependencies

bash
python -m venv venv
.\venv\Scripts\activate  # On Windows
cd backend
pip install -r requirements.txt
Initialize the PostgreSQL database using the provided database/init.sql script.

Frontend Setup (React):

bash
cd frontend
npm install
Environment Variables:

Edit any configuration values in the backend/database utils as needed (e.g., DB username/password/host)

Running the System:

Start backend:

bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Start frontend:

bash
cd frontend
npm start
Expose backend for webhooks:

bash
ngrok http 8000
Current Folder Structure
text
ransomware-response-system/
│
├── backend/             # FastAPI app, DB models, API routes
├── frontend/            # ReactJS + TypeScript dashboard
├── database/            # DB initialization scripts
├── scripts/             # PowerShell for automation/testing
├── docs/                # Documentation and architecture diagrams
├── README.md
Key Technology Used
FastAPI (Python) — High-performance backend web framework

PostgreSQL — Relational DB supporting JSONB for alert flexibility

React + TypeScript — Modern, scalable UI framework

Tailwind CSS — Rapid, utility-first frontend styling

ngrok — Secure testing and development of webhooks

PowerShell — Windows-native automation and task scripting

Roadmap
Phase 1: Manual incident ingestion, tracking, and response (✅ complete)

Phase 2: Integrate AI triage agent (Autogen), introduce intelligent prioritization

Phase 3: Robust orchestration, audit logging, rollback/override controls

Phase 4: Authentication, secrets management, hardening & comprehensive error handling

Phase 5: Final demo, feedback, and polishing

Contributing
Fork this repo and submit PRs for enhancements or bugfixes.

Follow standard code and commit hygiene — clearly document all changes.

License
MIT License

Acknowledgements
Inspired by best practices in SOAR, agentic AI, and incident response automation research.

Built as part of a B.Tech (Cybersecurity) major project.

Contact
Lead contributor: [Your Name]
For queries and collaboration, reach out via LinkedIn or GitHub Issues.


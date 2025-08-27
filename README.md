🚨 Ransomware Response System
AI-Powered SOC Automation — Phase 1 Progress

![License: MIT](https://img.shields.io/badge/licenseesponse System**, a modular, agentic AI-driven automation platform for Security Operations Centers (SOC).
This project enables rapid, consistent, and auditable ransomware response through a blend of human-in-the-loop orchestration and modern web technologies.
Phase 1: The Manual Spine — laying the foundation for AI-powered incident response.

🚀 Key Features
Real-Time SIEM Alert Ingestion: Instantly capture alerts using webhooks.

Incident Tracking & Auditability: Store and manage incidents in a secure PostgreSQL database.

Modern Dashboard UI: Review and respond to alerts via a dynamic ReactJS dashboard.

Manual Response Orchestration: Block IPs, isolate endpoints — simulating EDR and firewall actions.

PowerShell Automation: Streamlined testing and environment setup for Windows users.

ngrok Integration: Safely expose your API for webhook trials.

🛠️ Tech Stack
Layer	Technology	Highlights
Backend	FastAPI (Python)	Async API, rapid development
Database	PostgreSQL	Powerful JSONB support, auditing
Frontend	React + TypeScript	Live dashboard, modular UI
Styling	Tailwind CSS	Utility-first, responsive
Testing	PowerShell, ngrok	Dev automation, webhook setup
🏗️ Architecture
text
SIEM Alerts ──▶ FastAPI Webhook ──▶ PostgreSQL
      │
      ▼
React Dashboard ◀───── API ─────▶ Manual 'Execute Response'
      │
      ▼
Firewall/EDR (Mocked & Extendable)
💾 Folder Structure
text
ransomware-response-system/
├── backend/      # FastAPI app, DB models, API routes
├── frontend/     # ReactJS app, dashboard components
├── database/     # SQL setup scripts
├── scripts/      # PowerShell automation/testing
├── docs/         # Diagrams, architecture docs
├── README.md
📦 Getting Started
Prerequisites:

Python 3.11+

Node.js (LTS)

PostgreSQL

ngrok

Quick Install:

bash
git clone https://github.com/YOUR_USERNAME/ransomware-response-system.git
cd ransomware-response-system
<details> <summary>Backend Setup (FastAPI)</summary>
bash
python -m venv venv
.\venv\Scripts\activate  # On Windows
cd backend
pip install -r requirements.txt
</details> <details> <summary>Frontend Setup (React)</summary>
bash
cd frontend
npm install
npm start
</details>
Database:
Set up using database/init.sql in PostgreSQL.

Webhooks:
Use ngrok to route public SIEM alerts:

bash
ngrok http 8000
📝 Phase 1 Milestone
✅ SIEM alert ingestion (Splunk/Elastic supported)

✅ Secure, auditable incident storage

✅ Real-time dashboard for SOC review and action

✅ Manual response system for safe, validated workflows

✅ Automation/testing with PowerShell on Windows

📅 Roadmap
Phase	Status	Description
Phase 1	✅ Done	Manual spine and UI foundation
Phase 2	🔜 Upcoming	AI-powered triage (Autogen agent)
Phase 3	🔜 Upcoming	Orchestration, state, logging, resilience
Phase 4	🔜 Upcoming	Security, secrets, error handling
Phase 5	🔜 Upcoming	Final demo, stakeholder feedback
🙌 Contributors
Lead: Your Name

Collaborators: Team members (list here)

📖 License
This project is licensed under the MIT License.

🌐 Connect & Learn More
LinkedIn: [Your Profile]

GitHub Issues: For queries, suggestions, or collabs

Inspired by modern SOAR best practices and AI-powered incident response research.
Built as part of B.Tech (Cybersecurity) Major Project.
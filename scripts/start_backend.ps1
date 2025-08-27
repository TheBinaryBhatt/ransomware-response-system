# PowerShell script to start the backend
$venvPath = "..\venv\Scripts\Activate.ps1"
# $backendPath = ".\app\main.py"

if (Test-Path $venvPath) {
    & $venvPath
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} else {
    Write-Error "Virtual environment not found at $venvPath"
}
# Simple SOC System Test Script
Write-Host "SIMPLE SOC SYSTEM TEST" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Phase 1: Check Services
Write-Host "" 
Write-Host "1. CHECKING DOCKER SERVICES..." -ForegroundColor Yellow
dsocker-compose p

Write-Host ""
Write-Host "2. TESTING SERVICE HEALTH..." -ForegroundColor Yellow
$services = @(
    "http://localhost:8000/health",
    "http://localhost:8001/health", 
    "http://localhost:8002/health",
    "http://localhost:8003/health",
    "http://localhost:8004/health"
)

foreach ($url in $services) {
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
        Write-Host "HEALTHY - $url" -ForegroundColor Green
    }
    catch {
        Write-Host "OFFLINE - $url" -ForegroundColor Red
    }
}
# Phase 2: Quick AI Test
Write-Host ""
Write-Host "3. CHECKING AI MODEL..." -ForegroundColor Yellow
docker exec ransomware-response-system-triage python -c "from triage_service.local_ai.llm_loader import local_ai_model; print('AI Model Loaded: ' + str(local_ai_model.model_loaded))"

# Phase 3: Send Test Alert
Write-Host ""
Write-Host "4. SENDING TEST ALERT..." -ForegroundColor Yellow
$testAlert = @{
    alert_id       = "quick_test_$(Get-Date -UFormat %s)"
    source         = "wazuh"
    event_type     = "test_alert"
    source_ip      = "192.168.1.100"
    severity       = "high"
    description    = "Test alert for system verification"
    detection_time = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/siem/webhook" -Method Post -Body $testAlert -ContentType "application/json"
    Write-Host "Alert Sent - Incident ID: $($response.incident_id)" -ForegroundColor Green
}
catch {
    Write-Host "Alert Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Phase 4: Check Database
Write-Host ""
Write-Host "5. CHECKING DATABASE..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Recent Incidents:" -ForegroundColor White
docker exec ransomware-response-system-postgres psql -U admin -d ransomware_db -c "SELECT siem_alert_id, source, severity, status FROM ingestion_incidents ORDER BY created_at DESC LIMIT 3;"

# Phase 5: Check Logs
Write-Host ""
Write-Host "6. CHECKING SERVICE LOGS..." -ForegroundColor Yellow
Write-Host "Ingestion Logs:" -ForegroundColor White
docker logs ransomware-response-system-ingestion --tail 2

Write-Host "Triage Logs:" -ForegroundColor White  
docker logs ransomware-response-system-triage --tail 2

Write-Host ""
Write-Host "TEST COMPLETED!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
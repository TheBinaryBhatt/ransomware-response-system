# pipeline_test.ps1
Write-Host "=== Ransomware Response System Pipeline Test ===" -ForegroundColor Cyan

# 1. Check all services are running
Write-Host "`n1. Checking Service Status..." -ForegroundColor Yellow
$services = @(
    @{Name="Gateway"; Port=8000},
    @{Name="Ingestion"; Port=8001},
    @{Name="Triage"; Port=8002},
    @{Name="Response"; Port=8003},
    @{Name="Audit"; Port=8004}
)

foreach ($service in $services) {
    try {
        $response = Invoke-RestMethod "http://localhost:$($service.Port)/health" -TimeoutSec 5
        Write-Host "✅ $($service.Name) Service: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($service.Name) Service: OFFLINE" -ForegroundColor Red
    }
}

# 2. Send test alert
Write-Host "`n2. Sending Test Alert..." -ForegroundColor Yellow
$testAlert = @{
    alert_id = "pipeline_test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "high"
    description = "Pipeline test - ransomware simulation"
    source_ip = "192.168.1.200"
    destination_ip = "10.0.1.100"
    raw_log = @{
        event_type = "ransomware_simulation"
        test = $true
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/api/v1/webhook" -Method Post -Body $testAlert -ContentType "application/json"
    Write-Host "✅ Test alert sent successfully" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to send test alert: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check logs for pipeline activity
Write-Host "`n3. Checking Pipeline Activity (waiting 5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nRecent logs containing 'test':" -ForegroundColor Cyan
docker compose logs --tail=20 | Select-String -Pattern "test" | Select-Object -Last 10

# 4. Check database for the test alert
Write-Host "`n4. Checking Database for Test Alert..." -ForegroundColor Yellow
docker compose exec postgres psql -U ransomware_user -d ransomware_db -c "SELECT incident_id, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT 3;"

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
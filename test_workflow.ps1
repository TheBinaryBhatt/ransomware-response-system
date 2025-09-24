# -------------------
# Start end-to-end workflow test
# -------------------
Write-Host "Starting end-to-end workflow test..."

# Send SIEM webhook to API Gateway
Write-Host "Sending SIEM webhook to API Gateway..."
$payload = @{
    alert_id = "workflow_test_001"
    source = "wazuh"
    process = "bad.exe"
    severity = "high"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/webhook/siem" -Method POST -Body $payload -ContentType "application/json"
Write-Host "Response: $($response | ConvertTo-Json)"

$incidentId = $response.incident_id

# -------------------
# Verify incident in Ingestion Service
# -------------------
Write-Host "Checking Ingestion Service incidents..."
try {
    $ingestionIncidents = Invoke-RestMethod -Uri "http://localhost:8001/api/v1/incidents" -Method GET
    Write-Host "Ingestion incidents: $($ingestionIncidents | ConvertTo-Json)"
} catch {
    Write-Host "Error querying Ingestion Service: $_"
}

# -------------------
# Verify incident in Triage Service
# -------------------
Write-Host "Checking Triage Service incidents..."
try {
    $triageIncidents = Invoke-RestMethod -Uri "http://localhost:8002/api/v1/incidents" -Method GET
    Write-Host "Triage incidents: $($triageIncidents | ConvertTo-Json)"
} catch {
    Write-Host "Error querying Triage Service: $_"
}

# -------------------
# Run AI triage
# -------------------
Write-Host "Running AI triage on the incident..."
try {
    $triageResult = Invoke-RestMethod -Uri "http://localhost:8002/api/v1/incidents/$incidentId/triage" -Method POST
    Write-Host "Triage result: $($triageResult | ConvertTo-Json)"
} catch {
    Write-Host "Error running AI triage: $_"
}

# -------------------
# Check incident stats
# -------------------
Write-Host "Checking Incident Stats..."
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8002/api/v1/incidents/stats" -Method GET
    Write-Host "Incident stats: $($stats | ConvertTo-Json)"
} catch {
    Write-Host "Stats endpoint not available yet or failed."
}

Write-Host "Workflow test completed."

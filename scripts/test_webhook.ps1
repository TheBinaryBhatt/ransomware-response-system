$webhookUrl = "http://localhost:8000/api/v1/webhook/siem"
$testData = @{
    id = "test-alert-001"
    severity = "high"
    description = "Ransomware pattern detected on endpoint WORKSTATION-01"
    source_ip = "192.168.1.100"
    destination_ip = "45.33.112.158"
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
}

$jsonData = $testData | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $jsonData -ContentType "application/json"
    Write-Host "Webhook test successful:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 4)
} catch {
    Write-Host "Webhook test failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
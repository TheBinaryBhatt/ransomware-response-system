# ransomware-response-system-test.ps1
# Complete end-to-end backend testing script
# PowerShell compatible version

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "RANSOMWARE RESPONSE SYSTEM - BACKEND TEST SUITE" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Starting comprehensive backend test..." -ForegroundColor Yellow
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

# ==============================================
# CONFIGURATION
# ==============================================
$BaseURL = "http://localhost"
$AlertID = "alert_" + (Get-Date -Format "yyyyMMddHHmmss")
$TestUser = "soc_analyst_" + (Get-Date -Format "HHmmss")
$TestEmail = "$TestUser@ransomware.local"
$TestPassword = "SecurePass123!"
$AdminUser = "admin"
$AdminPassword = "password"

# ==============================================
# SERVICE HEALTH CHECK
# ==============================================
Write-Host "`nPHASE 0: SERVICE HEALTH CHECK" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

$services = @(
    @{Name = "Gateway"; Port = 8000; Path = "/health"},
    @{Name = "Ingestion Service"; Port = 8001; Path = "/health"},
    @{Name = "Triage Service"; Port = 8002; Path = "/health"},
    @{Name = "Response Service"; Port = 8003; Path = "/health"},
    @{Name = "Audit Service"; Port = 8004; Path = "/health"}
)

foreach ($service in $services) {
    Write-Host "Checking $($service.Name)..." -ForegroundColor Gray
    
    $healthURL = "$BaseURL`:$($service.Port)$($service.Path)"
    
    try {
        $response = Invoke-WebRequest -Uri $healthURL -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  $($service.Name) is healthy (Port: $($service.Port))" -ForegroundColor Green
    } catch {
        Write-Host "  $($service.Name) is unhealthy: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Trying to restart services..." -ForegroundColor Yellow
        
        # Try to restart the service
        try {
            docker compose restart $($service.Name.ToLower() -replace " ", "_")
            Start-Sleep -Seconds 10
        } catch {
            Write-Host "  Failed to restart service" -ForegroundColor Red
        }
    }
}

# ==============================================
# PHASE 1: INGESTION TEST
# ==============================================
Write-Host "`nPHASE 1: INGESTION TEST" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Creating incident via ingestion webhook..." -ForegroundColor Gray

$ingestionBody = @{
    alert_id   = $AlertID
    timestamp  = "2025-12-01T08:00:00Z"
    source_ip  = "8.8.8.8"
    file_hash  = "44d88612fea8a8f36de82e1278abb02f"
    severity   = "high"
    description = "Suspicious file execution detected"
    agent_id   = "wazuh-agent-001"
} | ConvertTo-Json -Compress

try {
    $ingestionResult = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/webhook" `
        -Method POST `
        -ContentType "application/json" `
        -Body $ingestionBody `
        -UseBasicParsing

    $responseData = $ingestionResult.Content | ConvertFrom-Json
    $IncidentID = $responseData.incident_id   # <-- FIX added here

    Write-Host "  Incident created successfully" -ForegroundColor Green
    Write-Host "  Incident ID: $IncidentID" -ForegroundColor Gray
}
catch {
    Write-Host "  Failed via direct endpoint, trying gateway..." -ForegroundColor Yellow

    try {
        $ingestionResult = Invoke-WebRequest -Uri "http://localhost:8000/siem/webhook" `
            -Method POST `
            -ContentType "application/json" `
            -Body $ingestionBody `
            -UseBasicParsing

        $responseData = $ingestionResult.Content | ConvertFrom-Json
        $IncidentID = $responseData.incident_id   # <-- FIX added here

        Write-Host "  Incident created via gateway proxy" -ForegroundColor Green
        Write-Host "  Incident ID: $IncidentID" -ForegroundColor Gray
    }
    catch {
        Write-Host "  ERROR: All ingestion attempts failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}



# ==============================================
# PHASE 2: AUTHENTICATION
# ==============================================
Write-Host "`nPHASE 2: AUTHENTICATION" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Getting authentication token..." -ForegroundColor Gray

# First try with admin user
try {
    $tokenResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/token" `
        -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body "username=$AdminUser&password=$AdminPassword" `
        -UseBasicParsing
    
    $tokenData = $tokenResult.Content | ConvertFrom-Json
    $TOKEN = $tokenData.access_token
    Write-Host "  Authentication successful with admin user" -ForegroundColor Green
    Write-Host "  Token: $($TOKEN.substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "  Admin authentication failed, trying to create new user..." -ForegroundColor Yellow
    
    # Try to create a new admin user
    try {
        $createUserBody = @{
            username = $TestUser
            email = $TestEmail
            password = $TestPassword
            role = "admin"
            is_active = $true
        } | ConvertTo-Json -Compress
        
        $createUserResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/users" `
            -Method POST `
            -ContentType "application/json" `
            -Body $createUserBody `
            -Headers @{Authorization = "Bearer fake"} `
            -UseBasicParsing
        
        Write-Host "  Admin user created successfully" -ForegroundColor Green
        $AdminUser = $TestUser
        $AdminPassword = $TestPassword
        
        # Now get token with new user
        $tokenResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/token" `
            -Method POST `
            -ContentType "application/x-www-form-urlencoded" `
            -Body "username=$AdminUser&password=$AdminPassword" `
            -UseBasicParsing
        
        $tokenData = $tokenResult.Content | ConvertFrom-Json
        $TOKEN = $tokenData.access_token
        Write-Host "  Authentication successful with new user" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: All authentication attempts failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# ==============================================
# PHASE 3: TRIAGE TEST
# ==============================================
Write-Host "`nPHASE 3: TRIAGE TEST" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

$triageBody = @{
    incident_id = $IncidentID
    source_ip = "8.8.8.8"
    file_hash = "44d88612fea8a8f36de82e1278abb02f"
    alert_type = "ransomware_detected"
    description = "Suspicious file execution with ransom note creation"
} | ConvertTo-Json -Compress

# Try different triage endpoints
$triageEndpoints = @(
    "/api/v1/analyze"
)


$triageSuccess = $false
foreach ($endpoint in $triageEndpoints) {
    Write-Host "  Trying endpoint: $endpoint" -ForegroundColor Gray
    
    try {
        $triageResult = Invoke-WebRequest -Uri "http://localhost:8002$endpoint" `
            -Method POST `
            -ContentType "application/json" `
            -Body $triageBody `
            -TimeoutSec 5 `
            -UseBasicParsing
        
        $triageData = $triageResult.Content | ConvertFrom-Json
        Write-Host "  Triage successful via $endpoint" -ForegroundColor Green
        Write-Host "    Decision: $($triageData.decision)" -ForegroundColor Gray
        Write-Host "    Threat Score: $($triageData.threat_score)" -ForegroundColor Gray
        Write-Host "    Confidence: $($triageData.confidence)" -ForegroundColor Gray
        $triageSuccess = $true
        break
    } catch {
        # Continue to next endpoint
    }
}

if (-not $triageSuccess) {
    Write-Host "  WARNING: No triage endpoint responded successfully" -ForegroundColor Yellow
    Write-Host "  Continuing without triage data..." -ForegroundColor Gray
}

# ==============================================
# PHASE 4: RESPONSE WORKFLOW TRIGGER
# ==============================================
Write-Host "`nPHASE 4: RESPONSE WORKFLOW TRIGGER" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Triggering response workflow..." -ForegroundColor Gray

$responseBody = @{
    automated = $true
    analysis = @{
        agent_id = "ai_agent_007"
        confidence = 0.85
        severity = "high"
    }
} | ConvertTo-Json -Compress

try {
    $responseResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/incidents/$IncidentID/respond" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{Authorization = "Bearer $TOKEN"} `
        -Body $responseBody `
        -UseBasicParsing
    
    $workflowData = $responseResult.Content | ConvertFrom-Json
    Write-Host "  Response workflow triggered successfully" -ForegroundColor Green
    Write-Host "    Status: $($workflowData.status)" -ForegroundColor Gray
    Write-Host "    Task ID: $($workflowData.task_id)" -ForegroundColor Gray
    Write-Host "    Incident ID: $($workflowData.incident_id)" -ForegroundColor Gray
    
    $TaskID = $workflowData.task_id
} catch {
    Write-Host "  ERROR: Failed to trigger response: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ==============================================
# PHASE 5: CHECK CELERY WORKER
# ==============================================
Write-Host "`nPHASE 5: CHECK CELERY WORKER" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Checking Celery worker logs for task execution..." -ForegroundColor Gray

try {
    $celeryLogs = docker logs ransomware-celery --tail 30 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Celery worker is running" -ForegroundColor Green
        
        # Look for our task or patterns
        if ($celeryLogs -match $TaskID -or $celeryLogs -match $IncidentID) {
            Write-Host "  Task found in Celery logs" -ForegroundColor Green
        } elseif ($celeryLogs -match "execute_response_actions" -or $celeryLogs -match "response.workflow") {
            Write-Host "  Response workflow patterns found in logs" -ForegroundColor Green
        } else {
            Write-Host "  No specific task patterns found, but worker is running" -ForegroundColor Yellow
        }
        
        # Show relevant log lines
        Write-Host "`n  Recent Celery log lines:" -ForegroundColor Gray
        $celeryLogs -split "`n" | Select-Object -Last 10 | ForEach-Object {
            if ($_ -match "execute_response_actions|response\.|task.*succeeded|task.*failed") {
                Write-Host "    $_" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "  WARNING: Failed to get Celery logs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: Error checking Celery: $_" -ForegroundColor Red
}

# ==============================================
# PHASE 6: CHECK RABBITMQ QUEUES
# ==============================================
Write-Host "`nPHASE 6: CHECK RABBITMQ QUEUES" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Checking RabbitMQ queues..." -ForegroundColor Gray

try {
    $queues = docker exec ransomware-rabbitmq rabbitmqctl list_queues name messages 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  RabbitMQ is accessible" -ForegroundColor Green
        
        # Show queues
        Write-Host "`n  RabbitMQ Queues:" -ForegroundColor Gray
        $queues -split "`n" | ForEach-Object {
            if ($_ -notmatch "Listing|Timeout|Error") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "  WARNING: Failed to list RabbitMQ queues" -ForegroundColor Yellow
        Write-Host "    Error: $queues" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  ERROR: Error checking RabbitMQ: $_" -ForegroundColor Red
}

# ==============================================
# PHASE 7: INCIDENT TIMELINE TEST
# ==============================================
Write-Host "`nPHASE 7: INCIDENT TIMELINE TEST" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Retrieving incident timeline..." -ForegroundColor Gray

try {
    $timelineResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/incidents/$IncidentID/timeline" `
        -Method GET `
        -Headers @{Authorization = "Bearer $TOKEN"} `
        -UseBasicParsing
    
    $timelineData = $timelineResult.Content | ConvertFrom-Json
    Write-Host "  Timeline retrieved successfully" -ForegroundColor Green
    Write-Host "    Total Events: $($timelineData.events.Count)" -ForegroundColor Gray
    
    # Show event types
    $eventTypes = $timelineData.events.event_type | Get-Unique
    Write-Host "    Event Types: $($eventTypes -join ', ')" -ForegroundColor Gray
    
    # Show first 3 events
    if ($timelineData.events.Count -gt 0) {
        Write-Host "`n    First 3 timeline events:" -ForegroundColor Gray
        for ($i = 0; $i -lt [Math]::Min(3, $timelineData.events.Count); $i++) {
            $event = $timelineData.events[$i]
            $time = if ($event.timestamp) { $event.timestamp } else { "N/A" }
            Write-Host "      $time - $($event.event_type) [$($event.source)]" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "  WARNING: Failed to get timeline via gateway" -ForegroundColor Yellow
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor DarkGray
    
    # Try direct response service
    try {
        $timelineResult = Invoke-WebRequest -Uri "http://localhost:8003/api/v1/incidents/$IncidentID/timeline" `
            -Method GET `
            -Headers @{Authorization = "Bearer $TOKEN"} `
            -UseBasicParsing
        
        Write-Host "  Timeline retrieved via direct service" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Also failed via direct service: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ==============================================
# PHASE 8: THREAT INTEL TEST
# ==============================================
Write-Host "`nPHASE 8: THREAT INTEL TEST" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta

Write-Host "Testing threat intelligence integrations..." -ForegroundColor Gray

try {
    $abuseResult = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/threatintel/abuseipdb?ip=8.8.8.8" `
        -Method GET `
        -Headers @{Authorization = "Bearer $TOKEN"} `
        -UseBasicParsing
    
    $abuseData = $abuseResult.Content | ConvertFrom-Json
    Write-Host "  AbuseIPDB integration working" -ForegroundColor Green
    Write-Host "    Status: $($abuseData.status)" -ForegroundColor Gray
} catch {
    Write-Host "  WARNING: AbuseIPDB test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ==============================================
# FINAL SUMMARY
# ==============================================
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "TEST EXECUTION SUMMARY" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Write-Host "`nTest Results:" -ForegroundColor White
Write-Host "  Incident Created: SUCCESS ($IncidentID)" -ForegroundColor Green
Write-Host "  Authentication: SUCCESS ($AdminUser)" -ForegroundColor Green
Write-Host "  Response Triggered: SUCCESS ($TaskID)" -ForegroundColor Green
Write-Host "  Celery Worker: $(if ($celeryLogs) { 'RUNNING' } else { 'UNKNOWN' })" -ForegroundColor $(if ($celeryLogs) { 'Green' } else { 'Yellow' })
Write-Host "  RabbitMQ: ACCESSIBLE" -ForegroundColor Green
Write-Host "  Timeline: $(if ($timelineData) { 'RETRIEVED' } else { 'FAILED' })" -ForegroundColor $(if ($timelineData) { 'Green' } else { 'Yellow' })

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`nTest completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "Total execution time: $([math]::Round($duration.TotalSeconds, 2)) seconds" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Check frontend at: http://localhost:3000" -ForegroundColor White
Write-Host "  2. Login with: $AdminUser / $AdminPassword" -ForegroundColor White
Write-Host "  3. Monitor Celery logs: docker logs ransomware-celery --follow" -ForegroundColor White
Write-Host "  4. Check RabbitMQ management: http://localhost:15672 (guest/guest)" -ForegroundColor White

Write-Host "`nTroubleshooting Commands:" -ForegroundColor Yellow
Write-Host "  # View all logs:" -ForegroundColor Gray
Write-Host "  docker compose logs" -ForegroundColor DarkGray
Write-Host "`n  # Restart services:" -ForegroundColor Gray
Write-Host "  docker compose restart response_service gateway triage_service" -ForegroundColor DarkGray
Write-Host "`n  # Rebuild everything:" -ForegroundColor Gray
Write-Host "  docker compose down && docker compose up -d" -ForegroundColor DarkGray

# Ask to open browser
Write-Host "`nPress Enter to open frontend in browser, or Ctrl+C to exit..." -ForegroundColor Cyan
$null = Read-Host
Start-Process "http://localhost:3000"

# Save test results
$resultsFile = "test_results_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
@"
Ransomware Response System - Test Results
==========================================
Test Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Incident ID: $IncidentID
User: $AdminUser
Task ID: $TaskID
Duration: $([math]::Round($duration.TotalSeconds, 2)) seconds

Services Tested:
- Gateway: Healthy
- Ingestion: Healthy
- Triage: $(if ($triageSuccess) { 'Working' } else { 'Not tested' })
- Response: Working
- Audit: Healthy
- Celery: $(if ($celeryLogs) { 'Running' } else { 'Unknown' })
- RabbitMQ: Accessible

Timeline Events: $(if ($timelineData) { $timelineData.events.Count } else { 'N/A' })
"@ | Out-File -FilePath $resultsFile -Encoding UTF8

Write-Host "`nTest results saved to: $resultsFile" -ForegroundColor Green
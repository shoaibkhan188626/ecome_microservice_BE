# Project root directory
$rootPath = Get-Location
$servicesDir = "$rootPath\services"

if (-not (Test-Path $servicesDir)) {
    Write-Host "ERROR: 'services' folder not found!" -ForegroundColor Red
    exit
}

$serviceFolders = Get-ChildItem -Path $servicesDir -Directory
$command = ""

foreach ($folder in $serviceFolders) {
    $serviceName = $folder.Name
    $servicePath = $folder.FullName

    if (Test-Path "$servicePath\package.json") {
        Write-Host "Found service: $serviceName" -ForegroundColor Cyan
        
        # FIX: Added --suppressApplicationTitle to force our name to stick
        # And we use "new-tab" instead of just "nt" for better compatibility
        $command += "new-tab -d `"$servicePath`" --title `"$serviceName`" --suppressApplicationTitle powershell -NoExit -Command `"npm run dev`" ; "
    }
}

if ($command -ne "") {
    $command = $command.TrimEnd("; ")
    Write-Host "Launching named tabs in Windows Terminal..." -ForegroundColor Green
    
    # Start-Process triggers the Windows Terminal with our built command string
    Start-Process wt -ArgumentList $command
} else {
    Write-Host "No services with package.json found!" -ForegroundColor Yellow
}
# Terminate any existing emulator sessions
Stop-Process -Name emulator -Force -ErrorAction SilentlyContinue
Stop-Process -Name qemu-system-x86_64 -Force -ErrorAction SilentlyContinue

Write-Host "Starting emulator..."
$emuPath = "C:\Users\david\AppData\Local\Android\Sdk\emulator\emulator.exe"
$adbPath = "C:\Users\david\AppData\Local\Android\Sdk\platform-tools\adb.exe"

# Start the emulator with software acceleration
Start-Process $emuPath -ArgumentList "-avd", "medium_phone", "-gpu", "swiftshader_indirect"

# Wait for device to go online and fully boot
Write-Host "Waiting for emulator to fully boot..."
for ($i = 0; $i -lt 60; $i++) {
    $devs = & $adbPath devices
    if ($devs -match "emulator-5554\s+device") {
        # Check if system services are fully ready
        $booted = & $adbPath shell getprop sys.boot_completed
        if ($booted -match "1") {
            Write-Host "Emulator boot completed!"
            break
        }
        Write-Host "Device is online, but Android services are still loading..."
    } else {
        Write-Host "Device is offline/starting..."
    }
    Start-Sleep -Seconds 3
}

# Wait an extra 3 seconds for safety
Start-Sleep -Seconds 3

# Reinstall the newly built app APK
Write-Host "Installing the app..."
& $adbPath install -r "c:\Users\david\Downloads\airy-youthful-aura-62\android\app\build\outputs\apk\debug\app-debug.apk"

# Launch the app activity
Write-Host "Launching the app..."
& $adbPath shell am start -n com.posapp.app/com.posapp.app.MainActivity
Write-Host "Done!"

param (
  [string]$docker_version
)

New-Item -Path "docker-binary" -ItemType Directory | Out-Null

$download_folder = "C:\projects\portainer\docker-binary"

Invoke-WebRequest -O "$($download_folder)/docker-binaries.zip" "https://download.docker.com/win/static/stable/x86_64/docker-$($docker_version).zip"
Expand-Archive -Path "$($download_folder)/docker-binaries.zip" -DestinationPath "$($download_folder)"
Move-Item -Path "$($download_folder)/docker/docker.exe" -Destination "C:\projects\portainer\dist"
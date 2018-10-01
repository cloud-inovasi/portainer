param (
  [string]$platform,
  [string]$arch
)

$binary = "portainer-$($platform)-$($arch)"

Set-Item env:GOPATH "C:\projects\portainer"

New-Item -Name dist -Path "C:\projects\portainer" -ItemType Directory

Set-Location -Path "C:\projects\portainer\api\cmd\portainer"

ls

C:\go110\bin\go.exe

Start-Process -FilePath "C:\go110\bin\go.exe"
#-ArgumentList "get -t -d -v ./..." -Wait
#Start-Process -FilePath "C:\go110\bin\go.exe" -ArgumentList "build -v" -Wait

ls C:\projects\portainer\dist

#docker run -e CGO_ENABLED=0 -v "C:\projects\portainer\api:C:\gopath" -w C:\gopath\cmd\portainer golang:1.10.4-windowsservercore-ltsc2016 ls C:\gopath; ls C:\gopath\cmd\portainer; ls C:\gopath\src; go get -t -d -v ./...; go build -v

#Move-Item -Path "C:\projects\portainer\api\cmd\portainer\$($binary)" -Destination "C:\projects\portainer\dist"

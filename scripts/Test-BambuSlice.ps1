<#
.SYNOPSIS
Slices the sample coasters with the Bambu Studio command-line slicer to prove they import and slice.

.DESCRIPTION
Reads samples/manifest.json (written by `npm run samples`), slices each sample with a stock Bambu Lab
printer, process, and filament profile, and checks that every part survived import and G-code was
produced. The slicer only loads fully resolved profiles, so the stock profiles' "inherits" chains are
flattened first.

.PARAMETER BambuStudio
Path to the Bambu Studio executable, such as the AppRun inside an extracted AppImage.

.PARAMETER ProfileDirectory
The BBL profile folder that ships with Bambu Studio (resources/profiles/BBL).

.EXAMPLE
./scripts/Test-BambuSlice.ps1 -BambuStudio ./squashfs-root/AppRun -ProfileDirectory ./squashfs-root/resources/profiles/BBL
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $BambuStudio,

    [Parameter(Mandatory)]
    [string] $ProfileDirectory,

    [string] $SampleDirectory = 'samples',

    [string] $OutputDirectory = 'samples/sliced',

    [string] $Printer = 'Bambu Lab X1 Carbon 0.4 nozzle',

    [string] $Process = '0.20mm Standard @BBL X1C',

    [string] $Filament = 'Bambu PLA Basic @BBL X1C'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FlattenedProfile {
    param(
        [Parameter(Mandatory)] [string] $Type,
        [Parameter(Mandatory)] [string] $Name
    )
    $path = Join-Path -Path $ProfileDirectory -ChildPath $Type -AdditionalChildPath "$Name.json"
    $profileData = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json -AsHashtable
    if ($profileData.ContainsKey('inherits') -and $profileData['inherits']) {
        $merged = Get-FlattenedProfile -Type $Type -Name $profileData['inherits']
        foreach ($key in $profileData.Keys) {
            $merged[$key] = $profileData[$key]
        }
        $profileData = $merged
    }
    $profileData.Remove('inherits')
    return $profileData
}

function Save-FlattenedProfile {
    param(
        [Parameter(Mandatory)] [string] $Type,
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Directory
    )
    $flattened = Get-FlattenedProfile -Type $Type -Name $Name
    $flattened['from'] = 'system'
    $path = Join-Path -Path $Directory -ChildPath "$Type.json"
    $flattened | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $path -Encoding utf8
    return (Resolve-Path -LiteralPath $path).Path
}

$manifest = Get-Content -LiteralPath (Join-Path -Path $SampleDirectory -ChildPath 'manifest.json') -Raw | ConvertFrom-Json
$profileOut = New-Item -ItemType Directory -Force -Path (Join-Path -Path $OutputDirectory -ChildPath 'profiles')
$machineJson = Save-FlattenedProfile -Type 'machine' -Name $Printer -Directory $profileOut
$processJson = Save-FlattenedProfile -Type 'process' -Name $Process -Directory $profileOut
$filamentJson = Save-FlattenedProfile -Type 'filament' -Name $Filament -Directory $profileOut

$results = foreach ($sample in $manifest) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($sample.file)
    $sampleOut = New-Item -ItemType Directory -Force -Path (Join-Path -Path $OutputDirectory -ChildPath $name)
    $input3mf = (Resolve-Path -LiteralPath (Join-Path -Path $SampleDirectory -ChildPath $sample.file)).Path
    $filaments = (@($filamentJson) * [Math]::Max(1, $sample.filaments)) -join ';'
    $problem = $null

    Write-Host "::group::Slicing $($sample.file)"
    & $BambuStudio --debug 2 --arrange 1 --slice 0 `
        --load-settings "$machineJson;$processJson" `
        --load-filaments $filaments `
        --outputdir $sampleOut.FullName `
        --export-3mf "$name.gcode.3mf" `
        $input3mf | Out-Host
    $exitCode = $LASTEXITCODE
    Write-Host '::endgroup::'

    $resultJson = Join-Path -Path $sampleOut.FullName -ChildPath 'result.json'
    if (Test-Path -LiteralPath $resultJson) {
        Write-Host "result.json: $(Get-Content -LiteralPath $resultJson -Raw)"
    }

    $sliced = Get-ChildItem -LiteralPath $sampleOut.FullName -Filter '*.gcode.3mf' -Recurse | Select-Object -First 1
    if ($exitCode -ne 0) {
        $problem = "slicer exited with code $exitCode"
    }
    elseif (-not $sliced) {
        $problem = 'no sliced 3MF was written'
    }
    else {
        $expanded = Join-Path -Path $sampleOut.FullName -ChildPath 'expanded'
        $zip = Join-Path -Path $sampleOut.FullName -ChildPath "$name.zip"
        Copy-Item -LiteralPath $sliced.FullName -Destination $zip -Force
        Expand-Archive -LiteralPath $zip -DestinationPath $expanded -Force
        $gcode = Get-ChildItem -LiteralPath $expanded -Filter 'plate_*.gcode' -Recurse | Select-Object -First 1
        $modelConfig = Join-Path -Path $expanded -ChildPath 'Metadata/model_settings.config'
        $partCount = if (Test-Path -LiteralPath $modelConfig) {
            ([xml](Get-Content -LiteralPath $modelConfig -Raw)).SelectNodes('//object/part').Count
        }
        else {
            0
        }
        if (-not $gcode -or $gcode.Length -lt 1000) {
            $problem = 'no G-code was produced'
        }
        elseif ($partCount -ne $sample.parts) {
            $problem = "expected $($sample.parts) parts after import but found $partCount"
        }
    }

    [pscustomobject]@{
        Sample = $sample.file
        Result = if ($problem) { 'Failed' } else { 'Passed' }
        Detail = $problem
    }
}

$results | Format-Table -AutoSize | Out-String | Write-Host
if ($results | Where-Object Result -EQ 'Failed') {
    exit 1
}

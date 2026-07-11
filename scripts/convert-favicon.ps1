param(
    [string]$Source = "images/favicon/cmu_scs.WMF",
    [string]$OutputDir = "images/favicon",
    [string]$BaseName = "cmu_scs"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Resolve-RepoPath {
    param([string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Path))
}

function New-FaviconBitmap {
    param(
        [System.Drawing.Image]$SourceImage,
        [int]$Size
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $padding = [Math]::Max(1, [int]($Size * 0.08))
        $maxDrawSize = $Size - ($padding * 2)
        $scale = [Math]::Min($maxDrawSize / $SourceImage.Width, $maxDrawSize / $SourceImage.Height)
        $drawWidth = [int][Math]::Round($SourceImage.Width * $scale)
        $drawHeight = [int][Math]::Round($SourceImage.Height * $scale)
        $drawX = [int][Math]::Round(($Size - $drawWidth) / 2)
        $drawY = [int][Math]::Round(($Size - $drawHeight) / 2)

        $dest = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawWidth, $drawHeight
        $graphics.DrawImage($SourceImage, $dest)
    }
    finally {
        $graphics.Dispose()
    }

    return $bitmap
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Convert-BitmapToPngBytes {
    param([System.Drawing.Bitmap]$Bitmap)

    $stream = New-Object System.IO.MemoryStream
    try {
        $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return ,$stream.ToArray()
    }
    finally {
        $stream.Dispose()
    }
}

function Save-Ico {
    param(
        [hashtable]$ImagesBySize,
        [string]$Path
    )

    $entries = @()
    foreach ($size in ($ImagesBySize.Keys | Sort-Object {[int]$_})) {
        $bytes = Convert-BitmapToPngBytes $ImagesBySize[$size]
        $entries += [pscustomobject]@{
            Size = [int]$size
            Bytes = $bytes
        }
    }

    $stream = [System.IO.File]::Create($Path)
    $writer = New-Object System.IO.BinaryWriter $stream

    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]$entries.Count)

        $offset = 6 + ($entries.Count * 16)
        foreach ($entry in $entries) {
            $writer.Write([byte]$(if ($entry.Size -eq 256) { 0 } else { $entry.Size }))
            $writer.Write([byte]$(if ($entry.Size -eq 256) { 0 } else { $entry.Size }))
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([uint16]1)
            $writer.Write([uint16]32)
            $writer.Write([uint32]$entry.Bytes.Length)
            $writer.Write([uint32]$offset)
            $offset += $entry.Bytes.Length
        }

        foreach ($entry in $entries) {
            $writer.Write($entry.Bytes)
        }
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

$sourcePath = Resolve-RepoPath $Source
$outputPath = Resolve-RepoPath $OutputDir

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source file not found: $sourcePath"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
$bitmaps = @{}

try {
    foreach ($size in @(16, 32, 48, 180, 192, 512)) {
        $bitmaps[$size] = New-FaviconBitmap -SourceImage $sourceImage -Size $size
    }

    Save-Png -Bitmap $bitmaps[32] -Path (Join-Path $outputPath "$BaseName-32x32.png")
    Save-Png -Bitmap $bitmaps[180] -Path (Join-Path $outputPath "$BaseName-apple-touch-icon.png")
    Save-Png -Bitmap $bitmaps[192] -Path (Join-Path $outputPath "$BaseName-192x192.png")
    Save-Png -Bitmap $bitmaps[512] -Path (Join-Path $outputPath "$BaseName-512x512.png")
    Save-Ico -ImagesBySize @{
        16 = $bitmaps[16]
        32 = $bitmaps[32]
        48 = $bitmaps[48]
    } -Path (Join-Path $outputPath "$BaseName.ico")
}
finally {
    foreach ($bitmap in $bitmaps.Values) {
        $bitmap.Dispose()
    }

    $sourceImage.Dispose()
}

Write-Host "Generated favicon files in $outputPath"

# Gera os icones do PWA a partir de app/icon.png usando System.Drawing
# (.NET embutido no Windows — sem dependencia de sharp/ImageMagick).
# Rodar de novo sempre que app/icon.png mudar: powershell -File scripts/generate-pwa-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "app\icon.png"
$iconsDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-SquareIcon {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [int]$Size,
        [double]$ContentFraction
    )

    $src = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        $canvas = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            # Fundo branco solido (nao transparente) em todo o canvas — necessario
            # para maskable icons e evita o preenchimento preto que o iOS aplica
            # em apple-touch-icon com transparencia.
            $g.Clear([System.Drawing.Color]::White)

            $maxContent = $Size * $ContentFraction
            $scale = [Math]::Min($maxContent / $src.Width, $maxContent / $src.Height)
            $w = [int]([Math]::Round($src.Width * $scale))
            $h = [int]([Math]::Round($src.Height * $scale))
            $x = [int](($Size - $w) / 2)
            $y = [int](($Size - $h) / 2)

            $g.DrawImage($src, $x, $y, $w, $h)
        } finally {
            $g.Dispose()
        }

        $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()
    } finally {
        $src.Dispose()
    }
}

# "any": pouco padding — o icone.png ja quase preenche seu proprio frame.
New-SquareIcon -SourcePath $source -OutputPath (Join-Path $iconsDir "icon-192.png") -Size 192 -ContentFraction 0.92
New-SquareIcon -SourcePath $source -OutputPath (Join-Path $iconsDir "icon-512.png") -Size 512 -ContentFraction 0.92

# "maskable": fracao 0.55 calculada para o conteudo (bounding box quadrado)
# caber dentro do circulo de safe-zone (diametro 80% do canvas) mesmo no
# pior caso em que o desenho toca os 4 cantos do bounding box:
#   f * sqrt(2)/2 <= 0.4  =>  f <= 0.566  -> uso 0.55 com margem.
New-SquareIcon -SourcePath $source -OutputPath (Join-Path $iconsDir "icon-512-maskable.png") -Size 512 -ContentFraction 0.55

# apple-touch-icon (convencao de arquivo do Next: app/apple-icon.png)
New-SquareIcon -SourcePath $source -OutputPath (Join-Path $root "app\apple-icon.png") -Size 180 -ContentFraction 0.92

Write-Host "Icones gerados: public/icons/icon-192.png, public/icons/icon-512.png, public/icons/icon-512-maskable.png, app/apple-icon.png"

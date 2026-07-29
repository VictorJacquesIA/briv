# Gera os icones/splash do PWA usando System.Drawing (.NET embutido no
# Windows — sem dependencia de sharp/ImageMagick). Rodar de novo sempre que
# app/icon.png ou public/pwa.png mudar: powershell -File scripts/generate-pwa-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$monogramSource = Join-Path $root "app\icon.png"
$splashSource = Join-Path $root "public\pwa.png"
$iconsDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-CanvasImage {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height,
        [double]$ContentFraction,
        [System.Drawing.Color]$BackgroundColor = [System.Drawing.Color]::White
    )

    $src = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        $canvas = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            # Fundo solido (nao transparente) em todo o canvas — necessario
            # para maskable icons/splash e evita preenchimento inesperado que
            # iOS/Android aplicam em imagem com transparencia.
            $g.Clear($BackgroundColor)

            $maxContentW = $Width * $ContentFraction
            $maxContentH = $Height * $ContentFraction
            $scale = [Math]::Min($maxContentW / $src.Width, $maxContentH / $src.Height)
            $w = [int]([Math]::Round($src.Width * $scale))
            $h = [int]([Math]::Round($src.Height * $scale))
            $x = [int](($Width - $w) / 2)
            $y = [int](($Height - $h) / 2)

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

$white = [System.Drawing.Color]::White
# public/pwa.png tem fundo quase preto puro (~RGB 1,1,1, nao #121212 do tema)
# — usar #121212 aqui criava uma borda visivel onde o fundo desenhado
# encontra o fundo da propria imagem. Preto puro casa exatamente.
$splashBg = [System.Drawing.Color]::Black

# --- Icones "app" (monograma, legivel em tamanho pequeno: launcher, taskbar) ---
New-CanvasImage -SourcePath $monogramSource -OutputPath (Join-Path $iconsDir "icon-192.png") -Width 192 -Height 192 -ContentFraction 0.92 -BackgroundColor $white

# "maskable": fracao 0.55 calculada para o conteudo (bounding box quadrado)
# caber dentro do circulo de safe-zone (diametro 80% do canvas) mesmo no
# pior caso em que o desenho toca os 4 cantos do bounding box:
#   f * sqrt(2)/2 <= 0.4  =>  f <= 0.566  -> uso 0.55 com margem.
# Fica com o monograma (nao a logo com texto) porque o recorte automatico
# do Android em icone maskable pode cortar texto de forma imprevisivel.
New-CanvasImage -SourcePath $monogramSource -OutputPath (Join-Path $iconsDir "icon-512-maskable.png") -Width 512 -Height 512 -ContentFraction 0.55 -BackgroundColor $white

# apple-touch-icon (convencao de arquivo do Next: app/apple-icon.png) — icone
# da tela inicial do iOS, mesmo criterio de tamanho pequeno do icon-192.
New-CanvasImage -SourcePath $monogramSource -OutputPath (Join-Path $root "app\apple-icon.png") -Width 180 -Height 180 -ContentFraction 0.92 -BackgroundColor $white

# --- Splash (public/pwa.png — logo completa "una" em fundo escuro) ---
# ContentFraction 1.0 = preenche o quadro inteiro sem sobra de fundo
# desenhado — pwa.png tem um leve gradiente no proprio fundo (nao e preto
# solido uniforme), entao qualquer fundo pintado por fora dele cria uma
# borda visivel. Encostando nas 4 bordas (quadrado -> quadrado) isso some.
#
# icon-512.png com purpose "any" e o principal usado pelo Chrome/Android pra
# montar a tela de splash automatica (name + background_color + este icone)
# ao abrir o PWA instalado — por isso usa a logo cheia, nao o monograma.
New-CanvasImage -SourcePath $splashSource -OutputPath (Join-Path $iconsDir "icon-512.png") -Width 512 -Height 512 -ContentFraction 1.0 -BackgroundColor $splashBg

# Splash dedicada do iOS (apple-touch-startup-image) — tela cheia em modo
# retrato. ContentFraction 1.0 aqui preenche toda a LARGURA (o lado que
# limita, ja que o retrato e bem mais alto que largo) sem borda lateral;
# sobra só a barra solida preta em cima/embaixo, que e so o $splashBg puro
# (sem imagem sobreposta ali, entao sem costura pra aparecer).
New-CanvasImage -SourcePath $splashSource -OutputPath (Join-Path $root "public\apple-splash.png") -Width 1170 -Height 2532 -ContentFraction 1.0 -BackgroundColor $splashBg

Write-Host "Gerados: public/icons/icon-192.png, public/icons/icon-512.png, public/icons/icon-512-maskable.png, app/apple-icon.png, public/apple-splash.png"

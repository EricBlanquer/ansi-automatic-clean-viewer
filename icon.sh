convert -size 128x128 xc:'#000000' \
    -gravity north -pointsize 28 -font DejaVu-Sans-Bold \
    -fill white -annotate +0+15 'ANSI' \
    -gravity center -pointsize 11 -font DejaVu-Sans-Mono \
    -fill '#888888' -annotate +0-1 '[31m[34m[32m' \
    -gravity center -pointsize 20 -font DejaVu-Sans-Bold \
    -fill white -annotate +0+17 '↓' \
    -gravity south -pointsize 22 -font DejaVu-Sans-Bold \
    -fill '#ff0000' -annotate -20+15 '■' \
    -fill '#5c5cff' -annotate +0+15 '■' \
    -fill '#00ff00' -annotate +20+15 '■' \
    icon.png

convert icon.png \
      \( +clone -alpha extract \
      -draw 'fill black polygon 0,0 0,64 64,0 fill white circle 64,64 64,0' \
      \( +clone -flip \) -compose Multiply -composite \
      \( +clone -flop \) -compose Multiply -composite \
      \) -alpha off -compose CopyOpacity -composite \
      icon.png

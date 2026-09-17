import urllib.request
import os

fonts_dir = r"d:\BAITAP\Quizz_App\Quizz_App_NiHon\client\public\fonts"

fonts = {
    "NotoSans-Regular.ttf": "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
    "NotoSansJP-Regular.ttf": "https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf" # wait this is OTF
}

for filename, url in fonts.items():
    filepath = os.path.join(fonts_dir, filename)
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"Downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/CardapioPage.jsx')
data = path.read_bytes()
text = data.decode('latin1')
path.write_text(text, encoding='utf-8')

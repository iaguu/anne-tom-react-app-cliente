# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/pages/CardapioPage.jsx')
text = path.read_text(encoding='utf-8')
replacements = {
    'Ã¡': 'á',
    'Ã­': 'í',
    'Ã§': 'ç',
    'Ã©': 'é',
    'Ã£': 'ã',
    'Ã³': 'ó',
    'Ã‰': 'É',
    'Ãš': 'Ú'
}
for bad, good in replacements.items():
    text = text.replace(bad, good)
path.write_text(text, encoding='utf-8')

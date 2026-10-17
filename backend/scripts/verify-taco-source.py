"""Conferência somente leitura com Excel institucional. Não requer bibliotecas extras.
Uso da raiz: python backend/scripts/verify-taco-source.py caminho/arquivo.xlsx
"""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
base=Path(__file__).resolve().parents[1]/'src/modules/foods/data'
source=Path(sys.argv[1])
manifest=json.loads((base/'sources.json').read_text(encoding='utf-8'))
if hashlib.sha256(source.read_bytes()).hexdigest()!=manifest['spreadsheetSha256']:
    raise SystemExit('Hash da fonte diferente: revisar a versão antes de aceitar os dados.')
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
foods={str(food['sourceCode']):food for food in json.loads((base/'taco-data.json').read_text(encoding='utf-8'))}
with ZipFile(source) as archive:
    strings=[''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si',ns)]
    checked=set()
    for row in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//s:row',ns):
        values={}
        for cell in row.findall('s:c',ns):
            value=cell.find('s:v',ns)
            value=value.text if value is not None else None
            if cell.get('t')=='s' and value is not None: value=strings[int(value)]
            values[''.join(char for char in cell.get('r') if char.isalpha())]=value
        code=values.get('A')
        if code not in foods or not values.get('B'): continue
        assert code not in checked, 'Código repetido na fonte'
        checked.add(code)
        food=foods[code]
        assert food['name']==values['B'].strip(), code
        for column,nutrient in manifest['columns'].items():
            if nutrient in ('sourceCode','name'): continue
            try: expected=float(values.get(column))
            except (TypeError,ValueError): expected=None
            if expected is not None and expected<0:
                assert food['sourceNutrientNotes'][nutrient]['rawValue']==expected
                expected=None
            assert food['nutrientsPer100g'][nutrient]==expected, (code,nutrient)
assert len(checked)==597 and len(foods)==597
print('597 alimentos, nomes e 2985 células nutricionais conferidos com o Excel oficial; hash válido.')

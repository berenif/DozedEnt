from pathlib import Path

html_path = Path('demos/working-multiplayer-demo.html')
script_path = Path('new_script.js')
html_text = html_path.read_text(encoding='utf-8')
script_text = script_path.read_text(encoding='utf-8')
start = html_text.index('<script type="module">')
end = html_text.index('</script>', start) + len('</script>')
html_text = html_text[:start] + script_text + html_text[end:]
html_path.write_text(html_text, encoding='utf-8')

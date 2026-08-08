import os

files_to_fix = ['auxiliares.html', 'embalagens.html']

for file in files_to_fix:
    with open(file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    main_content_count = 0
    
    for line in lines:
        if '<!-- MAIN CONTENT -->' in line:
            main_content_count += 1
            if main_content_count == 2:
                # Add closing tags just in case
                new_lines.append('</body>\n</html>\n')
                break
        new_lines.append(line)
        
    with open(file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

print("Fixed duplicates")

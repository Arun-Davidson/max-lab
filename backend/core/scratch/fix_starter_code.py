import json
import os
import re

files = [
    'd:/Hirion/Backend/Hirion_Backend/core/stater_code/easy.json',
    'd:/Hirion/Backend/Hirion_Backend/core/stater_code/medium.json',
    'd:/Hirion/Backend/Hirion_Backend/core/stater_code/hard.json'
]

def clean_python_params(params_str):
    # Remove 'self, ' or 'self'
    params_str = re.sub(r'\bself\s*,?\s*', '', params_str)
    
    # Remove type hints like ': List[int]'
    result = []
    i = 0
    while i < len(params_str):
        char = params_str[i]
        if char == ':':
            # Skip until we find a comma or balanced closing parenthesis
            bracket_level = 0
            i += 1
            while i < len(params_str):
                if params_str[i] == '[': bracket_level += 1
                elif params_str[i] == ']': bracket_level -= 1
                elif params_str[i] == ',' and bracket_level == 0: break
                elif params_str[i] == ')' and bracket_level == 0: break
                i += 1
            continue
        result.append(params_str[i])
        i += 1
    
    return "".join(result).strip()

def fix_code(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    changed_count = 0
    for item in data:
        starter = item.get('starter_code', {})
        
        # 1. Fix Java: Wrap in class Solution if missing
        java_code = starter.get('java', '')
        if java_code and 'class Solution' not in java_code:
            new_java = "class Solution {\n    " + java_code.replace("\n", "\n    ") + "\n}"
            starter['java'] = new_java
            changed_count += 1
            
        # 2. Fix Python: Standalone function, no self, no type hints
        python_code = starter.get('python', '')
        if python_code:
            original_python = python_code
            
            # Remove ANY class declaration at the top
            lines = python_code.split('\n')
            if lines and re.match(r'^\s*class\s+\w+\s*:\s*$', lines[0]):
                new_lines = []
                for line in lines[1:]:
                    if line.startswith('    '):
                        new_lines.append(line[4:])
                    elif line.strip() == '':
                        new_lines.append('')
                    else:
                        new_lines.append(line)
                python_code = '\n'.join(new_lines)
            
            # Clean up def lines (multiple defs possible)
            def_lines = []
            for line in python_code.split('\n'):
                # Handle return type hints and parameters
                match = re.match(r'^(\s*def\s+\w+\s*\()([^)]*)(\)\s*(?:->\s*[^:]+)?\s*:.*)$', line)
                if match:
                    prefix, params, suffix = match.groups()
                    cleaned_params = clean_python_params(params)
                    suffix = re.sub(r'\s*->\s*[^:]+:', ':', suffix)
                    def_lines.append(prefix + cleaned_params + suffix)
                else:
                    def_lines.append(line)
            python_code = '\n'.join(def_lines)
            
            if python_code != original_python:
                starter['python'] = python_code
                changed_count += 1
    
    if changed_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Fixed {changed_count} entries in {file_path}")
    else:
        print(f"No changes needed in {file_path}")

for f in files:
    fix_code(f)

import re

with open("frontend/src/pages/InvestigationsDesk.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to capture the hooks block
pattern = r'(  const driftData = selectedSpill\?.driftPaths\?\.\[0\];.*?  \}, \[allPoints, currentHour, minHour, maxHour, selectedSpill\]\);\n\n)'

match = re.search(pattern, content, flags=re.DOTALL)
if not match:
    print("Could not find the driftData block!")
    exit(1)

hooks_block = match.group(1)

# Remove the block from its current location
content = content.replace(hooks_block, "")

# Find the insertion point (after setPlaySpeed)
insert_anchor = "const [playSpeed, setPlaySpeed] = useState(1);\n"
if insert_anchor not in content:
    print("Could not find insert anchor!")
    exit(1)

content = content.replace(insert_anchor, insert_anchor + "\n" + hooks_block)

with open("frontend/src/pages/InvestigationsDesk.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Phase 3 replacement complete. Hooks moved to top.")

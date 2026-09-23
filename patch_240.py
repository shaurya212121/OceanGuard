import re

with open("backend/app/services/data_generator.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("for j in range(96):", "for j in range(240):")
content = content.replace("# 48 hours, every 30 mins -> 96 points", "# 120 hours, every 30 mins -> 240 points (covers full -48h to +72h scrubber)")

with open("backend/app/services/data_generator.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched to 240 points")

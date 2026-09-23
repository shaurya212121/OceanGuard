import re

with open("backend/push_to_supabase.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("for j in range(96):", "for j in range(240):")
content = content.replace("Build 96 position reports across 48 hours", "Build 240 position reports across 120 hours")

with open("backend/push_to_supabase.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched push_to_supabase to 240 points")

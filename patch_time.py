import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

anchor = """  useEffect(() => {
    if (isPlaying && currentHour >= maxHour) setIsPlaying(false);
  }, [currentHour, maxHour, isPlaying]);"""

new_effect = """  useEffect(() => {
    if (minHour < 0 && spills.length > 0) {
      // Auto-set the scrubber to the beginning of the timeline when data loads
      setCurrentHour(minHour);
    }
  }, [minHour, spills.length]);

  useEffect(() => {
    if (isPlaying && currentHour >= maxHour) setIsPlaying(false);
  }, [currentHour, maxHour, isPlaying]);"""

content = content.replace(anchor, new_effect)

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Time patch applied")

import re

with open("backend/app/services/data_generator.py", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """            # Land collision check
            if globe.is_land(next_lat, next_lon):
                # Stop advancing (drop anchor)
                speed = 0.0
            else:
                current_lat = next_lat
                current_lon = next_lon"""

new_logic = """            # Land collision check
            if globe.is_land(next_lat, next_lon):
                # Hit land! Bounce off (turn around 135 to 225 degrees)
                heading = (heading + random.uniform(135, 225)) % 360
                
                # Recalculate bounce vector
                d_lat = (speed_kmh * math.cos(math.radians(heading))) / 111.0 * 0.5
                d_lon = (speed_kmh * math.sin(math.radians(heading))) / (111.0 * math.cos(math.radians(current_lat))) * 0.5
                next_lat = current_lat + d_lat
                next_lon = current_lon + d_lon
                
                # If STILL on land (stuck in a bay), just stop
                if globe.is_land(next_lat, next_lon):
                    speed = 0.0
                else:
                    current_lat = next_lat
                    current_lon = next_lon
            else:
                current_lat = next_lat
                current_lon = next_lon"""

content = content.replace(old_logic, new_logic)

with open("backend/app/services/data_generator.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Bounce logic patched.")

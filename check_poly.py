import math
from shapely.geometry import Point, Polygon, LineString

coords = [
    (18.5, 70.2), # Arabian Sea
    (11.8, 72.5), # Lakshadweep area
    (14.2, 82.8), # Bay of Bengal
    (9.5, 75.2), # Kerala / Gulf of Mannar
    (20.1, 87.5) # Sundarbans
]

SENSITIVE_ZONES = [
    {
        "name": "Gulf of Mannar Marine National Park",
        "polygon": Polygon([
            (78.1, 8.7), (79.2, 9.3), (79.3, 9.1), (78.2, 8.5)
        ])
    },
    {
        "name": "Lakshadweep Marine Sanctuary",
        "polygon": Polygon([
            (71.5, 10.0), (73.5, 12.0), (74.0, 10.5), (72.0, 8.0)
        ])
    },
    {
        "name": "Sundarbans Reserve Forest",
        "polygon": Polygon([
            (88.0, 22.0), (89.5, 22.2), (89.5, 21.5), (88.0, 21.5)
        ])
    },
    {
        "name": "Malvan Marine Sanctuary",
        "polygon": Polygon([
            (73.4, 16.1), (73.5, 16.1), (73.5, 16.0), (73.4, 16.0)
        ])
    },
    {
        "name": "Gulf of Kutch Marine National Park",
        "polygon": Polygon([
            (69.0, 22.5), (70.5, 22.8), (70.5, 22.3), (69.0, 22.2)
        ])
    }
]

for lat, lon in coords:
    pt = Point(lon, lat)
    for zone in SENSITIVE_ZONES:
        if pt.within(zone['polygon']) or zone['polygon'].distance(pt) < 1.0:
            print(f"Spill at {lat}, {lon} is near/in {zone['name']}")

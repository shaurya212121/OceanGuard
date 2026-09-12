import csv
from datetime import datetime
from typing import List, Dict, Any
from ..models import VesselTrack, VesselPosition

# A small lookup table for common Maritime Identification Digits (MID)
MID_TO_COUNTRY = {
    "235": "United Kingdom",
    "232": "United Kingdom",
    "311": "Bahamas",
    "353": "Panama",
    "357": "Panama",
    "373": "Panama",
    "316": "Canada",
    "366": "United States",
    "367": "United States",
    "368": "United States",
    "369": "United States",
    "419": "India",
    "477": "Hong Kong",
    "563": "Singapore",
    "538": "Marshall Islands",
    "636": "Liberia",
    "412": "China",
    "413": "China",
    "414": "China",
}

def get_flag_from_mmsi(mmsi: str) -> str:
    if not mmsi or len(mmsi) < 3:
        return "Unknown"
    mid = mmsi[:3]
    return MID_TO_COUNTRY.get(mid, "Unknown")

def load_ais_csv(filepath: str) -> List[VesselTrack]:
    vessel_data = {}  # mmsi -> dict of vessel info and positions

    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mmsi = row.get('MMSI', '').strip()
            if not mmsi:
                continue

            if mmsi not in vessel_data:
                vessel_data[mmsi] = {
                    "mmsi": mmsi,
                    "imo_number": row.get("IMO", "").strip() or None,
                    "name": row.get("VesselName", "").strip() or f"Unknown ({mmsi})",
                    "flag_country": get_flag_from_mmsi(mmsi),
                    "vessel_type": row.get("VesselType", "").strip() or "Unknown",
                    "positions": []
                }
            
            try:
                # BaseDateTime format in MarineCadastre is typically "YYYY-MM-DDTHH:MM:SS"
                dt_str = row.get("BaseDateTime", "").strip()
                timestamp = datetime.fromisoformat(dt_str)
                
                lat = float(row.get("LAT", 0))
                lon = float(row.get("LON", 0))
                sog = float(row.get("SOG", 0))
                heading = float(row.get("Heading", 0))
                
                vessel_data[mmsi]["positions"].append(
                    VesselPosition(
                        lat=lat,
                        lon=lon,
                        timestamp=timestamp,
                        speed_knots=sog,
                        heading=heading
                    )
                )
            except (ValueError, TypeError):
                # Skip rows with malformed coordinates/timestamps
                continue

    vessels = []
    for mmsi, data in vessel_data.items():
        # Sort positions by timestamp chronologically
        data["positions"].sort(key=lambda p: p.timestamp)
        vessels.append(
            VesselTrack(
                mmsi=data["mmsi"],
                imo_number=data["imo_number"],
                name=data["name"],
                flag_country=data["flag_country"],
                vessel_type=data["vessel_type"],
                positions=data["positions"]
            )
        )

    return vessels

with open("frontend/src/lib/db.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add driftPaths to OilSpill
content = content.replace(
    "estimated_volume_liters?: number;\n  metadata?: SpillMetadata;\n}",
    "estimated_volume_liters?: number;\n  metadata?: SpillMetadata;\n  driftPaths?: DriftPath[];\n}"
)

# 2. Add positions array to Vessel
content = content.replace(
    "last_seen: string;\n}",
    "last_seen: string;\n  positions?: any[];\n}"
)

# 3. Update fetchSpills
old_fetch_spills = """export async function fetchSpills(): Promise<OilSpill[]> {
  const { data, error } = await supabase
    .from('oil_spills')
    .select('*')
    .order('detected_at', { ascending: false });"""
new_fetch_spills = """export async function fetchSpills(): Promise<OilSpill[]> {
  const { data, error } = await supabase
    .from('oil_spills')
    .select('*, drift_paths(*)')
    .order('detected_at', { ascending: false });"""
content = content.replace(old_fetch_spills, new_fetch_spills)

old_spill_return = """    return {
      ...spill,
      lat: spill.center_lat,
      lng: spill.center_lon,
      area_km2: spill.area_sq_km,
      polygon: spill.polygon_coords,
      spill_id: spill.id.substring(0, 8).toUpperCase(),
      severity: (spill.severity || 'UNKNOWN').toUpperCase(),
      status: (spill.status || 'UNKNOWN').toUpperCase(),
      metadata,
    };
  }) as OilSpill[];"""

new_spill_return = """    return {
      ...spill,
      lat: spill.center_lat,
      lng: spill.center_lon,
      area_km2: spill.area_sq_km,
      polygon: spill.polygon_coords,
      spill_id: spill.id.substring(0, 8).toUpperCase(),
      severity: (spill.severity || 'UNKNOWN').toUpperCase(),
      status: (spill.status || 'UNKNOWN').toUpperCase(),
      metadata,
      driftPaths: (spill.drift_paths || []).map((d: any) => ({
        ...d,
        direction: 'FORWARD',
        waypoints: (d.forward_path || []).map((p: any) => [p.lat, p.lon]),
        backward_path: d.backward_path || [],
        forward_path: d.forward_path || [],
        current_speed_knots: d.current_speed_knots,
        current_dir_deg: d.current_dir_deg,
        wind_speed_knots: d.wind_speed_knots,
        wind_dir_deg: d.wind_dir_deg
      }))
    };
  }) as OilSpill[];"""
content = content.replace(old_spill_return, new_spill_return)


# 4. Update fetchVessels
# In db.ts, it was already doing .select('*, vessel_positions(*)') !
# Let's verify that.

with open("frontend/src/lib/db.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("db.ts updated successfully")

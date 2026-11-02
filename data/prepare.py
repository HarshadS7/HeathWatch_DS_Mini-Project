"""
prepare.py - builds the HeatWatch offline replay dataset from IMD gridded files.

Input : ../Maxtemp_MaxT_YYYY.GRD  (IMD Pune, daily max temp, 1.0 x 1.0 deg, binary)
Output: sample/stations.csv, sample/observations.csv

Each station is the 1-degree grid cell nearest a city (searching outward for the
nearest cell that has data, since some coastal cells are sea = 99.9).
These are GRID CELLS NEAR CITIES, not physical sensors.
"""
import calendar, csv, os, re, sys
from array import array

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SIZE, LAT0, LON0 = 31, 7.5, 67.5

CITIES = [
    ("DEL", "Delhi", 28.61, 77.21), ("JAI", "Jaipur", 26.91, 75.79),
    ("JDH", "Jodhpur", 26.24, 73.02), ("AMD", "Ahmedabad", 23.02, 72.57),
    ("BOM", "Mumbai", 19.08, 72.88), ("PNQ", "Pune", 18.52, 73.86),
    ("NAG", "Nagpur", 21.15, 79.09), ("BHO", "Bhopal", 23.26, 77.41),
    ("LKO", "Lucknow", 26.85, 80.95), ("PAT", "Patna", 25.59, 85.14),
    ("CCU", "Kolkata", 22.57, 88.36), ("BBI", "Bhubaneswar", 20.30, 85.82),
    ("HYD", "Hyderabad", 17.39, 78.49), ("MAA", "Chennai", 13.08, 80.27),
    ("BLR", "Bengaluru", 12.97, 77.59), ("PRY", "Prayagraj", 25.44, 81.85),
]

def load_year(path):
    data = array("f")
    with open(path, "rb") as f:
        data.frombytes(f.read())
    if sys.byteorder != "little":
        data.byteswap()
    return data

def missing(v):
    return v != v or v > 90.0

def main():
    files = sorted(f for f in os.listdir(ROOT) if re.match(r"Maxtemp_MaxT_\d{4}\.GRD$", f, re.I))
    if not files:
        sys.exit("No GRD files found in " + ROOT)
    years = {int(re.findall(r"\d{4}", f)[0]): load_year(os.path.join(ROOT, f)) for f in files}

    # choose nearest grid cell with data on the first day of the first year
    first = years[min(years)]
    stations = []
    for sid, name, lat, lon in CITIES:
        best = None
        for r in range(SIZE):
            for c in range(SIZE):
                if missing(first[r * SIZE + c]):
                    continue
                glat, glon = LAT0 + r, LON0 + c
                d = (glat - lat) ** 2 + (glon - lon) ** 2
                if best is None or d < best[0]:
                    best = (d, r, c, glat, glon)
        _, r, c, glat, glon = best
        stations.append((sid, name, lat, lon, glat, glon, r * SIZE + c))

    with open(os.path.join(HERE, "sample", "stations.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["station_id", "name", "latitude", "longitude", "grid_lat", "grid_lon", "source_type"])
        for s in stations:
            w.writerow([s[0], s[1], s[2], s[3], s[4], s[5], "imd_grid_cell"])

    rows = 0
    with open(os.path.join(HERE, "sample", "observations.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["station_id", "observed_at", "temperature_c", "source"])
        for year in sorted(years):
            data = years[year]
            days = 366 if calendar.isleap(year) else 365
            if len(data) < days * SIZE * SIZE:
                days = len(data) // (SIZE * SIZE)
            for d in range(days):
                import datetime
                date = (datetime.date(year, 1, 1) + datetime.timedelta(days=d)).isoformat()
                base = d * SIZE * SIZE
                for s in stations:
                    v = data[base + s[6]]
                    if missing(v):
                        continue
                    w.writerow([s[0], date, f"{v:.1f}", "IMD gridded Tmax 1.0deg"])
                    rows += 1
    print(f"{len(stations)} stations, {rows} observations, years {min(years)}-{max(years)}")
    for s in stations:
        print(f"  {s[0]} {s[1]:<12} city ({s[2]},{s[3]}) -> cell ({s[4]},{s[5]})")

if __name__ == "__main__":
    main()

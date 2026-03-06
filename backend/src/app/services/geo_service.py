from typing import List, Dict, Any
from ..core.database import Database

class GeoService:
    MAX_DISTANCE_METERS = 100000  # 100km

    def __init__(self):
        self.db = Database()

    def find_nearby_trials(self, coords: List[float], age: int, limit: int = 50):
        query = {
            "status": "RECRUITING",
            "eligibility.min_age": {"$lte": age},
            "$or": [{"eligibility.max_age": {"$gte": age}}, {"eligibility.max_age": None}],
            "locations.geo": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": coords},
                    "$maxDistance": self.MAX_DISTANCE_METERS
                }
            }
        }
        return list(self.db.trials.find(query).limit(limit))

    def calculate_distance(self, p_coords: List[float], t_location: Dict) -> float:
        try:
            t_coords = t_location.get("geo", {}).get("coordinates", [0, 0])
            lon_diff = (t_coords[0] - p_coords[0]) * 111.32
            lat_diff = (t_coords[1] - p_coords[1]) * 110.57
            return round((lon_diff**2 + lat_diff**2) ** 0.5, 1)
        except:
            return 0.0
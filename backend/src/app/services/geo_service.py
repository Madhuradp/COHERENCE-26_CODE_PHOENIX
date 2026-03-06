from typing import List, Dict, Any, Optional
from ..core.database import Database

# City name (lowercase) → country for widened geo fallback
CITY_COUNTRY_MAP: Dict[str, str] = {
    # India
    "mumbai": "India", "delhi": "India", "new delhi": "India",
    "bangalore": "India", "bengaluru": "India", "hyderabad": "India",
    "chennai": "India", "kolkata": "India", "pune": "India",
    "ahmedabad": "India", "jaipur": "India", "surat": "India",
    "navi mumbai": "India", "thane": "India", "lucknow": "India",
    "kanpur": "India", "nagpur": "India", "indore": "India",
    "bhopal": "India", "visakhapatnam": "India", "patna": "India",
    "vadodara": "India", "ghaziabad": "India", "ludhiana": "India",
    "agra": "India", "nashik": "India", "meerut": "India",
    "chandigarh": "India", "coimbatore": "India", "kochi": "India",
    # USA
    "new york": "United States", "los angeles": "United States",
    "chicago": "United States", "houston": "United States",
    "phoenix": "United States", "philadelphia": "United States",
    "san antonio": "United States", "san diego": "United States",
    "dallas": "United States", "san francisco": "United States",
    "boston": "United States", "seattle": "United States",
    # UK
    "london": "United Kingdom", "manchester": "United Kingdom",
    "birmingham": "United Kingdom", "leeds": "United Kingdom",
    # Europe
    "paris": "France", "berlin": "Germany", "madrid": "Spain",
    "rome": "Italy", "amsterdam": "Netherlands",
    # Asia-Pacific
    "beijing": "China", "shanghai": "China", "tokyo": "Japan",
    "sydney": "Australia", "melbourne": "Australia",
    "singapore": "Singapore", "toronto": "Canada",
}

# City name → [longitude, latitude] for coordinate-based geo queries
CITY_COORDS_MAP: Dict[str, List[float]] = {
    "mumbai": [72.8777, 19.0760], "delhi": [77.2090, 28.6139],
    "new delhi": [77.2090, 28.6139], "bangalore": [77.5946, 12.9716],
    "bengaluru": [77.5946, 12.9716], "hyderabad": [78.4867, 17.3850],
    "chennai": [80.2707, 13.0827], "kolkata": [88.3639, 22.5726],
    "pune": [73.8567, 18.5204], "ahmedabad": [72.5714, 23.0225],
    "jaipur": [75.7873, 26.9124], "surat": [72.8311, 21.1702],
    "navi mumbai": [73.0297, 19.0330], "thane": [72.9781, 19.2183],
    "lucknow": [80.9462, 26.8467], "kochi": [76.2673, 9.9312],
    "chandigarh": [76.7794, 30.7333], "coimbatore": [76.9558, 11.0168],
    "new york": [-73.9857, 40.7484], "los angeles": [-118.2437, 34.0522],
    "chicago": [-87.6298, 41.8781], "houston": [-95.3698, 29.7604],
    "boston": [-71.0589, 42.3601], "san francisco": [-122.4194, 37.7749],
    "london": [-0.1276, 51.5074], "paris": [2.3522, 48.8566],
    "berlin": [13.4050, 52.5200], "tokyo": [139.6917, 35.6895],
    "sydney": [151.2093, -33.8688], "singapore": [103.8198, 1.3521],
}

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

    def find_all_recruiting_trials(self, age=None, city_name: str = None, limit: int = 50):
        """
        Fallback: find recruiting trials filtered by age and optionally by city name.
        Used when patient location is a city string (not GPS coordinates).
        Priority: same city → same country region → all recruiting
        """
        base_query: Dict[str, Any] = {"status": "RECRUITING"}
        if age is not None:
            base_query["eligibility.min_age"] = {"$lte": age}
            base_query["$or"] = [{"eligibility.max_age": {"$gte": age}}, {"eligibility.max_age": None}]

        if city_name:
            # Try same city first
            city_query = {**base_query, "locations.city": {"$regex": city_name.strip(), "$options": "i"}}
            results = list(self.db.trials.find(city_query).limit(limit))
            if results:
                return results

            # Widen to country-level using region map
            country = CITY_COUNTRY_MAP.get(city_name.strip().lower())
            if country:
                country_query = {**base_query, "locations.country": {"$regex": country, "$options": "i"}}
                results = list(self.db.trials.find(country_query).limit(limit))
                if results:
                    return results

        # Final fallback: all recruiting trials
        return list(self.db.trials.find(base_query).limit(limit))

    def calculate_distance(self, p_coords: List[float], t_location: Dict) -> float:
        try:
            t_coords = t_location.get("geo", {}).get("coordinates", [0, 0])
            lon_diff = (t_coords[0] - p_coords[0]) * 111.32
            lat_diff = (t_coords[1] - p_coords[1]) * 110.57
            return round((lon_diff**2 + lat_diff**2) ** 0.5, 1)
        except:
            return 0.0
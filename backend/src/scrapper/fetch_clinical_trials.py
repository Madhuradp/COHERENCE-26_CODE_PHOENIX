"""
Fetch clinical trial data from ClinicalTrials.gov API
https://clinicaltrials.gov/data-api/api

Note: The v2 API at /api/v2/studies does not support filtering via query parameters.
This script fetches all trials via pagination and provides local filtering capabilities.
"""

import requests
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

# Maharashtra-specific constants
MAHARASHTRA_LOCATION_QUERY = "Maharashtra, India"
MAHARASHTRA_CITIES = frozenset([
    "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur",
    "Solapur", "Amravati", "Nanded", "Thane", "Navi Mumbai",
    "Satara", "Sangli", "Latur", "Jalgaon", "Akola"
])
MAHARASHTRA_CENTER = {"type": "Point", "coordinates": [74.8479, 19.7515]}


class ClinicalTrialsFetcher:
    """Fetch and parse data from ClinicalTrials.gov API"""

    def __init__(self, api_url: str = BASE_URL):
        self.api_url = api_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; TrialMatch/1.0)'
        })

    def fetch_trials_paginated(
        self,
        limit: int = 100,
        max_pages: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Fetch trials with pagination using nextPageToken

        Args:
            limit: Number of results per page (default 100)
            max_pages: Maximum pages to fetch (None = fetch all)

        Returns:
            Dictionary containing all trials data
        """
        all_studies = []
        next_token = None
        page_count = 0

        try:
            while True:
                params = {"pageSize": min(limit, 1000)}
                if next_token:
                    params["pageToken"] = next_token

                print(f"Fetching page {page_count + 1}...")
                response = self.session.get(self.api_url, params=params, timeout=30)
                response.raise_for_status()

                data = response.json()
                studies = data.get("studies", [])
                all_studies.extend(studies)
                page_count += 1

                print(f"  Got {len(studies)} studies (total: {len(all_studies)})")

                # Check for next page
                next_token = data.get("nextPageToken")
                if not next_token or (max_pages and page_count >= max_pages):
                    break

            return {
                "studies": all_studies,
                "totalCount": len(all_studies),
                "pagesRetrieved": page_count
            }

        except requests.exceptions.RequestException as e:
            print(f"Error fetching trials: {e}")
            return {
                "studies": all_studies,
                "totalCount": len(all_studies),
                "pagesRetrieved": page_count,
                "error": str(e)
            }

    def fetch_trial_by_nct_id(self, nct_id: str) -> Dict[str, Any]:
        """
        Fetch a specific trial by NCT ID

        Args:
            nct_id: The NCT ID of the trial (e.g., 'NCT04234699')

        Returns:
            Dictionary containing trial details
        """
        url = f"{self.api_url}/{nct_id}"
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching trial {nct_id}: {e}")
            return {"error": str(e)}

    def _normalize_status(self, api_status: str) -> str:
        """
        Map API status to RecruitmentStatus enum values

        Args:
            api_status: Status from API

        Returns:
            Status matching RecruitmentStatus enum
        """
        status_map = {
            "Recruiting": "RECRUITING",
            "Active, not recruiting": "ACTIVE_NOT_RECRUITING",
            "Enrolling by invitation": "ENROLLING_BY_INVITATION",
            "Not yet recruiting": "NOT_YET_RECRUITING",
            "Completed": "COMPLETED",
            "Suspended": "SUSPENDED",
            "Terminated": "TERMINATED",
            "Withdrawn": "WITHDRAWN",
        }
        return status_map.get(api_status, "NOT_YET_RECRUITING")

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime object"""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            try:
                return datetime.strptime(date_str, "%B %d, %Y")
            except:
                return None

    def _get_eligibility(self, protocol_section: Dict[str, Any]) -> Dict[str, Any]:
        """Extract eligibility criteria from protocol section"""
        eligibility_module = protocol_section.get("eligibilityModule", {})

        min_age = None
        max_age = None
        gender = "ALL"
        raw_text = ""

        # Parse minimum age
        min_age_info = eligibility_module.get("minimumAge")
        if min_age_info:
            try:
                min_age = int(min_age_info.split()[0])
            except:
                pass

        # Parse maximum age
        max_age_info = eligibility_module.get("maximumAge")
        if max_age_info:
            try:
                max_age = int(max_age_info.split()[0])
            except:
                pass

        # Get gender requirement
        gender_based = eligibility_module.get("genderBased", False)
        if gender_based:
            gender_str = eligibility_module.get("gender", "ALL").upper()
            gender = gender_str if gender_str in ["MALE", "FEMALE"] else "ALL"

        # Build raw text from all eligibility criteria
        raw_text = eligibility_module.get("eligibilityCriteria", "")
        if not raw_text:
            raw_text = f"Age {min_age_info or '18+'} - {max_age_info or 'no max'}, Gender: {gender}"

        return {
            "min_age": min_age,
            "max_age": max_age,
            "gender": gender,
            "raw_text": raw_text or "Not specified"
        }

    def _get_locations_with_geo(self, contacts_locations_module: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract locations and add geocoding placeholders
        In production, would call geocoding API (Google Maps, etc.)
        """
        locations = []

        for loc in contacts_locations_module.get("locations", []):
            facility = loc.get("facility", "Unknown Facility")
            city = loc.get("city", "")
            state = loc.get("state", "")
            country = loc.get("country", "")

            # Placeholder coordinates - in production would geocode the address
            # Using city-level approximations for common US cities
            city_coords = {
                "San Francisco": [-122.45, 37.76],
                "New York": [-73.97, 40.78],
                "Los Angeles": [-118.24, 34.05],
                "Boston": [-71.06, 42.36],
                "Chicago": [-87.62, 41.88],
                "Houston": [-95.36, 29.76],
                "Phoenix": [-112.07, 33.45],
                "Philadelphia": [-75.17, 39.95],
                "San Antonio": [-98.49, 29.42],
                "San Diego": [-117.16, 32.71],
                # India
                "Mumbai": [72.8777, 19.0760],
                "Delhi": [77.2090, 28.6139],
                "New Delhi": [77.2090, 28.6139],
                "Bangalore": [77.5946, 12.9716],
                "Bengaluru": [77.5946, 12.9716],
                "Hyderabad": [78.4867, 17.3850],
                "Chennai": [80.2707, 13.0827],
                "Kolkata": [88.3639, 22.5726],
                "Pune": [73.8567, 18.5204],
                "Ahmedabad": [72.5714, 23.0225],
                "Jaipur": [75.7873, 26.9124],
                "Surat": [72.8311, 21.1702],
                "Lucknow": [80.9462, 26.8467],
                "Nagpur": [79.0882, 21.1458],
                "Indore": [75.8577, 22.7196],
                "Bhopal": [77.4126, 23.2599],
                "Kochi": [76.2673, 9.9312],
                "Chandigarh": [76.7794, 30.7333],
                "Coimbatore": [76.9558, 11.0168],
                "Visakhapatnam": [83.2185, 17.6868],
                # Maharashtra cities (additional)
                "Nashik": [73.7898, 20.0059],
                "Aurangabad": [75.3433, 19.8762],
                "Kolhapur": [74.2433, 16.7050],
                "Solapur": [75.9064, 17.6869],
                "Amravati": [77.7523, 20.9374],
                "Nanded": [77.2951, 19.1383],
                "Thane": [72.9781, 19.2183],
                "Navi Mumbai": [73.0297, 19.0330],
                "Satara": [74.0073, 17.6849],
                "Sangli": [74.5815, 16.8524],
                "Latur": [76.5604, 18.4088],
                "Jalgaon": [75.5626, 21.0077],
                "Akola": [77.0082, 20.7097],
                # UK
                "London": [-0.1276, 51.5074],
                "Manchester": [-2.2426, 53.4808],
                # Europe
                "Paris": [2.3522, 48.8566],
                "Berlin": [13.4050, 52.5200],
                # Asia-Pacific
                "Tokyo": [139.6917, 35.6895],
                "Sydney": [151.2093, -33.8688],
                "Singapore": [103.8198, 1.3521],
                "Toronto": [-79.3832, 43.6532],
            }

            coords = city_coords.get(city, city_coords.get(city.title(), [0.0, 0.0]))

            location_dict = {
                "facility": facility,
                "city": city,
                "state": state,
                "country": country,
                "geo": {
                    "type": "Point",
                    "coordinates": coords
                }
            }
            locations.append(location_dict)

        return locations

    def parse_trials(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse and transform trial data to match ClinicalTrial model schema

        Args:
            data: Raw API response from ClinicalTrials.gov

        Returns:
            List of trial records in model-expected format
        """
        trials = []
        studies = data.get("studies", [])

        for study in studies:
            try:
                protocol_section = study.get("protocolSection", {})
                identification_module = protocol_section.get("identificationModule", {})
                status_module = protocol_section.get("statusModule", {})
                contacts_locations_module = protocol_section.get("contactsLocationsModule", {})
                conditions_module = protocol_section.get("conditionsModule", {})
                interventions_module = protocol_section.get("interventionsModule", {})
                sponsor_module = protocol_section.get("sponsorCollaboratorsModule", {})

                # Get base fields
                nct_id = identification_module.get("nctId")
                title = identification_module.get("officialTitle", "")
                brief_title = identification_module.get("briefTitle", "")

                # Skip if missing required fields
                if not nct_id or not title:
                    continue

                # Normalize status to enum value
                api_status = status_module.get("overallStatus", "Not yet recruiting")
                status = self._normalize_status(api_status)

                # Parse phase
                phases = status_module.get("phases", [])
                phase = phases[0] if phases else None

                # Parse dates
                start_date = self._parse_date(
                    status_module.get("startDateStruct", {}).get("date")
                )
                completion_date = self._parse_date(
                    status_module.get("completionDateStruct", {}).get("date")
                )

                # Get eligibility info
                eligibility = self._get_eligibility(protocol_section)

                # Get locations with geo data
                locations = self._get_locations_with_geo(contacts_locations_module)

                # Build trial document in model format
                trial = {
                    "nct_id": nct_id,
                    "title": title,
                    "brief_title": brief_title,
                    "phase": phase,
                    "status": status,
                    "eligibility": eligibility,
                    "locations": locations,
                    "start_date": start_date,
                    "completion_date": completion_date,
                    "conditions": conditions_module.get("conditions", []),
                    "keywords": conditions_module.get("keywords", []),
                    "interventions": [
                        {
                            "name": i.get("name"),
                            "type": i.get("type"),
                            "description": i.get("description")
                        }
                        for i in interventions_module.get("interventions", [])
                    ],
                    "enrollment": status_module.get("enrollmentInfo", {}).get("count"),
                    "sponsor": sponsor_module.get("leadSponsor", {}).get("name"),
                    "embedding": [],  # Will be populated by API during insertion
                }
                trials.append(trial)
            except Exception as e:
                print(f"Error parsing trial {identification_module.get('nctId', 'unknown')}: {e}")
                continue

        return trials

    def fetch_by_condition_and_location(
        self,
        condition: Optional[str] = None,
        location: Optional[str] = None,
        status: str = "RECRUITING",
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Fetch trials live from ClinicalTrials.gov using query parameters.
        Uses the v2 API with query.cond (condition) and query.locn (location).

        Args:
            condition: Medical condition e.g. "diabetes"
            location: City or country e.g. "Mumbai" or "India"
            status: Recruitment status filter
            limit: Max results to return

        Returns:
            List of parsed trial dicts
        """
        params: Dict[str, Any] = {"pageSize": min(limit, 100)}
        if condition:
            params["query.cond"] = condition
        if location:
            params["query.locn"] = location
        if status:
            params["filter.overallStatus"] = status

        try:
            response = self.session.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            raw = response.json()
            return self.parse_trials({"studies": raw.get("studies", [])})
        except Exception as e:
            print(f"Live fetch error: {e}")
            return []

    def fetch_maharashtra_trials(
        self,
        condition: Optional[str] = None,
        phase: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Fetch trials strictly from Maharashtra, India with optional filtering.

        Args:
            condition: Medical condition e.g. "diabetes", "cancer"
            phase: Trial phase e.g. "PHASE1", "PHASE2", "PHASE3", "PHASE4"
            limit: Max results to return (10–500)

        Returns:
            List of parsed trial dicts from Maharashtra only
        """
        params: Dict[str, Any] = {
            "pageSize": min(limit, 1000),
            "query.locn": MAHARASHTRA_LOCATION_QUERY,
            "filter.overallStatus": "RECRUITING"
        }
        if condition:
            params["query.cond"] = condition
        if phase:
            # Use advanced query for phase filtering
            params["query.advanced"] = f"AREA[Phase]{phase}"

        try:
            response = self.session.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            raw = response.json()
            parsed = self.parse_trials({"studies": raw.get("studies", [])})

            # Ensure all returned trials are from Maharashtra
            mh_trials = [
                t for t in parsed
                if any(
                    loc.get("city") in MAHARASHTRA_CITIES or
                    (loc.get("country") == "India" and loc.get("state") == "Maharashtra")
                    for loc in t.get("locations", [])
                )
            ]
            return mh_trials[:limit]
        except Exception as e:
            print(f"Maharashtra fetch error: {e}")
            return []

    def save_to_json(self, data: List[Dict[str, Any]], filename: str = "trials.json"):
        """Save trials to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved {len(data)} trials to {filename}")
        except Exception as e:
            print(f"Error saving to JSON: {e}")

    def filter_trials_locally(
        self,
        trials: List[Dict[str, Any]],
        condition: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Filter trials locally (after fetching all data)

        Args:
            trials: List of trial records
            condition: Filter by condition (substring match)
            status: Filter by status (exact match)
            country: Filter by country (exact match)

        Returns:
            Filtered list of trials
        """
        filtered = trials

        if condition:
            condition_lower = condition.lower()
            filtered = [
                t for t in filtered
                if any(condition_lower in c.lower() for c in t.get("conditions", []))
            ]

        if status:
            filtered = [t for t in filtered if t.get("status") == status.upper()]

        if country:
            filtered = [
                t for t in filtered
                if any(loc.get("country") == country for loc in t.get("locations", []))
            ]

        return filtered

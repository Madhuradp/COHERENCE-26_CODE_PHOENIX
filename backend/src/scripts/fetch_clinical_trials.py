"""
Fetch clinical trial data from ClinicalTrials.gov API
https://clinicaltrials.gov/data-api/api
"""

import requests
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"
RATE_LIMIT_DELAY = 0.1  # seconds between requests to respect API rate limits


class ClinicalTrialsFetcher:
    """Fetch and parse data from ClinicalTrials.gov API"""

    def __init__(self, api_url: str = BASE_URL):
        self.api_url = api_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; TrialMatch/1.0)'
        })

    def fetch_trials(
        self,
        query: Optional[str] = None,
        condition: Optional[str] = None,
        intervention: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Fetch clinical trials with various filters

        Args:
            query: Search query string
            condition: Medical condition to search for
            intervention: Type of intervention
            status: Trial status (e.g., 'RECRUITING', 'ACTIVE_NOT_RECRUITING')
            country: Country code
            limit: Maximum number of results (max 1000)
            offset: Pagination offset
            **kwargs: Additional API parameters

        Returns:
            Dictionary containing trials data and metadata
        """
        params = {
            "pageSize": min(limit, 1000),
            "pageNumber": (offset // limit) + 1 if limit > 0 else 1,
            "format": "json"
        }

        # Build filter string
        filters = []

        if query:
            filters.append(f'query.name:CONTAINS("{query}")')
            filters.append(f'query.cond:CONTAINS("{query}")')

        if condition:
            filters.append(f'condition:CONTAINS("{condition}")')

        if intervention:
            filters.append(f'interventionType:{intervention}')

        if status:
            filters.append(f'overallStatus:{status}')

        if country:
            filters.append(f'country:{country}')

        # Add custom filters from kwargs
        for key, value in kwargs.items():
            if value:
                filters.append(f'{key}:{value}')

        if filters:
            params['filter'] = " AND ".join(filters)

        try:
            print(f"Fetching trials with params: {params}")
            response = self.session.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching trials: {e}")
            return {"studies": [], "totalCount": 0, "error": str(e)}

    def fetch_trial_details(self, nct_id: str) -> Dict[str, Any]:
        """
        Fetch detailed information about a specific trial

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
            print(f"Error fetching trial details for {nct_id}: {e}")
            return {"error": str(e)}

    def parse_trials(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse and flatten trial data for database insertion

        Args:
            data: Raw API response

        Returns:
            List of formatted trial records
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

                trial = {
                    "nct_id": identification_module.get("nctId"),
                    "title": identification_module.get("officialTitle"),
                    "brief_title": identification_module.get("briefTitle"),
                    "overall_status": status_module.get("overallStatus"),
                    "phase": status_module.get("phases", [None])[0] if status_module.get("phases") else None,
                    "start_date": status_module.get("startDateStruct", {}).get("date"),
                    "completion_date": status_module.get("completionDateStruct", {}).get("date"),
                    "primary_completion_date": status_module.get("primaryCompletionDateStruct", {}).get("date"),
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
                    "locations": [
                        {
                            "facility": loc.get("facility"),
                            "status": loc.get("status"),
                            "city": loc.get("city"),
                            "state": loc.get("state"),
                            "zip": loc.get("zip"),
                            "country": loc.get("country")
                        }
                        for loc in contacts_locations_module.get("locations", [])
                    ],
                    "enrollment": status_module.get("enrollmentInfo", {}).get("count"),
                    "fetched_at": datetime.utcnow().isoformat()
                }
                trials.append(trial)
            except Exception as e:
                print(f"Error parsing trial: {e}")
                continue

        return trials

    def save_to_json(self, data: List[Dict[str, Any]], filename: str = "trials.json"):
        """Save trials to JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved {len(data)} trials to {filename}")
        except Exception as e:
            print(f"Error saving to JSON: {e}")

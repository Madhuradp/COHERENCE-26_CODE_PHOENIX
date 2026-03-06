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
                description_module = protocol_section.get("descriptionModule", {})
                sponsor_module = protocol_section.get("sponsorCollaboratorsModule", {})

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
                    "description": description_module.get("briefSummary"),
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
                    "sponsor": sponsor_module.get("leadSponsor", {}).get("name"),
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
            filtered = [t for t in filtered if t.get("overall_status") == status.upper()]

        if country:
            filtered = [
                t for t in filtered
                if any(loc.get("country") == country for loc in t.get("locations", []))
            ]

        return filtered

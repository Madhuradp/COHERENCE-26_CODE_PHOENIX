from ..app.core.database import Database
from .fetch_clinical_trials import ClinicalTrialsFetcher
from ..app.services.semantic_search import SemanticSearchService

def sync_trials_to_db():
    db = Database()
    fetcher = ClinicalTrialsFetcher()
    semantic = SemanticSearchService() # Optional: generate embeddings on ingest
    
    print("Fetching trials...")
    raw_data = fetcher.fetch_trials_paginated(limit=100, max_pages=2)
    parsed_trials = fetcher.parse_trials(raw_data)
    
    for trial in parsed_trials:
        # Generate embedding during ingestion for ultra-fast matching later
        trial["embedding"] = semantic.generate_trial_embedding(trial).tolist()
        
        db.trials.update_one(
            {"nct_id": trial["nct_id"]},
            {"$set": trial},
            upsert=True
        )
    print(f"Successfully synced {len(parsed_trials)} trials.")
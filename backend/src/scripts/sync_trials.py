"""
Script to sync clinical trials from API to database
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db_integration import TrialsDB
from scripts.fetch_clinical_trials import ClinicalTrialsFetcher


def main():
    """Main sync function"""
    print("=" * 60)
    print("Clinical Trials Sync Script")
    print("=" * 60)

    try:
        # Initialize fetcher and database
        fetcher = ClinicalTrialsFetcher()
        db = TrialsDB()

        # Fetch first 2 pages of trials (200 trials)
        print("\nFetching trials from API (first 2 pages)...")
        api_data = fetcher.fetch_trials_paginated(limit=100, max_pages=2)

        if "error" in api_data:
            print(f"Error fetching from API: {api_data['error']}")
            return

        # Parse all trials
        print(f"\nParsing {len(api_data['studies'])} trials...")
        all_trials = fetcher.parse_trials(api_data)
        print(f"Parsed {len(all_trials)} trials")

        # Filter and store subsets
        print("\n" + "=" * 60)
        print("Filtering and storing trials by condition...")
        print("=" * 60)

        conditions = ["COVID-19", "cancer", "diabetes", "heart"]
        for condition in conditions:
            filtered = fetcher.filter_trials_locally(all_trials, condition=condition)
            if filtered:
                result = db.insert_trials(filtered)
                print(f"\n{condition.upper()}:")
                print(f"  Found: {len(filtered)} trials")
                print(f"  Inserted: {result['inserted']}, Updated: {result['updated']}, Errors: {result['errors']}")

        # Store recruiting trials
        print("\n" + "-" * 60)
        recruiting = fetcher.filter_trials_locally(all_trials, status="RECRUITING")
        if recruiting:
            result = db.insert_trials(recruiting)
            print(f"\nRECRUITING TRIALS:")
            print(f"  Found: {len(recruiting)} trials")
            print(f"  Inserted: {result['inserted']}, Updated: {result['updated']}, Errors: {result['errors']}")

        # Print statistics
        print("\n" + "=" * 60)
        print("Database Statistics")
        print("=" * 60)
        stats = db.get_statistics()
        print(f"Total trials in database: {stats.get('total_trials', 0)}")
        print(f"Status breakdown:")
        for status, count in stats.get('status_breakdown', {}).items():
            print(f"  {status}: {count}")

        db.close()

    except Exception as e:
        print(f"Error during sync: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("Sync complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

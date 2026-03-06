"""
Script to sync clinical trials from API to database
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db_integration import fetch_and_store_trials


def main():
    """Main sync function"""
    print("=" * 60)
    print("Clinical Trials Sync Script")
    print("=" * 60)

    # Example 1: Fetch COVID-19 recruiting trials
    print("\n[1/3] Syncing COVID-19 recruiting trials...")
    result = fetch_and_store_trials(
        condition="COVID-19",
        status="RECRUITING",
        limit=50
    )
    print(f"Result: {result}\n")

    # Example 2: Fetch cancer trials
    print("[2/3] Syncing cancer trials...")
    result = fetch_and_store_trials(
        condition="cancer",
        limit=50
    )
    print(f"Result: {result}\n")

    # Example 3: Fetch all recruiting trials
    print("[3/3] Syncing all recruiting trials...")
    result = fetch_and_store_trials(
        status="RECRUITING",
        limit=100
    )
    print(f"Result: {result}\n")

    print("=" * 60)
    print("Sync complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

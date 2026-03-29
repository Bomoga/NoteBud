"""
Generate a signed HS256 JWT for manual API testing.

Usage:
    venv/Scripts/python scripts/generate_test_token.py
    venv/Scripts/python scripts/generate_test_token.py --user-id my-user --hours 48
"""
import argparse
import datetime
import sys
from pathlib import Path

import jwt

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.lib.config.settings import settings


def main():
    parser = argparse.ArgumentParser(description="Generate a test JWT token.")
    parser.add_argument("--user-id", default="test-user-1", help="Value for the 'sub' claim")
    parser.add_argument("--hours", type=int, default=24, help="Token expiry in hours (default: 24)")
    args = parser.parse_args()

    payload = {
        "sub": args.user_id,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=args.hours),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    print(f"\nUser ID : {args.user_id}")
    print(f"Expires : {args.hours}h from now")
    print(f"\nToken:\n{token}")
    print(f"\nAuthorization header:\nAuthorization: Bearer {token}\n")


if __name__ == "__main__":
    main()

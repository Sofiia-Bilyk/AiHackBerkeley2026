from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..utils.errors import ApiError


PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    (
        "places.id", "places.displayName", "places.formattedAddress",
        "places.nationalPhoneNumber", "places.websiteUri", "places.googleMapsUri",
        "places.rating", "places.userRatingCount", "places.accessibilityOptions",
    )
)


def search_places(query: str, *, api_key: str) -> list[dict]:
    """Search Google Places Text Search (New) and normalize the selected fields."""
    request = Request(
        PLACES_URL,
        data=json.dumps({"textQuery": query, "pageSize": 10}).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ApiError("EXTERNAL_SERVICE_FAILED", "Google Places search failed.", 502) from error

    return [_normalize_place(place) for place in payload.get("places", [])]


def _normalize_place(place: dict) -> dict:
    accessibility = place.get("accessibilityOptions") or {}
    accessible = [key for key, value in accessibility.items() if value is True]
    return {
        "name": (place.get("displayName") or {}).get("text", "Unknown venue"),
        "address": place.get("formattedAddress", "Address unavailable"),
        "phone_number": place.get("nationalPhoneNumber"),
        "website_url": place.get("websiteUri"),
        "maps_url": place.get("googleMapsUri"),
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "accessibility_notes": ", ".join(accessible) or None,
        "source_place_id": place.get("id"),
    }


"""Subscription plans (monetization).

ClaimGuard is sold as a flat per-practice subscription. The plan a practice is
on is stored as a short key on ``practices.plan``; the human label and monthly
price live here (config, not data) so pricing can change without a migration.
Keep the keys/prices in sync with the marketing pricing page
(``frontend/components/marketing/pricing.tsx``).
"""

from decimal import Decimal

# key -> (label, monthly price in USD)
PLANS: dict[str, dict[str, object]] = {
    "claimguard": {"label": "ClaimGuard", "price_monthly": Decimal("299")},
}

DEFAULT_PLAN = "claimguard"


def get_plan(key: str | None) -> dict[str, object]:
    """Resolve a plan key to its label/price, falling back to the default."""
    return PLANS.get(key or DEFAULT_PLAN, PLANS[DEFAULT_PLAN])

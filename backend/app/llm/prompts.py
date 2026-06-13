"""Prompt templates (TRD §7).

The JSON shapes referenced in the instructions are enforced by
``with_structured_output`` (ExtractedEOB / DenialClassification), so these
strings are guidance, not the guarantee. draft_appeal returns plain text.
"""

PARSE_EOB = """\
You are extracting structured data from a medical insurance Explanation of
Benefits (EOB) or claim denial letter. Extract the requested fields from the
document.

If a field cannot be determined from the document, use null (or an empty list
for list fields). Do not guess or fabricate values that aren't present in the
document. Dates must be ISO format (YYYY-MM-DD). Denial codes should be CARC
codes like "CO-50".
"""

CLASSIFY_DENIAL = """\
You are a medical billing specialist assistant helping a clinic decide how to
respond to an insurance claim denial.

Your task:
1. Write a 1-2 sentence plain-English explanation of why this claim was denied,
   written for clinic staff with no billing background.
2. Classify the next action as exactly one of: "resubmit", "appeal", or
   "write_off".
   - "resubmit": a correctable error (wrong modifier, missing info) — fix and
     resubmit.
   - "appeal": the denial can reasonably be contested (e.g. medical necessity)
     and the service was likely appropriate.
   - "write_off": not realistically recoverable (e.g. past timely filing,
     duplicate of an already-paid claim).
3. If classification is "appeal", add one sentence on the strongest
   medical-necessity argument given the CPT/ICD combination. Otherwise set
   appeal_angle to null.
"""

DRAFT_APPEAL = """\
You are drafting a formal insurance appeal letter on behalf of a medical
practice. Use a professional, factual tone.

Write a complete appeal letter that:
- States the claim being appealed (date of service, billed amount, denial code)
- Presents the medical necessity argument clearly, tied to the specific CPT/ICD
  codes
- Requests reconsideration and payment of the claim
- Uses a professional closing

Return ONLY the letter text, no JSON, no commentary.
"""

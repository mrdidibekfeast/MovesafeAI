/*
 * Outbound search links for exercises and drills.
 *
 * We deliberately link to a SEARCH rather than to one hand-picked video or
 * our own step list: a search shows several demonstrations side by side,
 * keeps us from teaching a movement wrong through a single example, and
 * avoids implying that MoveSafe endorses any one creator.
 */

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// Report recommendations are stored as plain sentences, so the matching
// search is derived from their wording at display time. Returns null when a
// line is advice rather than something to practise (e.g. "Stop if it hurts").
const RECOMMENDATION_QUERIES: [RegExp, string][] = [
  [/valgus|knee[s]? (tracking|over the middle)/i, 'knee valgus correction exercises'],
  [/depth|range of motion/i, 'how to improve squat depth mobility drills'],
  [/landing|absorb/i, 'soft landing mechanics drills'],
  [/trunk/i, 'squat upright torso cues and drills'],
  [/pelvi/i, 'single leg balance exercises for pelvic control'],
  [/cadence|quicker steps/i, 'running cadence drills'],
  [/stance|softer knee/i, 'running form soft knee drills'],
  [/single-leg|single leg/i, 'single leg stability exercises'],
];

export function recommendationSearchQuery(recommendation: string): string | null {
  if (!/^Priority/i.test(recommendation.trim())) return null;
  for (const [pattern, query] of RECOMMENDATION_QUERIES) {
    if (pattern.test(recommendation)) return query;
  }
  return null;
}

/*
Looks up a species on Wikipedia by name (scientific or common) and returns its description
and lead image, for autofilling the "Add Species" form. This only talks to Wikipedia's public
APIs directly from the browser (both endpoints below allow cross-origin requests), so it needs
no backend route of its own.
*/

export interface WikipediaSpeciesInfo {
  description: string;
  image: string | null;
}

interface WikipediaSearchResponse {
  query?: {
    search?: { title: string }[];
  };
}

interface WikipediaSummaryResponse {
  extract?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
}

const SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";

// Returns null if no matching Wikipedia article could be found.
export async function searchWikipediaSpecies(query: string): Promise<WikipediaSpeciesInfo | null> {
  const title = await findBestMatchingTitle(query);
  if (!title) {
    return null;
  }

  const summary = await fetchArticleSummary(title);
  if (!summary?.extract) {
    return null;
  }

  return {
    description: summary.extract,
    image: summary.originalimage?.source ?? summary.thumbnail?.source ?? null,
  };
}

// Uses Wikipedia's search API to find the title of the article that best matches the query.
async function findBestMatchingTitle(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    format: "json",
    origin: "*",
    srlimit: "1",
    srsearch: query,
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as WikipediaSearchResponse;
  return data.query?.search?.[0]?.title ?? null;
}

// Fetches the plain-text summary and lead image for a specific Wikipedia article title.
async function fetchArticleSummary(title: string): Promise<WikipediaSummaryResponse | null> {
  const res = await fetch(`${SUMMARY_URL}/${encodeURIComponent(title)}`);
  if (!res.ok) {
    return null;
  }

  return (await res.json()) as WikipediaSummaryResponse;
}

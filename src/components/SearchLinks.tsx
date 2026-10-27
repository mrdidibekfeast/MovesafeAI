import { googleSearchUrl, youtubeSearchUrl } from '../utils/searchLinks';

interface SearchLinksProps {
  // What to search for, e.g. "glute bridge exercise form".
  query: string;
  // Short lead-in shown before the links.
  label?: string;
  // Show the Google link as well as YouTube (default: both).
  includeGoogle?: boolean;
  className?: string;
}

// Two outbound links — YouTube for demonstrations, Google for written
// guidance. Always opens in a new tab; the arrow glyph signals that.
function SearchLinks({ query, label, includeGoogle = true, className }: SearchLinksProps) {
  return (
    <div className={className ? `search-links ${className}` : 'search-links'}>
      {label && <span className="search-links-label">{label}</span>}
      <a
        href={youtubeSearchUrl(query)}
        className="search-link search-link-primary"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Search YouTube for ${query} (opens in a new tab)`}
      >
        Examples on YouTube
        <span aria-hidden="true">↗</span>
      </a>
      {includeGoogle && (
        <a
          href={googleSearchUrl(query)}
          className="search-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search Google for ${query} (opens in a new tab)`}
        >
          Google
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}

export default SearchLinks;

import { youtubeSearchUrl } from '../utils/searchLinks';

interface VideoResourceCardProps {
  thumbnail: string;
  thumbnailAlt: string;
  title: string;
  topic: string;
  source: string;
  description: string;
  url: string;
  // Search phrase for video demonstrations of this topic.
  searchQuery: string;
}

function VideoResourceCard({
  thumbnail,
  thumbnailAlt,
  title,
  topic,
  source,
  description,
  url,
  searchQuery,
}: VideoResourceCardProps) {
  return (
    <article className="video-card">
      <img src={thumbnail} alt={thumbnailAlt} className="video-thumbnail" loading="lazy" />
      <div className="video-content">
        <p className="video-topic">{topic}</p>
        <h3 className="video-title">{title}</h3>
        <p className="video-source">{source}</p>
        <p className="video-description">{description}</p>
        <div className="video-actions">
          <a
            href={url}
            className="video-button"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${title} from ${source} (opens in a new tab)`}
          >
            Read the guide
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href={youtubeSearchUrl(searchQuery)}
            className="video-button video-button-secondary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Search YouTube for ${searchQuery} (opens in a new tab)`}
          >
            Videos on YouTube
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export default VideoResourceCard;

interface VideoResourceCardProps {
  thumbnail: string;
  thumbnailAlt: string;
  title: string;
  topic: string;
  source: string;
  description: string;
  url: string;
}

function VideoResourceCard({
  thumbnail,
  thumbnailAlt,
  title,
  topic,
  source,
  description,
  url,
}: VideoResourceCardProps) {
  return (
    <article className="video-card">
      <img src={thumbnail} alt={thumbnailAlt} className="video-thumbnail" loading="lazy" />
      <div className="video-content">
        <p className="video-topic">{topic}</p>
        <h3 className="video-title">{title}</h3>
        <p className="video-source">{source}</p>
        <p className="video-description">{description}</p>
        <a
          href={url}
          className="video-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch Video
        </a>
      </div>
    </article>
  );
}

export default VideoResourceCard;

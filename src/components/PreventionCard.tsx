interface PreventionCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  tips: string[];
}

function PreventionCard({ image, imageAlt, title, description, tips }: PreventionCardProps) {
  return (
    <article className="prevention-card">
      <img src={image} alt={imageAlt} className="prevention-image" loading="lazy" />
      <div className="prevention-content">
        <h3 className="prevention-title">{title}</h3>
        <p className="prevention-description">{description}</p>
        <ul className="prevention-list">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default PreventionCard;

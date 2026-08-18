import { Link } from 'react-router-dom';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

function FeatureCard({ icon, title, description, buttonText, buttonLink }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <span className="feature-card-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-description">{description}</p>
      <Link
        to={buttonLink}
        className="feature-card-button"
        aria-label={`${buttonText} ${title}`}
      >
        {buttonText}
      </Link>
    </article>
  );
}

export default FeatureCard;

interface LearnCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  buttonText: string;
}

function LearnCard({ image, imageAlt, title, description, buttonText }: LearnCardProps) {
  return (
    <article className="learn-card">
      <img src={image} alt={imageAlt} className="learn-card-image" loading="lazy" />
      <div className="learn-card-body">
        <h3 className="learn-card-title">{title}</h3>
        <p className="learn-card-description">{description}</p>
        <button type="button" className="learn-card-button">
          {buttonText}
        </button>
      </div>
    </article>
  );
}

export default LearnCard;

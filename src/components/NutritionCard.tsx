interface NutritionCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  tips: string[];
}

function NutritionCard({ image, imageAlt, title, description, tips }: NutritionCardProps) {
  return (
    <article className="nutrition-card">
      <img src={image} alt={imageAlt} className="nutrition-image" loading="lazy" />
      <div className="nutrition-content">
        <h3 className="nutrition-title">{title}</h3>
        <p className="nutrition-description">{description}</p>
        <ul className="nutrition-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default NutritionCard;

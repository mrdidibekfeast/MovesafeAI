interface InjuryCardProps {
  image: string;
  imageAlt: string;
  title: string;
  affectedArea: string;
  description: string;
  watchFor: string[];
  helpfulHabits: string[];
}

function InjuryCard({
  image,
  imageAlt,
  title,
  affectedArea,
  description,
  watchFor,
  helpfulHabits,
}: InjuryCardProps) {
  return (
    <article className="injury-card">
      <img src={image} alt={imageAlt} className="injury-image" loading="lazy" />
      <div className="injury-body">
        <h3 className="injury-title">{title}</h3>
        <p className="injury-area">{affectedArea}</p>
        <p className="injury-description">{description}</p>

        <p className="injury-list-title">Watch For</p>
        <ul className="injury-list">
          {watchFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="injury-list-title">Helpful Habits</p>
        <ul className="injury-list">
          {helpfulHabits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default InjuryCard;

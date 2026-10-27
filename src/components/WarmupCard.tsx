import SearchLinks from './SearchLinks';

interface WarmupCardProps {
  image: string;
  imageAlt: string;
  title: string;
  purpose: string;
  cue: string;
  steps: string[];
  // Search phrase for outside demonstrations of this drill.
  searchQuery: string;
}

function WarmupCard({ image, imageAlt, title, purpose, cue, steps, searchQuery }: WarmupCardProps) {
  return (
    <article className="warmup-card">
      <img src={image} alt={imageAlt} className="warmup-image" loading="lazy" />
      <div className="warmup-content">
        <h3 className="warmup-title">{title}</h3>
        <p className="warmup-purpose">{purpose}</p>

        <p className="warmup-cue">
          <span className="warmup-cue-label">Coaching cue</span>
          {cue}
        </p>

        <ol className="warmup-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {/* Several demonstrations beat our one illustration — send people to
            compare examples before they try it. */}
        <SearchLinks query={searchQuery} label="Watch it done first:" />
      </div>
    </article>
  );
}

export default WarmupCard;

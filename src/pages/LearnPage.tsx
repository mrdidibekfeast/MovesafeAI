import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LearnCard from '../components/LearnCard';
import PreventionCard from '../components/PreventionCard';
import InjuryCard from '../components/InjuryCard';
import LearnImageCard from '../components/learn/LearnImageCard';
import type { LearnImageCardProps } from '../components/learn/LearnImageCard';
import NutritionCard from '../components/NutritionCard';
import WarmupCard from '../components/WarmupCard';
import VideoResourceCard from '../components/VideoResourceCard';
import screeningImg from '../assets/learn-screening.svg';
import warmupImg from '../assets/learn-warmup.svg';
import reportImg from '../assets/learn-report.svg';
import kneeImg from '../assets/prevention-knee.svg';
import ankleImg from '../assets/prevention-ankle.svg';
import landingImg from '../assets/prevention-landing.svg';
import shinImg from '../assets/prevention-shin.svg';
import injuryKneeImg from '../assets/injury-knee.svg';
import injuryAclImg from '../assets/injury-knee-acl.svg';
import injuryAnkleImg from '../assets/injury-ankle.svg';
import injuryShinImg from '../assets/injury-shin.svg';
import injuryAchillesImg from '../assets/injury-achilles.svg';
import injuryBackImg from '../assets/injury-back.svg';
import forwardHeadImg from '../assets/learn/forward-head-posture.svg';
import collapsedKneeImg from '../assets/learn/collapsed-knee-squat.svg';
import roundedBackImg from '../assets/learn/rounded-back-lifting.svg';
import stiffLandingImg from '../assets/learn/stiff-upright-landing.svg';
import forwardLeanImg from '../assets/learn/excessive-forward-lean.svg';
import unevenShouldersImg from '../assets/learn/uneven-shoulders.svg';
import safeSquatImg from '../assets/learn/safe-squat-form.svg';
import safeLiftImg from '../assets/learn/safe-lifting-form.svg';
import runningPostureImg from '../assets/learn/running-posture.svg';
import jumpLandingImg from '../assets/learn/jump-landing-technique.svg';
import nutritionCaloriesImg from '../assets/nutrition-calories.svg';
import nutritionProteinImg from '../assets/nutrition-protein.svg';
import nutritionCarbsImg from '../assets/nutrition-carbs.svg';
import nutritionProduceImg from '../assets/nutrition-produce.svg';
import nutritionHydrationImg from '../assets/nutrition-hydration.svg';
import nutritionSupplementsImg from '../assets/nutrition-supplements.svg';
import warmupAnkleImg from '../assets/warmup-ankle.svg';
import warmupLegSwingImg from '../assets/warmup-legswing.svg';
import warmupBridgeImg from '../assets/warmup-bridge.svg';
import warmupSquatReachImg from '../assets/warmup-squatreach.svg';
import videoWarmupImg from '../assets/video-warmup.svg';
import videoKneeImg from '../assets/video-knee.svg';
import videoAnkleImg from '../assets/video-ankle.svg';
import videoMobilityImg from '../assets/video-mobility.svg';
import videoLandingImg from '../assets/video-landing.svg';
import videoPreventionImg from '../assets/video-prevention.svg';
import '../styles/learn.css';

const videoResources = [
  {
    thumbnail: videoWarmupImg,
    thumbnailAlt: 'Play button over a dynamic warm-up thumbnail',
    topic: 'Dynamic Warm-Up',
    title: 'How to Warm Up Before Exercising',
    source: 'NHS',
    description:
      'A clear guide to warming up before activity, with dynamic movements that prepare your muscles and joints.',
    url: 'https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/',
  },
  {
    thumbnail: videoKneeImg,
    thumbnailAlt: 'Play button over a knee exercises thumbnail',
    topic: 'Knee Control Exercises',
    title: 'Knee Conditioning Program',
    source: 'OrthoInfo (AAOS)',
    description:
      'A guided conditioning program with strengthening and stretching exercises that support knee stability.',
    url: 'https://orthoinfo.aaos.org/en/recovery/knee-conditioning-program/',
  },
  {
    thumbnail: videoAnkleImg,
    thumbnailAlt: 'Play button over an ankle strengthening thumbnail',
    topic: 'Ankle Strengthening',
    title: 'Foot & Ankle Conditioning Program',
    source: 'OrthoInfo (AAOS)',
    description:
      'A foot and ankle conditioning program covering strengthening and stretching for the lower leg.',
    url: 'https://orthoinfo.aaos.org/en/recovery/foot-and-ankle-conditioning-program/',
  },
  {
    thumbnail: videoMobilityImg,
    thumbnailAlt: 'Play button over a foot and ankle mobility thumbnail',
    topic: 'Foot & Ankle Mobility',
    title: 'NHS Exercise & Mobility Guides',
    source: 'NHS',
    description:
      'The NHS exercise hub with routines and guidance that support healthy joint mobility, including the ankles.',
    url: 'https://www.nhs.uk/live-well/exercise/',
  },
  {
    thumbnail: videoLandingImg,
    thumbnailAlt: 'Play button over a landing mechanics thumbnail',
    topic: 'Landing Mechanics',
    title: 'Sports Medicine Movement Library',
    source: 'Hospital for Special Surgery',
    description:
      'Sports medicine education from a leading orthopedic hospital, including safe movement and landing guidance.',
    url: 'https://www.hss.edu/',
  },
  {
    thumbnail: videoPreventionImg,
    thumbnailAlt: 'Play button over an injury prevention thumbnail',
    topic: 'General Injury Prevention',
    title: 'Fitness & Injury Prevention Basics',
    source: 'Mayo Clinic',
    description:
      'Fitness guidance covering safe training habits, gradual progression, and reducing everyday injury risk.',
    url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness',
  },
];

const warmupCards = [
  {
    image: warmupAnkleImg,
    imageAlt: 'Illustration of an ankle mobility drill against a wall',
    title: 'Ankle Rocks',
    purpose: 'Improve ankle mobility before walking, running, or squatting.',
    cue: 'Keep your heel on the ground while moving your knee forward.',
    steps: [
      'Stand facing a wall.',
      'Move one knee toward the wall without lifting the heel.',
      'Repeat slowly on both sides.',
    ],
  },
  {
    image: warmupLegSwingImg,
    imageAlt: 'Illustration of a figure swinging one leg forward and back',
    title: 'Leg Swings',
    purpose: 'Increase hip mobility and prepare the legs for movement.',
    cue: 'Keep your upper body stable while swinging your leg.',
    steps: [
      'Hold onto a stable object.',
      'Swing one leg forward and backward.',
      'Repeat on both legs.',
    ],
  },
  {
    image: warmupBridgeImg,
    imageAlt: 'Illustration of a glute bridge with the hips lifted',
    title: 'Glute Bridge',
    purpose: 'Activate the glute muscles before activity.',
    cue: 'Lift using your hips, not your lower back.',
    steps: [
      'Lie on your back with knees bent.',
      'Press through your heels.',
      'Lift your hips and slowly lower.',
    ],
  },
  {
    image: warmupSquatReachImg,
    imageAlt: 'Illustration of a squat with both arms reaching overhead',
    title: 'Squat to Reach',
    purpose: 'Improve full-body mobility before exercise.',
    cue: 'Keep your chest up and move smoothly.',
    steps: [
      'Perform a comfortable squat.',
      'Reach both hands overhead while standing.',
      'Repeat with controlled movement.',
    ],
  },
];

const nutritionCards = [
  {
    image: nutritionCaloriesImg,
    imageAlt: 'Illustration of a flame representing energy from food',
    title: 'Eat Enough Calories',
    description:
      'Food provides the energy your body needs to move, train, and recover throughout the day.',
    tips: [
      'Fuel your daily activity with enough energy.',
      'Support recovery after training.',
      'Avoid chronic under-fueling.',
    ],
  },
  {
    image: nutritionProteinImg,
    imageAlt: 'Illustration of interlocking links representing protein building blocks',
    title: 'Protein for Recovery',
    description:
      'Protein helps your body repair and rebuild after exercise, supporting steady recovery.',
    tips: [
      'Support muscle repair.',
      'Aid recovery after exercise.',
      'Spread protein across the day.',
    ],
  },
  {
    image: nutritionCarbsImg,
    imageAlt: 'Illustration of a grain roll representing carbohydrates',
    title: 'Carbohydrates for Energy',
    description:
      'Carbohydrates are a primary fuel source that powers activity and helps you keep going.',
    tips: [
      'Fuel your activity and workouts.',
      'Support endurance efforts.',
      'Help refuel after training.',
    ],
  },
  {
    image: nutritionProduceImg,
    imageAlt: 'Illustration of colorful fruits and vegetables',
    title: 'Fruits and Vegetables',
    description:
      'Colorful produce provides a wide range of vitamins, minerals, and fiber that support overall health.',
    tips: [
      'Get a variety of vitamins and minerals.',
      'Add fiber to your meals.',
      'Choose a range of colors.',
    ],
  },
  {
    image: nutritionHydrationImg,
    imageAlt: 'Illustration of a water droplet representing hydration',
    title: 'Hydration and Electrolytes',
    description:
      'Staying hydrated supports performance and helps your body function well during activity.',
    tips: [
      'Drink enough water through the day.',
      'Replace fluids during activity.',
      'Balance electrolytes after heavy sweating.',
    ],
  },
  {
    image: nutritionSupplementsImg,
    imageAlt: 'Illustration of a capsule representing supplements',
    title: 'Supplements',
    description:
      'Whole foods come first, and supplements are only sometimes helpful for specific needs.',
    tips: [
      'Take a food-first approach.',
      'Consult healthcare professionals.',
      'Avoid unnecessary supplementation.',
    ],
  },
];

const postureExamples: LearnImageCardProps[] = [
  {
    image: forwardHeadImg,
    alt: 'Side view of a person standing with their head jutting forward of the shoulders and the upper back rounded.',
    title: 'Forward Head & Rounded Shoulders',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'The head drifts ahead of the shoulders and the upper back rounds, often after long hours at a desk or on a phone.',
    why: 'Carrying the head forward loads the neck and upper back and can make that area tire or ache more quickly.',
    tip: 'Stack your ears over your shoulders and strengthen the upper back with rows and chin tucks.',
    annotations: [
      { kind: 'line', color: 'guide', dashed: true, x1: 240, y1: 118, x2: 240, y2: 255 },
      { kind: 'circle', color: 'warn', cx: 277, cy: 88, r: 22 },
      { kind: 'arrow', color: 'warn', x1: 252, y1: 90, x2: 272, y2: 90 },
    ],
  },
  {
    image: collapsedKneeImg,
    alt: 'Front view of a person squatting with one knee caving inward toward the midline.',
    title: 'Collapsed Knee During Squat',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'One or both knees drift inward during a squat instead of tracking over the toes.',
    why: 'An inward-collapsing knee places uneven load across the joint and is a common movement pattern behind knee discomfort.',
    tip: 'Push your knees out to track over your toes and strengthen the hips and glutes.',
    annotations: [
      { kind: 'line', color: 'guide', dashed: true, x1: 202, y1: 276, x2: 212, y2: 180 },
      { kind: 'circle', color: 'warn', cx: 232, cy: 216, r: 16 },
      { kind: 'arrow', color: 'warn', x1: 216, y1: 216, x2: 234, y2: 216 },
    ],
  },
  {
    image: roundedBackImg,
    alt: 'Side view of a person bending to lift a box with a rounded lower back.',
    title: 'Rounded Back During Lifting',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'The spine rounds forward when lifting, shifting the load onto the lower back rather than the legs.',
    why: 'Lifting with a rounded back concentrates stress on the spine instead of sharing it with the stronger hips and legs.',
    tip: 'Hinge at the hips, keep a neutral spine, and drive up through your legs.',
    annotations: [
      { kind: 'line', color: 'warn', x1: 245, y1: 176, x2: 273, y2: 150 },
      { kind: 'line', color: 'warn', x1: 273, y1: 150, x2: 300, y2: 156 },
      { kind: 'circle', color: 'warn', cx: 250, cy: 172, r: 13 },
    ],
  },
  {
    image: stiffLandingImg,
    alt: 'Front view of a person landing from a jump with straight, stiff legs and an upright torso.',
    title: 'Stiff Upright Landing',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'Landing with straight legs and an upright torso sends impact through the joints instead of absorbing it.',
    why: 'Stiff landings give the muscles little chance to cushion the force, so more of it travels up through the knees and hips.',
    tip: 'Land softly and let your hips, knees, and ankles bend to absorb the impact.',
    annotations: [
      { kind: 'arrow', color: 'warn', x1: 219, y1: 276, x2: 221, y2: 186 },
      { kind: 'arrow', color: 'warn', x1: 261, y1: 276, x2: 259, y2: 186 },
    ],
  },
  {
    image: forwardLeanImg,
    alt: 'Side view of a person squatting with the torso leaning excessively far forward.',
    title: 'Excessive Forward Lean',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'The torso tips too far forward during a squat, moving weight onto the toes and away from a balanced position.',
    why: 'A heavy forward lean shifts load toward the lower back and can make the movement harder to control.',
    tip: 'Keep your chest up, sit back into your hips, and work on ankle mobility.',
    annotations: [
      { kind: 'line', color: 'guide', dashed: true, x1: 235, y1: 120, x2: 235, y2: 255 },
      { kind: 'line', color: 'warn', x1: 235, y1: 188, x2: 288, y2: 142 },
      { kind: 'arrow', color: 'warn', x1: 278, y1: 150, x2: 302, y2: 128 },
    ],
  },
  {
    image: unevenShouldersImg,
    alt: 'Front view of a person standing with one shoulder noticeably higher than the other.',
    title: 'Uneven Shoulder Position',
    badge: 'Watch for',
    tone: 'issue',
    description:
      'One shoulder sits higher than the other while standing, showing an uneven resting position.',
    why: 'A persistent side-to-side imbalance can lead to some muscles overworking while others stay under-used.',
    tip: 'Notice how you carry bags and sit, and train both sides evenly.',
    annotations: [
      { kind: 'line', color: 'guide', dashed: true, x1: 206, y1: 131, x2: 282, y2: 131 },
      { kind: 'line', color: 'warn', x1: 212, y1: 124, x2: 276, y2: 137 },
      { kind: 'circle', color: 'warn', cx: 212, cy: 122, r: 12 },
    ],
  },
  {
    image: safeSquatImg,
    alt: 'Side view of a person squatting with a neutral spine, chest up, and the knee tracking over the foot.',
    title: 'Safe Squat Technique',
    badge: 'Good form',
    tone: 'good',
    description:
      'A balanced squat keeps a neutral spine, an upright chest, and the knee tracking over the foot.',
    why: 'Good alignment shares the load across the hips, knees, and ankles so no single joint is overworked.',
    tip: 'Sit back into your hips, keep your chest tall, and press the floor away as you stand.',
    annotations: [
      { kind: 'line', color: 'good', x1: 233, y1: 132, x2: 230, y2: 186 },
      { kind: 'line', color: 'good', x1: 276, y1: 278, x2: 272, y2: 216 },
      { kind: 'circle', color: 'good', cx: 272, cy: 216, r: 15 },
    ],
  },
  {
    image: safeLiftImg,
    alt: 'Side view of a person lifting a box with a flat, neutral spine and the load held close to the body.',
    title: 'Safe Lifting Technique',
    badge: 'Good form',
    tone: 'good',
    description:
      'A safe lift keeps a neutral, flat spine, hinges at the hips, and holds the load close to the body.',
    why: 'Hinging at the hips lets the strong legs and glutes do the work and keeps stress off the spine.',
    tip: 'Bend at the hips, keep the box close, and stand up by driving through your legs.',
    annotations: [
      { kind: 'line', color: 'good', x1: 250, y1: 182, x2: 299, y2: 151 },
      { kind: 'circle', color: 'good', cx: 250, cy: 182, r: 13 },
    ],
  },
  {
    image: runningPostureImg,
    alt: 'Side view of a person running with a tall posture, a slight forward lean, and driving arms.',
    title: 'Running Posture',
    badge: 'Good form',
    tone: 'good',
    description:
      'Efficient running keeps a tall posture with a slight forward lean from the ankles and relaxed, driving arms.',
    why: 'Staying tall with a small lean helps you move forward efficiently and land under your body.',
    tip: 'Run tall, lean slightly from the ankles, and let your arms swing front-to-back.',
    annotations: [
      { kind: 'line', color: 'good', x1: 255, y1: 110, x2: 240, y2: 180 },
      { kind: 'arrow', color: 'guide', x1: 305, y1: 150, x2: 345, y2: 150 },
      { kind: 'circle', color: 'good', cx: 280, cy: 192, r: 13 },
    ],
  },
  {
    image: jumpLandingImg,
    alt: 'Front view of a person landing softly from a jump with the hips back and the knees bent over the feet.',
    title: 'Jump-Landing Technique',
    badge: 'Good form',
    tone: 'good',
    description:
      'A soft landing sinks the hips back and bends the knees so they stay stacked over the feet.',
    why: 'Bending the hips and knees spreads the landing force over time, easing the load on any one joint.',
    tip: 'Land quietly, sink your hips back, and keep your knees pointing over your toes.',
    annotations: [
      { kind: 'line', color: 'good', x1: 206, y1: 272, x2: 210, y2: 214 },
      { kind: 'line', color: 'good', x1: 274, y1: 272, x2: 270, y2: 214 },
      { kind: 'arrow', color: 'good', x1: 240, y1: 150, x2: 240, y2: 182 },
    ],
  },
];

const injuryCards = [
  {
    image: injuryKneeImg,
    imageAlt: 'Illustration of a knee joint with a highlighted kneecap',
    title: 'Patellofemoral Pain',
    affectedArea: 'Knee',
    description:
      'Discomfort around the front of the knee that can appear during squatting, stairs, or running. It is often linked to how the kneecap tracks during movement.',
    watchFor: [
      'Aching around or behind the kneecap.',
      'Discomfort on stairs or after sitting.',
      'Knees drifting inward when squatting.',
    ],
    helpfulHabits: [
      'Strengthen the hips, glutes, and quads.',
      'Keep knees aligned over the toes.',
      'Build training volume gradually.',
    ],
  },
  {
    image: injuryAclImg,
    imageAlt: 'Illustration of a knee joint highlighting crossing ligaments',
    title: 'ACL Stress Patterns',
    affectedArea: 'Knee',
    description:
      'Movement habits that place extra load on the knee ligaments, often seen during cutting, pivoting, or awkward landings.',
    watchFor: [
      'Knees collapsing inward on landing.',
      'Stiff, straight-legged landings.',
      'Sudden pivots without control.',
    ],
    helpfulHabits: [
      'Practice soft, controlled landings.',
      'Train balance and single-leg control.',
      'Strengthen hamstrings and glutes.',
    ],
  },
  {
    image: injuryAnkleImg,
    imageAlt: 'Illustration of an ankle joint with a balance arc beneath it',
    title: 'Ankle Sprain Risk',
    affectedArea: 'Ankle',
    description:
      'The ankle can roll or twist on uneven ground or during quick direction changes, especially when stability is limited.',
    watchFor: [
      'Rolling the ankle on uneven surfaces.',
      'Feeling unstable when changing direction.',
      'A history of previous sprains.',
    ],
    helpfulHabits: [
      'Train balance and stability.',
      'Improve ankle mobility.',
      'Choose supportive footwear.',
    ],
  },
  {
    image: injuryShinImg,
    imageAlt: 'Illustration of a lower leg emphasizing the shin',
    title: 'Shin Splints',
    affectedArea: 'Lower Leg',
    description:
      'Irritation along the shin bone that often shows up when training load increases too quickly or on hard surfaces.',
    watchFor: [
      'Aching along the inner shin.',
      'Discomfort early in a run.',
      'Symptoms after ramping up mileage.',
    ],
    helpfulHabits: [
      'Increase training load gradually.',
      'Strengthen the calves and feet.',
      'Rotate running surfaces and shoes.',
    ],
  },
  {
    image: injuryAchillesImg,
    imageAlt: 'Illustration of a lower leg highlighting the Achilles tendon',
    title: 'Achilles Tendon Irritation',
    affectedArea: 'Achilles Tendon',
    description:
      'The Achilles tendon can become irritated with rapid increases in activity or repeated high loads, especially during running and jumping.',
    watchFor: [
      'Stiffness in the tendon in the morning.',
      'Discomfort when pushing off.',
      'Soreness after jumping or sprinting.',
    ],
    helpfulHabits: [
      'Add calf strengthening over time.',
      'Warm up before intense activity.',
      'Allow recovery between hard sessions.',
    ],
  },
  {
    image: injuryBackImg,
    imageAlt: 'Illustration of a spine with a highlighted lower-back region',
    title: 'Low Back Strain Patterns',
    affectedArea: 'Lower Back',
    description:
      'The lower back can feel strained when lifting, bending, or moving with limited core control or poor alignment.',
    watchFor: [
      'Rounding the back when lifting.',
      'Stiffness after prolonged sitting.',
      'Discomfort during bending or twisting.',
    ],
    helpfulHabits: [
      'Engage the core when lifting.',
      'Hinge at the hips, not the spine.',
      'Take movement breaks through the day.',
    ],
  },
];

const preventionCards = [
  {
    image: kneeImg,
    imageAlt: 'Illustration of a leg with the knee joint highlighted',
    title: 'Knee Control',
    description:
      'Keeping your knees stable and well-aligned protects the joint during everyday movement and activity.',
    tips: [
      'Keep knees aligned with your toes.',
      'Avoid excessive inward knee movement.',
      'Strengthen the hips and glutes.',
    ],
  },
  {
    image: ankleImg,
    imageAlt: 'Illustration of an ankle joint with a balance arc beneath it',
    title: 'Ankle Sprain Prevention',
    description:
      'Strong, mobile ankles improve balance and help you stay stable on uneven surfaces.',
    tips: [
      'Improve ankle mobility.',
      'Strengthen balance and stability.',
      'Wear appropriate footwear.',
    ],
  },
  {
    image: landingImg,
    imageAlt: 'Illustration of a figure landing with bent hips and knees',
    title: 'Landing Mechanics',
    description:
      'Absorbing impact through your hips and knees reduces stress on your joints when you land.',
    tips: [
      'Land softly.',
      'Bend the hips and knees.',
      'Maintain good body alignment.',
    ],
  },
  {
    image: shinImg,
    imageAlt: 'Illustration of a lower leg highlighting the shin and calf',
    title: 'Shin & Achilles Load',
    description:
      'Managing training load and caring for your calves helps your shins and Achilles adapt safely.',
    tips: [
      'Increase training gradually.',
      'Stretch and strengthen the calves.',
      'Allow adequate recovery between sessions.',
    ],
  },
];

const movementBasicsCards = [
  {
    image: screeningImg,
    imageAlt: 'Illustration of a body outline with highlighted joints being screened',
    title: 'Why Movement Screening Helps',
    description:
      'Screening helps you identify movement limitations, recognize inefficient movement patterns, and build better movement awareness. It is intended for educational purposes only.',
  },
  {
    image: warmupImg,
    imageAlt: 'Illustration of flowing motion lines representing a warm-up routine',
    title: 'Why Warm-Ups Matter',
    description:
      'A good warm-up prepares your muscles, improves mobility, and increases circulation — all of which help reduce the risk of injury during activity.',
  },
  {
    image: reportImg,
    imageAlt: 'Illustration of a bar chart and trend line representing a movement report',
    title: 'How to Read a Movement Report',
    description:
      'Learn what each part of your report means: the overall score, biomechanics score, individual movement grades, your strengths, improvement areas, and confidence values.',
  },
];

function LearnPage() {
  useDocumentTitle('Learn');
  return (
    <div className="learn-page">
      <section className="learn-section learn-hero" aria-labelledby="learn-hero-title">
        <div className="layout-container">
          <header>
            <p className="learn-section-label">Education Center</p>
            <h1 id="learn-hero-title" className="learn-hero-title">
              Learn About Better Movement
            </h1>
            <p className="learn-hero-description">
              Explore educational resources that help you better understand movement
              quality, injury prevention, posture, warm-ups, and healthy movement
              habits.
            </p>
          </header>
        </div>
      </section>

      <section
        className="learn-section movement-basics"
        aria-labelledby="movement-basics-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Movement Basics</p>
          <h2 id="movement-basics-title" className="learn-section-title">
            Build a Strong Foundation for Healthy Movement
          </h2>
          <p className="learn-section-description">
            Understanding how you move is the first step toward improving performance,
            reducing unnecessary stress on your body, and developing healthier movement
            habits that last.
          </p>

          <div className="learn-card-grid">
            {movementBasicsCards.map((card) => (
              <LearnCard
                key={card.title}
                image={card.image}
                imageAlt={card.imageAlt}
                title={card.title}
                description={card.description}
                buttonText="Read More"
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className="learn-section prevention-section"
        aria-labelledby="prevention-tips-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Prevention Tips</p>
          <h2 id="prevention-tips-title" className="learn-section-title">
            Build Better Movement Habits
          </h2>
          <p className="learn-section-description">
            Good movement habits, proper preparation, and consistent practice can help
            improve your movement quality and reduce unnecessary stress on your body
            over time.
          </p>

          <div className="prevention-grid">
            {preventionCards.map((card) => (
              <PreventionCard
                key={card.title}
                image={card.image}
                imageAlt={card.imageAlt}
                title={card.title}
                description={card.description}
                tips={card.tips}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className="learn-section injury-library"
        aria-labelledby="injury-library-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Injury Library</p>
          <h2 id="injury-library-title" className="learn-section-title">
            Learn About Common Movement-Related Conditions
          </h2>
          <p className="learn-section-description">
            Understanding common movement-related conditions can help you recognize
            inefficient movement patterns and build healthier movement habits. This
            information is educational only and should not replace advice from a
            qualified professional.
          </p>

          <div className="injury-grid">
            {injuryCards.map((card) => (
              <InjuryCard
                key={card.title}
                image={card.image}
                imageAlt={card.imageAlt}
                title={card.title}
                affectedArea={card.affectedArea}
                description={card.description}
                watchFor={card.watchFor}
                helpfulHabits={card.helpfulHabits}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className="learn-section posture-gallery"
        aria-labelledby="posture-gallery-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Posture Gallery</p>
          <h2 id="posture-gallery-title" className="learn-section-title">
            Recognize Common Movement Patterns
          </h2>
          <p className="learn-section-description">
            Recognizing common posture and movement patterns can help you better
            understand your movement reports and spot habits you may want to improve.
            The overlays point to the exact body area being explained. These examples
            are educational and should not be used for self-diagnosis.
          </p>

          <div className="learn-image-grid">
            {postureExamples.map((card) => (
              <LearnImageCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="learn-section nutrition-section"
        aria-labelledby="nutrition-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Nutrition</p>
          <h2 id="nutrition-title" className="learn-section-title">
            Fuel Your Body for Better Movement
          </h2>
          <p className="learn-section-description">
            Nutrition plays an important role in supporting your movement quality,
            recovery, training, and overall health. Nutritional needs vary from person
            to person, so consult qualified professionals for advice tailored to you.
          </p>

          <div className="nutrition-grid">
            {nutritionCards.map((card) => (
              <NutritionCard
                key={card.title}
                image={card.image}
                imageAlt={card.imageAlt}
                title={card.title}
                description={card.description}
                tips={card.tips}
              />
            ))}
          </div>

          <aside className="nutrition-note" role="note">
            <span className="nutrition-note-icon" aria-hidden="true">
              ℹ️
            </span>
            <p>
              Nutrition needs differ from person to person. This information is
              educational only — please consult a qualified healthcare or nutrition
              professional for personalized advice.
            </p>
          </aside>
        </div>
      </section>

      <section
        className="learn-section warmup-section"
        aria-labelledby="warmups-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Guided Warm-ups</p>
          <h2 id="warmups-title" className="learn-section-title">
            Prepare Your Body Before You Move
          </h2>
          <p className="learn-section-description">
            A proper warm-up helps prepare your muscles and joints for movement,
            improves mobility, and may reduce the risk of injury during physical
            activity.
          </p>

          <div className="warmup-grid">
            {warmupCards.map((card) => (
              <WarmupCard
                key={card.title}
                image={card.image}
                imageAlt={card.imageAlt}
                title={card.title}
                purpose={card.purpose}
                cue={card.cue}
                steps={card.steps}
              />
            ))}
          </div>

          <aside className="warmup-note" role="note">
            <h3 className="warmup-note-title">Before You Begin</h3>
            <p>
              Perform each exercise slowly and with control, and stop if you feel any
              pain or discomfort. If you have an existing injury or medical condition,
              consult a healthcare professional before starting.
            </p>
          </aside>
        </div>
      </section>

      <section
        className="learn-section video-section"
        aria-labelledby="video-resources-title"
      >
        <div className="layout-container">
          <p className="learn-section-label">Video Resources</p>
          <h2 id="video-resources-title" className="learn-section-title">
            Continue Learning from Trusted Sources
          </h2>
          <p className="learn-section-description">
            These resources offer additional education on movement quality, warm-ups,
            injury prevention, and exercise technique. MoveSafe AI does not own or
            create these videos — they open on each organization&apos;s own website.
          </p>

          <div className="video-grid">
            {videoResources.map((resource) => (
              <VideoResourceCard
                key={resource.title}
                thumbnail={resource.thumbnail}
                thumbnailAlt={resource.thumbnailAlt}
                topic={resource.topic}
                title={resource.title}
                source={resource.source}
                description={resource.description}
                url={resource.url}
              />
            ))}
          </div>

          <aside className="learn-reminder" role="note">
            <h3 className="learn-reminder-title">Keep Learning</h3>
            <p>
              Keep practicing good movement habits and pair what you learn with
              consistent exercise. Seek guidance from qualified professionals when you
              need it, and use your MoveSafe AI reports to monitor your progress over
              time.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default LearnPage;

/**
 * 30 short English idioms shown one per day on /home.
 * Picked by day-of-year mod 30 — adds personality, costs $0.
 */
export const IDIOMS: readonly string[] = [
  'A blessing in disguise.',
  'Better late than never.',
  'Bite the bullet.',
  'Break a leg.',
  'Call it a day.',
  'Cut to the chase.',
  'Get out of hand.',
  'Hit the nail on the head.',
  "It's a piece of cake.",
  'Let the cat out of the bag.',
  'Miss the boat.',
  'Once in a blue moon.',
  'Pull yourself together.',
  'So far, so good.',
  'Speak of the devil.',
  'The ball is in your court.',
  'The best of both worlds.',
  'Time flies.',
  'Under the weather.',
  'Wrap your head around it.',
  'Burn the midnight oil.',
  'Beat around the bush.',
  'A penny for your thoughts.',
  'Costs an arm and a leg.',
  'Hit the books.',
  'Spill the beans.',
  'Throw in the towel.',
  'Read between the lines.',
  'Take it with a grain of salt.',
  'When pigs fly.',
];

export function pickIdiom(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return IDIOMS[dayOfYear % IDIOMS.length];
}

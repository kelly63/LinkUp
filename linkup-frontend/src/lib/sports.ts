export const SPORTS = [
  'Baseball',
  'Basketball',
  'Cross Country',
  'Field Hockey',
  'Flag Football',
  'Football',
  'Golf',
  'Hockey (Ice)',
  'Lacrosse',
  'Rugby',
  'Soccer',
  'Softball',
  'Swimming',
  'Tennis',
  'Track and Field',
  'Volleyball',
  'Wrestling',
] as const;

export const WORKOUT_TYPES = [
  'Sport Practice / Drills',
  'Lifting / Strength',
  'Conditioning / Cardio',
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number];

export type Greeting = 'morning' | 'afternoon' | 'evening';

/** Time-of-day greeting key, the way coffee apps open their home screen. */
export function greetingFor(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

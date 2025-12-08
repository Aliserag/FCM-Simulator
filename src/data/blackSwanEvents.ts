/**
 * Black Swan Events - Major market crashes in crypto history
 * Used to label significant events on the simulation chart
 */

export interface BlackSwanEvent {
  id: string
  name: string           // Full name: "COVID-19 Crash"
  shortName: string      // Chart label: "COVID"
  year: number           // 2020
  dayOfYear: number      // Day of year (1-365)
  description: string    // Brief description
  severity: 'severe' | 'major' | 'moderate'
  priceDropPercent: number
}

export const BLACK_SWAN_EVENTS: BlackSwanEvent[] = [
  {
    id: 'covid-2020',
    name: 'COVID-19 Crash',
    shortName: 'COVID',
    year: 2020,
    dayOfYear: 72,  // March 12-13, 2020
    description: 'Global pandemic triggered -47% crash in 26 days',
    severity: 'severe',
    priceDropPercent: 47,
  },
  {
    id: 'luna-2022',
    name: 'LUNA Collapse',
    shortName: 'LUNA',
    year: 2022,
    dayOfYear: 130,  // May 9-12, 2022
    description: 'Terra/LUNA algorithmic stablecoin death spiral',
    severity: 'severe',
    priceDropPercent: 30,
  },
  {
    id: 'ftx-2022',
    name: 'FTX Collapse',
    shortName: 'FTX',
    year: 2022,
    dayOfYear: 310,  // November 6-8, 2022
    description: 'FTX exchange bankruptcy and fraud',
    severity: 'major',
    priceDropPercent: 25,
  },
]

/**
 * Get events that fall within a year range
 */
export function getEventsInRange(startYear: number, endYear: number): BlackSwanEvent[] {
  return BLACK_SWAN_EVENTS.filter(e => e.year >= startYear && e.year <= endYear)
}

/**
 * Convert event year/day to simulation day number
 * @param event The black swan event
 * @param startYear The simulation start year
 * @returns The day number in the simulation (0-indexed)
 */
export function eventToSimulationDay(event: BlackSwanEvent, startYear: number): number {
  const yearsFromStart = event.year - startYear
  return (yearsFromStart * 365) + event.dayOfYear
}

// Dynamic Country -> State -> City reference data used to drive cascading
// dropdowns on the PO Import screen (replaces free-text address entry).

export interface GeoState {
  name: string;
  abbr?: string;
  cities: string[];
}

export interface GeoCountry {
  name: string;
  states: GeoState[];
}

export const GEO_DATA: GeoCountry[] = [
  {
    name: 'United States',
    states: [
      { name: 'New York', abbr: 'NY', cities: ['New York City', 'Buffalo', 'Albany'] },
      { name: 'California', abbr: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
      { name: 'Texas', abbr: 'TX', cities: ['Houston', 'Dallas', 'Austin'] },
      { name: 'Illinois', abbr: 'IL', cities: ['Chicago', 'Springfield', 'Naperville'] },
      { name: 'New Jersey', abbr: 'NJ', cities: ['Newark', 'Jersey City', 'Teaneck'] },
      { name: 'Florida', abbr: 'FL', cities: ['Miami', 'Orlando', 'Tampa'] },
      { name: 'Massachusetts', abbr: 'MA', cities: ['Boston', 'Cambridge', 'Worcester'] },
      { name: 'North Carolina', abbr: 'NC', cities: ['Charlotte', 'Raleigh', 'Durham'] },
      { name: 'Georgia', abbr: 'GA', cities: ['Atlanta', 'Savannah', 'Augusta'] },
      { name: 'Washington', abbr: 'WA', cities: ['Seattle', 'Tacoma', 'Bellevue'] }
    ]
  },
  {
    name: 'United Kingdom',
    states: [
      { name: 'England', cities: ['London', 'Manchester', 'Birmingham'] },
      { name: 'Scotland', cities: ['Edinburgh', 'Glasgow', 'Aberdeen'] },
      { name: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport'] }
    ]
  },
  {
    name: 'India',
    states: [
      { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur'] },
      { name: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Mangaluru'] },
      { name: 'Telangana', cities: ['Hyderabad', 'Warangal'] },
      { name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai'] },
      { name: 'Delhi', cities: ['New Delhi'] },
      { name: 'West Bengal', cities: ['Kolkata', 'Howrah'] }
    ]
  },
  {
    name: 'United Arab Emirates',
    states: [
      { name: 'Dubai', cities: ['Dubai'] },
      { name: 'Abu Dhabi', cities: ['Abu Dhabi', 'Al Ain'] },
      { name: 'Sharjah', cities: ['Sharjah'] },
      { name: 'Ras Al Khaimah', cities: ['Ras Al Khaimah'] }
    ]
  },
  {
    name: 'France',
    states: [
      { name: 'Île-de-France', cities: ['Paris', 'Versailles'] },
      { name: 'Provence-Alpes-Côte d\'Azur', cities: ['Marseille', 'Nice'] },
      { name: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Grenoble'] }
    ]
  },
  {
    name: 'Germany',
    states: [
      { name: 'Bavaria', cities: ['Munich', 'Nuremberg'] },
      { name: 'Berlin', cities: ['Berlin'] },
      { name: 'Hesse', cities: ['Frankfurt', 'Wiesbaden'] }
    ]
  },
  {
    name: 'Canada',
    states: [
      { name: 'Ontario', cities: ['Toronto', 'Ottawa', 'Mississauga'] },
      { name: 'Quebec', cities: ['Montreal', 'Quebec City'] },
      { name: 'British Columbia', cities: ['Vancouver', 'Victoria'] }
    ]
  },
  {
    name: 'Singapore',
    states: [
      { name: 'Singapore', cities: ['Singapore'] }
    ]
  },
  {
    name: 'Australia',
    states: [
      { name: 'New South Wales', cities: ['Sydney', 'Newcastle'] },
      { name: 'Victoria', cities: ['Melbourne', 'Geelong'] },
      { name: 'Queensland', cities: ['Brisbane', 'Gold Coast'] }
    ]
  }
];

export const COUNTRY_NAMES: string[] = GEO_DATA.map(c => c.name);

export function getStates(countryName: string): GeoState[] {
  return GEO_DATA.find(c => c.name === countryName)?.states ?? [];
}

export function getCities(countryName: string, stateName: string): string[] {
  return getStates(countryName).find(s => s.name === stateName)?.cities ?? [];
}

/** Word-boundary, case-insensitive search for a value inside free text. */
function textContains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

/** Attempts to auto-detect a Country / State / City combination that appears in free-form PDF text. */
export function guessLocationFromText(text: string): { country: string; state: string; city: string } {
  for (const country of GEO_DATA) {
    if (!textContains(text, country.name)) continue;
    for (const state of country.states) {
      const stateMatches = textContains(text, state.name) || (state.abbr ? textContains(text, state.abbr) : false);
      if (!stateMatches) continue;
      for (const city of state.cities) {
        if (textContains(text, city)) {
          return { country: country.name, state: state.name, city };
        }
      }
      return { country: country.name, state: state.name, city: '' };
    }
    return { country: country.name, state: '', city: '' };
  }

  // Country not directly mentioned — fall back to scanning for a known state/city anywhere in the text.
  for (const country of GEO_DATA) {
    for (const state of country.states) {
      const stateMatches = textContains(text, state.name) || (state.abbr ? textContains(text, state.abbr) : false);
      if (!stateMatches) continue;
      for (const city of state.cities) {
        if (textContains(text, city)) {
          return { country: country.name, state: state.name, city };
        }
      }
      return { country: country.name, state: state.name, city: '' };
    }
  }

  return { country: '', state: '', city: '' };
}

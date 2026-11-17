import { describe, expect, it } from 'vitest';
import { clubFit, clubName, clubShort, surname } from './names';

describe('club names', () => {
  it('drops the club form', () => {
    expect(clubName('Liverpool F.C.')).toBe('Liverpool');
    expect(clubName('AFC Bournemouth')).toBe('Bournemouth');
    expect(clubName('Sunderland A.F.C.')).toBe('Sunderland');
    expect(clubName('Villarreal CF')).toBe('Villarreal');
    expect(clubName('Arsenal')).toBe('Arsenal');
    expect(clubName('F.C.')).toBe('F.C.');
  });

  it('keeps the form that is part of the name', () => {
    expect(clubName('Paris FC')).toBe('Paris FC');
    expect(clubName('Paris Saint-Germain F.C.')).toBe('Paris Saint-Germain');
    expect(clubShort('Paris FC')).toBe('Paris FC');
  });

  it('shortens on a narrow row only', () => {
    expect(clubShort('Manchester City F.C.')).toBe('Man City');
    expect(clubShort('Nottingham Forest F.C.')).toBe('Forest');
    expect(clubShort('Tottenham Hotspur F.C.')).toBe('Spurs');
    expect(clubFit('Brighton & Hove Albion F.C.', false)).toBe('Brighton & Hove Albion');
    expect(clubFit('Brighton & Hove Albion F.C.', true)).toBe('Brighton');
    expect(clubFit('Arsenal F.C.', true)).toBe('Arsenal');
  });
});

describe('surname', () => {
  it('keeps a particle with the surname', () => {
    expect(surname('Erling Haaland')).toBe('Haaland');
    expect(surname('Virgil van Dijk')).toBe('van Dijk');
    expect(surname('Kevin De Bruyne')).toBe('De Bruyne');
    expect(surname('Rodri')).toBe('Rodri');
  });
});

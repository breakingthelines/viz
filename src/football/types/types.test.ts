import { describe, expect, it } from 'vitest';
import {
  BodyPart,
  create,
  FootballActionPayloadSchema,
  FootballActionType,
  InterceptionEventDataSchema,
  InterceptionOutcome,
  PassEventDataSchema,
  ShotEventDataSchema,
  ShotOutcome,
  actionTypeName,
  isCarry,
  isInterception,
  isPass,
  isShot,
  isTackle,
  type MatchAction,
} from './index';

const shot: MatchAction = {
  id: 'shot-1',
  type: FootballActionType.SHOT,
  timestamp: 23,
  location: { x: 88, y: 45 },
  actionData: {
    case: 'shot',
    value: create(ShotEventDataSchema, {
      xg: 0.34,
      outcome: ShotOutcome.GOAL,
      bodyPart: BodyPart.LEFT_FOOT,
    }),
  },
};

const pass: MatchAction = {
  id: 'pass-1',
  type: FootballActionType.PASS,
  timestamp: 24,
  actionData: { case: 'pass', value: create(PassEventDataSchema, {}) },
};

describe('action type guards read the proto `actionData` oneof', () => {
  it('isShot accepts a shot and rejects a pass', () => {
    expect(isShot(shot)).toBe(true);
    expect(isShot(pass)).toBe(false);
  });

  it('isPass accepts a pass and rejects a shot', () => {
    expect(isPass(pass)).toBe(true);
    expect(isPass(shot)).toBe(false);
  });

  it('narrows to the payload the case names', () => {
    if (!isShot(shot)) throw new Error('isShot must narrow a shot');
    expect(shot.actionData.value.xg).toBe(0.34);
    expect(shot.actionData.value.outcome).toBe(ShotOutcome.GOAL);
  });

  it('filters a mixed list down to shots only', () => {
    expect([shot, pass].filter(isShot).map((a) => a.id)).toEqual(['shot-1']);
  });

  it('narrows a bare FootballActionPayload, not just a MatchAction', () => {
    const payload = create(FootballActionPayloadSchema, {
      type: FootballActionType.INTERCEPTION,
      actionData: {
        case: 'interception',
        value: create(InterceptionEventDataSchema, { outcome: InterceptionOutcome.WON }),
      },
    });
    if (!isInterception(payload)) throw new Error('isInterception must narrow the payload');
    expect(payload.actionData.value.outcome).toBe(InterceptionOutcome.WON);
  });

  it('isTackle and isCarry reject a shot', () => {
    expect(isTackle(shot)).toBe(false);
    expect(isCarry(shot)).toBe(false);
  });
});

describe('actionTypeName', () => {
  it('names every member of the current FootballActionType', () => {
    const members = Object.values(FootballActionType).filter(
      (v): v is FootballActionType => typeof v === 'number'
    );
    for (const member of members) {
      expect(actionTypeName[member]).toBeTypeOf('string');
    }
    expect(members).toHaveLength(15);
  });

  it('keeps the five original action names', () => {
    expect(actionTypeName[FootballActionType.SHOT]).toBe('shot');
    expect(actionTypeName[FootballActionType.PASS]).toBe('pass');
    expect(actionTypeName[FootballActionType.TACKLE]).toBe('tackle');
    expect(actionTypeName[FootballActionType.CARRY]).toBe('carry');
    expect(actionTypeName[FootballActionType.INTERCEPTION]).toBe('interception');
  });
});

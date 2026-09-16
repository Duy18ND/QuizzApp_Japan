/// <reference types="jest" />
import { conjugateVerb } from '../conjugator';

describe('conjugator', () => {
  describe('Group 1 Verbs', () => {
    it('should conjugate passive correctly', () => {
      expect(conjugateVerb('かく', 'passive', 1)).toBe('かかれる');
      expect(conjugateVerb('のむ', 'passive', 1)).toBe('のまれる');
      expect(conjugateVerb('よむ', 'passive', 1)).toBe('よまれる');
      expect(conjugateVerb('はなす', 'passive', 1)).toBe('はなされる');
      expect(conjugateVerb('まつ', 'passive', 1)).toBe('またれる');
      expect(conjugateVerb('かう', 'passive', 1)).toBe('かわれる');
    });

    it('should conjugate te-form correctly', () => {
      expect(conjugateVerb('かく', 'te', 1)).toBe('かいて');
      expect(conjugateVerb('いく', 'te', 1)).toBe('いって'); // exception
      expect(conjugateVerb('およぐ', 'te', 1)).toBe('およいで');
      expect(conjugateVerb('のむ', 'te', 1)).toBe('のんで');
      expect(conjugateVerb('あそぶ', 'te', 1)).toBe('あそんで');
      expect(conjugateVerb('しぬ', 'te', 1)).toBe('しんで');
      expect(conjugateVerb('まつ', 'te', 1)).toBe('まって');
      expect(conjugateVerb('かう', 'te', 1)).toBe('かって');
      expect(conjugateVerb('はなす', 'te', 1)).toBe('はなして');
    });

    it('should conjugate nagara correctly', () => {
      expect(conjugateVerb('きく', 'nagara', 1)).toBe('ききながら');
      expect(conjugateVerb('のむ', 'nagara', 1)).toBe('のみながら');
      expect(conjugateVerb('かう', 'nagara', 1)).toBe('かいながら');
    });
  });

  describe('Group 2 Verbs', () => {
    it('should conjugate passive correctly', () => {
      expect(conjugateVerb('たべる', 'passive', 2)).toBe('たべられる');
      expect(conjugateVerb('みる', 'passive', 2)).toBe('みられる');
    });

    it('should conjugate te-form correctly', () => {
      expect(conjugateVerb('たべる', 'te', 2)).toBe('たべて');
      expect(conjugateVerb('みる', 'te', 2)).toBe('みて');
    });

    it('should conjugate nagara correctly', () => {
      expect(conjugateVerb('たべる', 'nagara', 2)).toBe('たべながら');
      expect(conjugateVerb('みる', 'nagara', 2)).toBe('みながら');
    });
  });

  describe('Group 3 Verbs', () => {
    it('should conjugate passive correctly', () => {
      expect(conjugateVerb('する', 'passive', 3)).toBe('される');
      expect(conjugateVerb('くる', 'passive', 3)).toBe('こられる');
      expect(conjugateVerb('べんきょうする', 'passive', 3)).toBe('べんきょうされる');
    });

    it('should conjugate te-form correctly', () => {
      expect(conjugateVerb('する', 'te', 3)).toBe('して');
      expect(conjugateVerb('くる', 'te', 3)).toBe('きて');
    });

    it('should conjugate nagara correctly', () => {
      expect(conjugateVerb('する', 'nagara', 3)).toBe('しながら');
      expect(conjugateVerb('くる', 'nagara', 3)).toBe('きながら');
      expect(conjugateVerb('べんきょうする', 'nagara', 3)).toBe('べんきょうしながら');
    });
  });
});

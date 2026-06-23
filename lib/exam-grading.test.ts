import { describe, expect, it } from 'vitest';
import {
  getLetterGrade,
  getResultLetterGrade,
  hasFailingSubject,
  isSubjectAbsent,
  normalizeExamGrade,
  subjectPercentage,
} from './exam-grading';

describe('exam-grading', () => {
  it('maps percentage to letter grades', () => {
    expect(getLetterGrade(80)).toBe('A');
    expect(getLetterGrade(70)).toBe('B');
    expect(getLetterGrade(55)).toBe('C');
    expect(getLetterGrade(40)).toBe('S');
    expect(getLetterGrade(20)).toBe('F');
  });

  it('forces F when any subject is below 35%', () => {
    const subjects = [{ obtainedMarks: 40, maxMarks: 100 }];
    expect(hasFailingSubject(subjects)).toBe(false);
    expect(getResultLetterGrade(80, subjects)).toBe('A');
    const failing = [{ obtainedMarks: 30, maxMarks: 100 }];
    expect(hasFailingSubject(failing)).toBe(true);
    expect(getResultLetterGrade(80, failing)).toBe('F');
  });

  it('treats absent subjects as failing', () => {
    expect(isSubjectAbsent({ grade: 'AB', obtainedMarks: 0, maxMarks: 100 })).toBe(true);
    expect(subjectPercentage({ grade: 'AB', obtainedMarks: 0, maxMarks: 100 })).toBe(0);
  });

  it('normalizes legacy W to F', () => {
    expect(normalizeExamGrade('w')).toBe('F');
    expect(normalizeExamGrade('AB')).toBe('AB');
  });
});

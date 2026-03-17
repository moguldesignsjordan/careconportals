// src/utils/progressCalculator.ts
// Phase-weighted, milestone-driven progress calculation engine
// Replaces hardcoded progress jumps with realistic, smooth progression

import { Project, Milestone, ProjectStatus, PhaseId } from '../types';

/**
 * Phase weight configuration.
 * Each phase contributes a weighted percentage toward overall progress.
 * Weights MUST sum to 100.
 * 
 * Adjust these to reflect real construction workload distribution:
 * - Planning is typically light but critical (10%)
 * - Demolition is fast but distinct (15%)
 * - Rough-in is the heaviest labor phase (35%)
 * - Finishing is detail-heavy and time-consuming (30%)
 * - Punch list / completion is final QA (10%)
 */
export interface PhaseConfig {
  id: PhaseId;
  label: string;
  weight: number;
  statusMatch: ProjectStatus;  // Maps phase to ProjectStatus enum
}

export const DEFAULT_PHASE_WEIGHTS: PhaseConfig[] = [
  { id: 'planning',   label: 'Planning',    weight: 10, statusMatch: ProjectStatus.PLANNING },
  { id: 'demolition', label: 'Demolition',  weight: 15, statusMatch: ProjectStatus.DEMOLITION },
  { id: 'rough-in',   label: 'Rough-In',    weight: 35, statusMatch: ProjectStatus.ROUGH_IN },
  { id: 'finishing',  label: 'Finishing',    weight: 30, statusMatch: ProjectStatus.FINISHING },
  { id: 'completed',  label: 'Punch List',  weight: 10, statusMatch: ProjectStatus.COMPLETED },
];

export interface PhaseStats {
  id: PhaseId;
  label: string;
  weight: number;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  phaseCompletion: number;       // 0-100 for this phase
  weightedContribution: number;  // Actual % contributed to overall
}

export interface ProgressResult {
  phaseStats: PhaseStats[];
  overallProgress: number;       // 0-100 overall
  currentPhase: PhaseConfig | null;
}

/**
 * Calculate project progress from milestones using weighted phases.
 * 
 * How it works:
 *   1. Group milestones by phase
 *   2. Calculate completion % per phase (in-progress milestones count as 50%)
 *   3. Multiply each phase's completion by its weight
 *   4. Sum weighted contributions for overall progress
 * 
 * Example:
 *   Planning (10% weight) → 100% done → contributes 10%
 *   Demolition (15% weight) → 66% done → contributes ~10%
 *   Rough-In (35% weight) → 20% done → contributes 7%
 *   Finishing (30% weight) → 0% done → contributes 0%
 *   Punch List (10% weight) → 0% done → contributes 0%
 *   Overall = 10 + 10 + 7 + 0 + 0 = 27%
 */
export function calculateProjectProgress(
  milestones: Milestone[],
  phaseWeights: PhaseConfig[] = DEFAULT_PHASE_WEIGHTS
): ProgressResult {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];

  const phaseStats: PhaseStats[] = phaseWeights.map((phase) => {
    const phaseMilestones = safeMilestones.filter((m) => m.phaseId === phase.id);
    const total = phaseMilestones.length;
    const completed = phaseMilestones.filter((m) => m.status === 'completed').length;
    const inProgress = phaseMilestones.filter((m) => m.status === 'in-progress').length;
    const pending = total - completed - inProgress;

    // In-progress milestones count as 50% for smoother progression
    const phaseCompletion = total > 0
      ? Math.round(((completed + inProgress * 0.5) / total) * 100)
      : 0;

    const weightedContribution = (phaseCompletion / 100) * phase.weight;

    return {
      id: phase.id,
      label: phase.label,
      weight: phase.weight,
      total,
      completed,
      inProgress,
      pending,
      phaseCompletion,
      weightedContribution,
    };
  });

  const overallProgress = Math.round(
    phaseStats.reduce((sum, p) => sum + p.weightedContribution, 0)
  );

  // Current phase = first phase not at 100%
  const currentPhaseIndex = phaseStats.findIndex((p) => p.phaseCompletion < 100);
  const currentPhase = currentPhaseIndex >= 0 ? phaseWeights[currentPhaseIndex] : null;

  return { phaseStats, overallProgress, currentPhase };
}

/**
 * Derive the appropriate ProjectStatus from milestone-based progress.
 * This replaces the manual status button approach — status follows from
 * actual milestone completion rather than being set independently.
 */
export function deriveProjectStatus(
  milestones: Milestone[],
  phaseWeights: PhaseConfig[] = DEFAULT_PHASE_WEIGHTS
): ProjectStatus {
  const { phaseStats } = calculateProjectProgress(milestones, phaseWeights);

  // Walk backwards from last phase to find the highest phase with any progress
  for (let i = phaseStats.length - 1; i >= 0; i--) {
    if (phaseStats[i].phaseCompletion > 0) {
      if (phaseStats[i].phaseCompletion === 100 && i === phaseStats.length - 1) {
        return ProjectStatus.COMPLETED;
      }
      return phaseWeights[i].statusMatch;
    }
  }

  return ProjectStatus.PLANNING;
}

/**
 * Get a smart progress value when a quick-status button is pressed.
 * Instead of hardcoded jumps, this calculates a minimum progress floor
 * based on which phase the user is entering, then takes the max of
 * that floor and the milestone-driven progress.
 */
export function getSmartProgress(
  targetStatus: ProjectStatus,
  currentMilestoneProgress: number,
  phaseWeights: PhaseConfig[] = DEFAULT_PHASE_WEIGHTS
): number {
  if (targetStatus === ProjectStatus.COMPLETED) return 100;
  if (targetStatus === ProjectStatus.ON_HOLD) return currentMilestoneProgress;

  // Calculate the minimum progress floor for entering this phase
  // (all previous phases would need to be 100% complete)
  const phaseIndex = phaseWeights.findIndex((p) => p.statusMatch === targetStatus);
  if (phaseIndex < 0) return currentMilestoneProgress;

  const floorProgress = phaseWeights
    .slice(0, phaseIndex)
    .reduce((sum, p) => sum + p.weight, 0);

  return Math.max(currentMilestoneProgress, floorProgress);
}
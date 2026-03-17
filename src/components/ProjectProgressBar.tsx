// src/components/ProjectProgressBar.tsx
// Phase-weighted progress bar with visual stepper
// Drop-in replacement for the hardcoded progress section in ProjectDetails

import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Hammer,
  Zap,
  Paintbrush,
  CheckCircle2,
  Circle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Project, Milestone, PhaseId } from '../types';
import {
  calculateProjectProgress,
  PhaseStats,
  DEFAULT_PHASE_WEIGHTS,
} from '../utils/progressCalculator';

// Phase icon mapping
const PHASE_ICONS: Record<PhaseId, React.ElementType> = {
  planning: ClipboardList,
  demolition: Hammer,
  'rough-in': Zap,
  finishing: Paintbrush,
  completed: CheckCircle2,
};

interface ProjectProgressBarProps {
  project: Project;
  milestones: Milestone[];
  /** When true, show the expandable breakdown panel */
  showBreakdown?: boolean;
  /** Compact mode for cards (no breakdown, smaller) */
  compact?: boolean;
}

// ── Animated counter ────────────────────────────────────────────────
const AnimatedPercent: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = display;
    const startTime = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <>{display}</>;
};

// ── Phase Stepper Node ──────────────────────────────────────────────
const PhaseNode: React.FC<{
  phase: PhaseStats;
  isActive: boolean;
  isLast: boolean;
  compact: boolean;
  onClick?: () => void;
}> = ({ phase, isActive, isLast, compact, onClick }) => {
  const isDone = phase.phaseCompletion === 100;
  const hasProgress = phase.phaseCompletion > 0;
  const Icon = PHASE_ICONS[phase.id as PhaseId] || Circle;
  const size = compact ? 28 : 34;
  const iconSize = compact ? 13 : 16;

  return (
    <div
      className="flex flex-col items-center relative flex-1 cursor-pointer group"
      onClick={onClick}
    >
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute top-1/2 left-1/2 right-0 h-[3px] bg-gray-100 -translate-y-1/2"
          style={{ width: 'calc(100%)', zIndex: 0, top: size / 2 }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: isDone ? '100%' : hasProgress ? `${phase.phaseCompletion}%` : '0%',
              background: isDone ? '#059669' : '#F15A2B',
            }}
          />
        </div>
      )}

      {/* Node circle */}
      <div
        className={`relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 group-hover:scale-110
          ${isDone
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : isActive
              ? 'bg-care-orange border-care-orange text-white shadow-lg shadow-care-orange/20'
              : hasProgress
                ? 'bg-care-orange/10 border-care-orange text-care-orange'
                : 'bg-white border-gray-200 text-gray-300'
          }
        `}
        style={{ width: size, height: size }}
      >
        {isDone ? (
          <CheckCircle2 size={iconSize} />
        ) : (
          <Icon size={iconSize} />
        )}
      </div>

      {/* Label */}
      {!compact && (
        <>
          <span
            className={`mt-1.5 text-[10px] font-bold text-center leading-tight transition-colors
              ${isActive ? 'text-care-orange' : isDone ? 'text-emerald-600' : 'text-gray-400'}
            `}
          >
            {phase.label}
          </span>
          <span
            className={`text-[9px] font-bold
              ${isDone ? 'text-emerald-500' : hasProgress ? 'text-care-orange' : 'text-gray-300'}
            `}
          >
            {phase.completed}/{phase.total}
          </span>
        </>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────
const ProjectProgressBar: React.FC<ProjectProgressBarProps> = ({
  project,
  milestones,
  showBreakdown = true,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activePhase, setActivePhase] = useState<PhaseId | null>(null);

  const { phaseStats, overallProgress, currentPhase } = calculateProjectProgress(
    milestones,
    DEFAULT_PHASE_WEIGHTS
  );

  // Auto-select current active phase
  useEffect(() => {
    if (currentPhase && !activePhase) {
      setActivePhase(currentPhase.id);
    }
  }, [currentPhase, activePhase]);

  // ── Compact mode (for project cards) ────────────────────────────
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Mini stepper */}
        <div className="flex items-center gap-0 px-1">
          {phaseStats.map((phase, i) => (
            <PhaseNode
              key={phase.id}
              phase={phase}
              isActive={currentPhase?.id === phase.id}
              isLast={i === phaseStats.length - 1}
              compact
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, overallProgress)}%`,
                background: overallProgress >= 95
                  ? 'linear-gradient(90deg, #059669, #10b981)'
                  : 'linear-gradient(90deg, #F15A2B, #ff8a65)',
              }}
            />
          </div>
          <span className="text-[11px] font-black text-gray-600 tabular-nums w-8 text-right">
            {overallProgress}%
          </span>
        </div>
      </div>
    );
  }

  // ── Full mode (for ProjectDetails) ──────────────────────────────
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-[0.18em] font-bold">
              Progress
            </p>
            {currentPhase && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Currently in{' '}
                <span className="text-care-orange font-bold">{currentPhase.label}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#111827] tabular-nums">
              <AnimatedPercent value={overallProgress} />
              <span className="text-sm text-gray-300 ml-0.5">%</span>
            </p>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
          {/* Phase segment dividers */}
          {(() => {
            let cumulative = 0;
            return phaseStats.map((p, i) => {
              cumulative += p.weight;
              if (i === phaseStats.length - 1) return null;
              return (
                <div
                  key={p.id}
                  className="absolute top-0 h-full w-px bg-white/80 z-10"
                  style={{ left: `${cumulative}%` }}
                />
              );
            });
          })()}

          {/* Animated fill */}
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, overallProgress)}%`,
              background: overallProgress >= 95
                ? 'linear-gradient(90deg, #059669, #10b981)'
                : 'linear-gradient(90deg, #F15A2B, #ff8a65)',
              boxShadow: overallProgress > 0 && overallProgress < 100
                ? '0 0 8px rgba(241,90,43,0.3)'
                : 'none',
            }}
          />
        </div>

        {/* Phase weight labels */}
        <div className="flex mt-1">
          {phaseStats.map((p) => (
            <div
              key={p.id}
              className="text-center"
              style={{ flex: p.weight }}
            >
              <span className={`text-[8px] font-semibold ${p.phaseCompletion === 100 ? 'text-emerald-400' : 'text-gray-300'
                }`}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
        <div className="flex items-start gap-0">
          {phaseStats.map((phase, i) => (
            <PhaseNode
              key={phase.id}
              phase={phase}
              isActive={activePhase === phase.id}
              isLast={i === phaseStats.length - 1}
              compact={false}
              onClick={() => setActivePhase(phase.id as PhaseId)}
            />
          ))}
        </div>
      </div>

      {/* Expandable breakdown */}
      {showBreakdown && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em]">
              <Info size={12} />
              Progress Breakdown
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {phaseStats.map((p) => {
                const PhaseIcon = PHASE_ICONS[p.id as PhaseId] || Circle;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${activePhase === p.id
                      ? 'bg-care-orange/5 border border-care-orange/10'
                      : 'hover:bg-gray-50'
                      }`}
                    onClick={() => setActivePhase(p.id as PhaseId)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.phaseCompletion === 100
                      ? 'bg-emerald-100 text-emerald-600'
                      : p.phaseCompletion > 0
                        ? 'bg-care-orange/10 text-care-orange'
                        : 'bg-gray-100 text-gray-400'
                      }`}>
                      <PhaseIcon size={14} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{p.label}</span>
                        <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                          {p.completed}/{p.total} done
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${p.phaseCompletion}%`,
                            background: p.phaseCompletion === 100 ? '#059669' : '#F15A2B',
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 w-16">
                      <span className="text-xs font-black tabular-nums text-gray-600">
                        {p.phaseCompletion}%
                      </span>
                      <p className="text-[9px] text-gray-400 font-semibold">
                        ×{p.weight}w = +{Math.round(p.weightedContribution)}%
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100 px-3">
                <span className="text-xs font-black text-gray-700">
                  Overall Progress
                </span>
                <span className="text-sm font-black text-care-orange tabular-nums">
                  {overallProgress}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectProgressBar;
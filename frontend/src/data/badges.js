// data/badges.js
// Independent badge criteria, descriptions, icons, rarity tiers, and one-time XP rewards.
// Badges reflect cumulative milestones, streaks, and long-term wellness accomplishments.

import {
  Footprints,
  Droplets,
  Flame,
  Crown,
  Heart,
  Moon,
  Sparkles,
  Trophy,
  Zap,
  Gem,
  Award,
  Compass,
} from 'lucide-react'

export const BADGE_DEFINITIONS = [
  // ── Common Badges ──────────────────────────────────────────────────────────
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete your first wellness activity or workout.',
    rarity: 'Common',
    reward: 50,
    icon: Footprints,
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
    goal: 1,
    unit: 'activity',
    evaluate: (stats) => {
      const progress = Math.min(1, stats.lifetimeActivitiesCount)
      return { progress, goal: 1, isUnlocked: progress >= 1 }
    },
  },
  {
    id: 'night-owl-rest',
    title: 'Restful Start',
    description: 'Record your sleep for the first time.',
    rarity: 'Common',
    reward: 50,
    icon: Moon,
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
    goal: 1,
    unit: 'night',
    evaluate: (stats) => {
      const progress = Math.min(1, stats.daysWithSleepCount)
      return { progress, goal: 1, isUnlocked: progress >= 1 }
    },
  },
  {
    id: 'hydro-starter',
    title: 'Hydration Starter',
    description: 'Log at least 1,000 ml of water in a single day.',
    rarity: 'Common',
    reward: 50,
    icon: Droplets,
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#6B5B95]',
    goal: 1000,
    unit: 'ml',
    evaluate: (stats) => {
      const progress = Math.min(1000, stats.todayWater)
      return { progress, goal: 1000, isUnlocked: progress >= 1000 }
    },
  },

  // ── Rare Badges ────────────────────────────────────────────────────────────
  {
    id: 'hydration-hero-badge',
    title: 'Hydration Enthusiast',
    description: 'Log 2,000+ ml of water on 3 different days.',
    rarity: 'Rare',
    reward: 100,
    icon: Droplets,
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#6B5B95]',
    goal: 3,
    unit: 'days',
    evaluate: (stats) => {
      const progress = Math.min(3, stats.daysWithWaterAbove2L)
      return { progress, goal: 3, isUnlocked: progress >= 3 }
    },
  },
  {
    id: 'consistency-3',
    title: '3-Day Momentum',
    description: 'Stay active and log your wellness for 3 consecutive days.',
    rarity: 'Rare',
    reward: 100,
    icon: Sparkles,
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
    goal: 3,
    unit: 'days',
    evaluate: (stats) => {
      const progress = Math.min(3, stats.currentStreak)
      return { progress, goal: 3, isUnlocked: progress >= 3 }
    },
  },
  {
    id: 'workout-warrior',
    title: 'Workout Warrior',
    description: 'Log 5 total exercise or workout sessions.',
    rarity: 'Rare',
    reward: 120,
    icon: Zap,
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
    goal: 5,
    unit: 'workouts',
    evaluate: (stats) => {
      const progress = Math.min(5, stats.lifetimeActivitiesCount)
      return { progress, goal: 5, isUnlocked: progress >= 5 }
    },
  },
  {
    id: 'restful-nights',
    title: 'Sleep Master',
    description: 'Log 7+ hours of quality sleep on 3 different days.',
    rarity: 'Rare',
    reward: 120,
    icon: Moon,
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#6B5B95]',
    goal: 3,
    unit: 'nights',
    evaluate: (stats) => {
      const progress = Math.min(3, stats.daysWithSleepAbove7h)
      return { progress, goal: 3, isUnlocked: progress >= 3 }
    },
  },

  // ── Epic Badges ────────────────────────────────────────────────────────────
  {
    id: '7-day-streak',
    title: '7 Day Streak',
    description: 'Stay consistent with your health journey for seven days.',
    rarity: 'Epic',
    reward: 200,
    icon: Flame,
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
    goal: 7,
    unit: 'days',
    evaluate: (stats) => {
      const progress = Math.min(7, stats.currentStreak)
      return { progress, goal: 7, isUnlocked: progress >= 7 }
    },
  },
  {
    id: 'century-walker',
    title: '10k Walker',
    description: 'Accumulate 10,000 total lifetime walking steps.',
    rarity: 'Epic',
    reward: 200,
    icon: Compass,
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
    goal: 10000,
    unit: 'steps',
    evaluate: (stats) => {
      const progress = Math.min(10000, stats.lifetimeSteps)
      return { progress, goal: 10000, isUnlocked: progress >= 10000 }
    },
  },
  {
    id: 'active-century',
    title: 'Active Century',
    description: 'Log 100 total minutes of physical exercise.',
    rarity: 'Epic',
    reward: 250,
    icon: Heart,
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
    goal: 100,
    unit: 'min',
    evaluate: (stats) => {
      const progress = Math.min(100, stats.lifetimeActiveMinutes)
      return { progress, goal: 100, isUnlocked: progress >= 100 }
    },
  },

  // ── Legendary Badges ───────────────────────────────────────────────────────
  {
    id: 'wellness-champion',
    title: 'Wellness Champion',
    description: 'Complete 10 total daily challenge missions.',
    rarity: 'Legendary',
    reward: 500,
    icon: Crown,
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
    goal: 10,
    unit: 'missions',
    evaluate: (stats) => {
      const progress = Math.min(10, stats.totalCompletedMissions)
      return { progress, goal: 10, isUnlocked: progress >= 10 }
    },
  },
  {
    id: 'fitkey-legend',
    title: 'FitKey Legend',
    description: 'Earn 1,000 lifetime XP through wellness and challenges.',
    rarity: 'Legendary',
    reward: 750,
    icon: Gem,
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
    goal: 1000,
    unit: 'XP',
    evaluate: (stats) => {
      const progress = Math.min(1000, stats.lifetimeXP)
      return { progress, goal: 1000, isUnlocked: progress >= 1000 }
    },
  },
]

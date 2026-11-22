// data/challenges.js
// Challenge templates, targets, qualifying metrics, and XP rewards.

import { Droplets, Footprints, Moon, Zap } from 'lucide-react'

export const DAILY_BONUS_XP = 50

export const CHALLENGE_TEMPLATES = [
  {
    id: 'hydration-hero',
    title: 'Hydration Hero',
    description: 'Complete your daily water goal.',
    reward: 50,
    icon: Droplets,
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#6B5B95]',
    metric: 'water',
    getTarget: (goals) => goals.waterMl || 2500,
    getCurrentValue: (health) => health.waterTotal,
    formatDetail: (current, target) =>
      `${(current / 1000).toFixed(1)} / ${(target / 1000).toFixed(1)} L`,
  },
  {
    id: 'step-master',
    title: 'Step Master',
    description: 'Reach your daily step goal.',
    reward: 75,
    icon: Footprints,
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
    metric: 'steps',
    getTarget: (goals) => goals.steps || 8000,
    getCurrentValue: (health) => health.stepsTotal,
    formatDetail: (current, target) =>
      `${current.toLocaleString()} / ${target.toLocaleString()} steps`,
  },
  {
    id: 'sleep-champion',
    title: 'Sleep Champion',
    description: 'Complete your daily sleep goal.',
    reward: 100,
    icon: Moon,
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
    metric: 'sleep',
    getTarget: (goals) => goals.sleepHours || 8,
    getCurrentValue: (health) => health.sleepHours,
    formatDetail: (current, target) =>
      `${current} / ${target} hrs`,
  },
  {
    id: 'active-mover',
    title: 'Active Mover',
    description: 'Hit your daily active workout minutes.',
    reward: 60,
    icon: Zap,
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
    metric: 'activeMinutes',
    getTarget: (goals) => goals.activeMinutes || 30,
    getCurrentValue: (health) => health.activeMinutes,
    formatDetail: (current, target) =>
      `${current} / ${target} min`,
  },
]

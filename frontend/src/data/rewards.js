// data/rewards.js
// Reward store items, descriptions, categories, and XP redemption costs.

import { Ticket, Gift, Gem, Award, ShieldCheck } from 'lucide-react'

export const REWARD_ITEMS = [
  {
    id: 'fitness-voucher',
    title: 'Fitness Store Voucher',
    description: 'Save 20% on selected premium fitness products and gear.',
    points: 500,
    icon: Ticket,
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
    category: 'Shopping',
  },
  {
    id: 'wellness-starter-kit',
    title: 'Wellness Starter Kit',
    description: 'A curated collection of mindfulness and recovery essentials.',
    points: 800,
    icon: Gift,
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#6B5B95]',
    category: 'Exclusive',
  },
  {
    id: 'fitkey-elite-badge',
    title: 'FitKey Elite Badge',
    description: 'Exclusive gold digital showcase badge for your member profile.',
    points: 300,
    icon: Gem,
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
    category: 'Digital',
  },
  {
    id: 'nutrition-guide-pass',
    title: 'Nutrition Masterclass Pass',
    description: 'Unlock expert dietary guides, meal plans and recipe books.',
    points: 650,
    icon: Award,
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
    category: 'Health',
  },
]

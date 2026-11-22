// professionalRewards.js
// Catalog of professional development benefits, course vouchers, and practice rewards.

import {
  GraduationCap,
  BookOpen,
  Sparkles,
  Gift,
  Ticket,
  Award,
} from 'lucide-react'

export const PROFESSIONAL_REWARDS = [
  {
    id: 'cme-clinical-cardiology',
    title: 'Accredited CME Clinical Cardiology Course',
    description: 'Full enrollment access to a 12-module certified continuing medical education course with accreditation certificate.',
    points: 500,
    category: 'Learning & CME',
    icon: GraduationCap,
    badge: 'Certified CME',
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#324C4D]',
  },
  {
    id: 'medical-journal-access',
    title: 'Medical Journal 6-Month Digital Subscription',
    description: 'Unrestricted digital access to leading peer-reviewed clinical medicine and preventive wellness journals.',
    points: 350,
    category: 'Professional Benefits',
    icon: BookOpen,
    badge: 'Research Access',
    color: 'bg-[#DCD6F7]',
    iconColor: 'text-[#625780]',
  },
  {
    id: 'featured-practice-spotlight',
    title: 'Featured Practice Spotlight on Directory',
    description: 'Highlight your verified clinical profile at the top of regional patient wellness search results for 3 months.',
    points: 450,
    category: 'FitKey Practice Benefits',
    icon: Sparkles,
    badge: 'High Visibility',
    color: 'bg-[#F8E7A5]',
    iconColor: 'text-[#8B6D25]',
  },
  {
    id: 'clinical-ergonomic-voucher',
    title: 'Clinic Ergonomics Equipment Voucher',
    description: 'Voucher redeemable for certified ergonomic clinic furnishings, postural supports, and diagnostic tools.',
    points: 400,
    category: 'Wellness Product Vouchers',
    icon: Gift,
    badge: 'Clinic Upgrade',
    color: 'bg-[#FFD9C7]',
    iconColor: 'text-[#A45E45]',
  },
  {
    id: 'integrative-summit-pass',
    title: 'National Integrative Health Summit Pass',
    description: '50% discount voucher for entry to the annual FitKey Integrative Medicine & Healthcare Leadership Convention.',
    points: 650,
    category: 'Conference & Workshops',
    icon: Ticket,
    badge: 'Annual Convention',
    color: 'bg-[#C4D7D4]',
    iconColor: 'text-[#033135]',
  },
  {
    id: 'metabolic-nutrition-masterclass',
    title: 'Metabolic Nutrition Clinical Masterclass',
    description: 'Specialist clinical training on evidence-based dietary interventions for insulin sensitivity and metabolic health.',
    points: 300,
    category: 'Learning & CME',
    icon: Award,
    badge: 'Masterclass',
    color: 'bg-[#E4F0EA]',
    iconColor: 'text-[#2F7B58]',
  },
]

export default PROFESSIONAL_REWARDS

'use client';

import dynamic from 'next/dynamic';

const LearningLab = dynamic(
  () => import('@/components/learning/LearningLab').then((mod) => ({ default: mod.LearningLab })),
  { ssr: false }
);

export default function LearningPage() {
  return <LearningLab />;
}

'use client';

import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';

export default function Home() {
  const router = useRouter();

  const handleEnter = () => {
    router.push('/intelligence');
  };

  return <LandingPage onEnter={handleEnter} />;
}

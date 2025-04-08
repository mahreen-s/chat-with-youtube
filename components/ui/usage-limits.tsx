import React from 'react';
import { Card } from '@/components/ui/card';
import { Video, Search, MessageSquare } from 'lucide-react';

interface UsageLimitsProps {
  videoRemaining?: number;
  searchRemaining?: number;
  chatRemaining?: number;
}

export function UsageLimits({ 
  videoRemaining = 0, 
  searchRemaining = 0, 
  chatRemaining = 0 
}: UsageLimitsProps) {
  // Don't render the component at all - removing limits from UI
  return null;
}
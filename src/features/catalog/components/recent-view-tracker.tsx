'use client';

import {useEffect} from 'react';

import {recordRecentView} from '../server/actions';

export function RecentViewTracker({productId, slug}: {productId: string; slug: string}) {
  useEffect(() => {
    const key = 'nexora-recent-products';
    const current = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
    const values = Array.isArray(current)
      ? current.filter((item): item is string => typeof item === 'string')
      : [];
    window.localStorage.setItem(
      key,
      JSON.stringify([slug, ...values.filter((item) => item !== slug)].slice(0, 12))
    );
    void recordRecentView({productId});
  }, [productId, slug]);
  return null;
}

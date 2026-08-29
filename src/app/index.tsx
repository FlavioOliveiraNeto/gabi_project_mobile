import { Redirect } from 'expo-router';

import { homeRoute, useAuth } from '@/lib/auth';

export default function Index() {
  const { user } = useAuth();
  return <Redirect href={homeRoute(user)} />;
}

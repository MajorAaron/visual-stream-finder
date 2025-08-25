import { useEffect, useState } from 'react';
import { Database, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DevIndicator() {
  const [supabaseEnv, setSupabaseEnv] = useState<'local' | 'production' | 'unknown'>('unknown');
  
  useEffect(() => {
    // Check the Supabase URL to determine environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mrkcgfsbdcukufgwvjap.supabase.co";
    
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      setSupabaseEnv('local');
    } else if (supabaseUrl.includes('supabase.co')) {
      setSupabaseEnv('production');
    } else {
      setSupabaseEnv('unknown');
    }
  }, []);

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 group">
      <div className={cn(
        "relative p-2 rounded-full shadow-md",
        "bg-background/95 backdrop-blur-sm border",
        supabaseEnv === 'local' && "border-green-500",
        supabaseEnv === 'production' && "border-orange-500",
        supabaseEnv === 'unknown' && "border-gray-500"
      )}>
        <div className="relative">
          {supabaseEnv === 'local' ? (
            <Database className={cn(
              "h-4 w-4",
              "text-green-600 dark:text-green-400"
            )} />
          ) : (
            <Server className={cn(
              "h-4 w-4",
              supabaseEnv === 'production' && "text-orange-600 dark:text-orange-400",
              supabaseEnv === 'unknown' && "text-gray-600 dark:text-gray-400"
            )} />
          )}
          <div className={cn(
            "absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse",
            supabaseEnv === 'local' && "bg-green-500",
            supabaseEnv === 'production' && "bg-orange-500",
            supabaseEnv === 'unknown' && "bg-gray-500"
          )} />
        </div>
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute top-full left-0 mt-2 p-2 rounded-lg bg-background/95 backdrop-blur-sm border text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        <p className="font-medium">
          Supabase: {supabaseEnv === 'local' ? 'Local' : supabaseEnv === 'production' ? 'Production' : 'Unknown'}
        </p>
        <p className="text-muted-foreground mt-1">
          {supabaseEnv === 'local' 
            ? "Connected to local instance"
            : supabaseEnv === 'production'
            ? "⚠️ Connected to PRODUCTION"
            : "Unable to determine environment"}
        </p>
      </div>
    </div>
  );
}
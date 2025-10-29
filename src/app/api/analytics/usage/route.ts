import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/analytics/usage
 * Fetches usage statistics for the admin dashboard
 * Requires admin role
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Verify authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Calculate date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Fetch analytics data from your database
        // Note: You'll need to create an analytics table to store page view events
        // For now, returning mock data that matches the expected structure

        // In production, you would query something like:
        // const { data: oncallViews } = await supabase
        //   .from('analytics_events')
        //   .select('*')
        //   .eq('page', 'oncall')
        //   .gte('created_at', sevenDaysAgo.toISOString());

        const stats = {
            oncall: {
                total: 0, // Will be populated from Vercel Analytics or your tracking table
                uniqueUsers: 0,
                avgSessionTime: 0,
            },
            directory: {
                total: 0, // Will be populated from Vercel Analytics or your tracking table
                uniqueUsers: 0,
                avgSessionTime: 0,
            },
            schedule: {
                total: 0,
                uniqueUsers: 0,
            },
            uniqueUsers: 0, // Total unique users across all pages
            topSpecialties: [], // Most viewed specialties
            topSearchTerms: [], // Most searched terms in directory
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

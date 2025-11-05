import { ROUTES } from "@/lib/routes";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

type TimeRange = '60m' | '24h' | '7d' | 'custom';

/**
 * GET /api/analytics/usage
 * Fetches usage statistics from Vercel Analytics
 * Requires admin role
 * Query params: ?range=60m|24h|7d&startDate=ISO&endDate=ISO
 */
export async function GET(request: Request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') as TimeRange || '7d';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Calculate time range
        const now = new Date();
        let since: number;
        let until: number = now.getTime();

        if (range === 'custom' && startDate && endDate) {
            since = new Date(startDate).getTime();
            until = new Date(endDate).getTime();
        } else {
            switch (range) {
                case '60m':
                    since = now.getTime() - (60 * 60 * 1000); // 60 minutes
                    break;
                case '24h':
                    since = now.getTime() - (24 * 60 * 60 * 1000); // 24 hours
                    break;
                case '7d':
                default:
                    since = now.getTime() - (7 * 24 * 60 * 60 * 1000); // 7 days
                    break;
            }
        }

        const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
        const projectId = process.env.VERCEL_PROJECT_ID;
        const teamId = process.env.VERCEL_TEAM_ID;

        if (!vercelToken || !projectId) {
            console.warn('Missing Vercel configuration - returning empty stats');
            return NextResponse.json(getEmptyStats(range, since, until));
        }

        const baseUrl = 'https://vercel.com/api/web/insights';
        const teamParam = teamId ? `&teamId=${teamId}` : '';

        // Fetch time series data for charts
        const timeSeriesUrl = `${baseUrl}/stats/time-series?projectId=${projectId}&path=/oncall&path=/directory&path=/schedule&since=${since}&until=${until}&interval=hour${teamParam}`;

        const timeSeriesResponse = await fetch(timeSeriesUrl, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
            },
        });

        let timeSeriesData = { timeSeries: [] };
        if (timeSeriesResponse.ok) {
            timeSeriesData = await timeSeriesResponse.json();
        }

        // Fetch page stats
        const pageViewsUrl = `${baseUrl}/stats/path?projectId=${projectId}&path=${ROUTES.ONCALL}&path=${ROUTES.DIRECTORY}&path=${ROUTES.SCHEDULE}&since=${since}&until=${until}${teamParam}`;

        const pageViewsResponse = await fetch(pageViewsUrl, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
            },
        });

        const pageViewsData = pageViewsResponse.ok ? await pageViewsResponse.json() : { data: [] };

        // Fetch unique visitors
        const visitorsUrl = `${baseUrl}/stats/unique-visitors?projectId=${projectId}&since=${since}&until=${until}${teamParam}`;

        const visitorsResponse = await fetch(visitorsUrl, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
            },
        });

        const visitorsData = visitorsResponse.ok ? await visitorsResponse.json() : { uniqueVisitors: 0 };

        // Process time series data for charts
        const chartData = processTimeSeriesData(timeSeriesData.timeSeries, range);

        // Process page stats
        const oncallData = pageViewsData.data?.find((d: any) => d.path === ROUTES.ONCALL) || {};
        const directoryData = pageViewsData.data?.find((d: any) => d.path === ROUTES.DIRECTORY) || {};
        const scheduleData = pageViewsData.data?.find((d: any) => d.path === ROUTES.SCHEDULE) || {};

        const stats = {
            timeRange: {
                range,
                since: new Date(since).toISOString(),
                until: new Date(until).toISOString(),
            },
            oncall: {
                total: oncallData.pageviews || 0,
                uniqueUsers: oncallData.visitors || 0,
                avgSessionTime: oncallData.avgDuration || 0,
            },
            directory: {
                total: directoryData.pageviews || 0,
                uniqueUsers: directoryData.visitors || 0,
                avgSessionTime: directoryData.avgDuration || 0,
            },
            schedule: {
                total: scheduleData.pageviews || 0,
                uniqueUsers: scheduleData.visitors || 0,
                avgSessionTime: scheduleData.avgDuration || 0,
            },
            uniqueUsers: visitorsData.uniqueVisitors || 0,
            totalPageViews: (oncallData.pageviews || 0) + (directoryData.pageviews || 0) + (scheduleData.pageviews || 0),
            chartData, // Time series data for charts
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to fetch analytics',
                stats: getEmptyStats('7d', Date.now() - (7 * 24 * 60 * 60 * 1000), Date.now())
            },
            { status: 500 }
        );
    }
}

function processTimeSeriesData(timeSeries: any[], range: TimeRange) {
    if (!timeSeries || timeSeries.length === 0) {
        return [];
    }

    // Group by timestamp and aggregate by page
    const grouped: Record<string, any> = {};

    timeSeries.forEach((point: any) => {
        const timestamp = point.timestamp || point.time;
        if (!grouped[timestamp]) {
            grouped[timestamp] = {
                timestamp,
                oncall: 0,
                directory: 0,
                schedule: 0,
                total: 0,
            };
        }

        const path = point.path;
        const views = point.pageviews || point.count || 0;

        if (path === ROUTES.ONCALL) {
            grouped[timestamp].oncall += views;
        } else if (path === ROUTES.DIRECTORY) {
            grouped[timestamp].directory += views;
        } else if (path === ROUTES.SCHEDULE) {
            grouped[timestamp].schedule += views;
        }
        grouped[timestamp].total += views;
    });

    // Convert to array and sort by timestamp
    const result = Object.values(grouped).sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Format timestamps based on range
    return result.map((point: any) => ({
        ...point,
        time: formatTimestamp(point.timestamp, range),
        fullTimestamp: point.timestamp,
    }));
}

function formatTimestamp(timestamp: string, range: TimeRange): string {
    const date = new Date(timestamp);

    switch (range) {
        case '60m':
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        case '24h':
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        case '7d':
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'custom':
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        default:
            return date.toLocaleString();
    }
}

function getEmptyStats(range: TimeRange, since: number, until: number) {
    return {
        timeRange: {
            range,
            since: new Date(since).toISOString(),
            until: new Date(until).toISOString(),
        },
        oncall: { total: 0, uniqueUsers: 0, avgSessionTime: 0 },
        directory: { total: 0, uniqueUsers: 0, avgSessionTime: 0 },
        schedule: { total: 0, uniqueUsers: 0, avgSessionTime: 0 },
        uniqueUsers: 0,
        totalPageViews: 0,
        chartData: [],
    };
}

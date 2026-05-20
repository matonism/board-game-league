import React, { useMemo } from 'react';
import './Analytics.css';
import { useQuery } from '@tanstack/react-query';
import Constants from './Constants';
import { getHistoricalData } from './callouts/CalloutFactory';
import { createHistoricalDataObject } from './DataFormatter';
import { computeLeagueAnalytics } from './analytics/leagueAnalyticsEngine';
import LeagueAnalyticsDashboard from './LeagueAnalyticsDashboard';
import loadingIcon from './images/loading-icon.gif';

const Analytics = () => {

    const historicalDataResponse = useQuery({
        queryKey: ['historicalData'],
        queryFn: () => getHistoricalData(Constants.SEASONS),
        staleTime: Infinity,
        keepPreviousData: true,
        retry: false
    });

    const { analyticsPayload, computeError } = useMemo(() => {
        if (!historicalDataResponse.isSuccess || historicalDataResponse.data?.code === 400) {
            return { analyticsPayload: null, computeError: null };
        }
        try {
            const hist = createHistoricalDataObject(historicalDataResponse.data);
            if (!hist.schedules || Object.keys(hist.schedules).length === 0) {
                return { analyticsPayload: null, computeError: null };
            }
            return {
                analyticsPayload: computeLeagueAnalytics(hist.schedules),
                computeError: null
            };
        } catch (e) {
            console.error(e);
            return { analyticsPayload: null, computeError: e };
        }
    }, [
        historicalDataResponse.isSuccess,
        historicalDataResponse.data
    ]);

    if (historicalDataResponse.isFetching) {
        return (
            <div className="loading-icon-container analytics-loading">
                <img src={loadingIcon} alt="loading" />
            </div>
        );
    }

    if (historicalDataResponse.isError) {
        return (
            <div className="analytics-panel analytics-message">
                Could not load schedule data for analytics. Try again later.
            </div>
        );
    }

    if (computeError) {
        return (
            <div className="analytics-panel analytics-message">
                Something went wrong building analytics. Check the console for details.
            </div>
        );
    }

    if (!analyticsPayload || !analyticsPayload.leaderboards?.length) {
        return (
            <div className="analytics-panel analytics-message">
                Not enough schedule history to build analytics yet.
            </div>
        );
    }

    return (
        <div className="analytics-dashboard-shell">
            {/* <p className="analytics-footnote">
                Same calculations as the static dashboard; data updates whenever you load this tab.
            </p>
            <a
                className="analytics-legacy-link"
                href={Constants.LEAGUE_ANALYTICS_URL}
                target="_blank"
                rel="noopener noreferrer"
            >
                Open archived HTML dashboard
            </a> */}
            <LeagueAnalyticsDashboard data={analyticsPayload} />
        </div>
    );
};

export default Analytics;

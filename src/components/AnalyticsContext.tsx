"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface FetchOptions {
  force?: boolean;
}

interface AnalyticsContextValue {
  analyticsData: any | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fetchAnalytics: (options?: FetchOptions) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

const CACHE_TTL_MS = 30_000; // avoid hammering the analytics endpoint during polling

const safeParseJson = async (response: Response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastFetchRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const initialisedRef = useRef(false);

  const fetchAnalytics = useCallback(async (options?: FetchOptions) => {
    const force = options?.force ?? false;
    const now = Date.now();

    if (!force && analyticsData && now - lastFetchRef.current < CACHE_TTL_MS) {
      return;
    }

    if (inflightRef.current) {
      return inflightRef.current;
    }

    const request = (async () => {
      setLoading(true);
      setError(null);

      try {
        const [analyticsResponse, pipelineResponse, opportunityResponse] = await Promise.all([
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/pipeline/weighted", { cache: "no-store" }),
          fetch("/api/opportunity-scoring", { cache: "no-store" }),
        ]);

        const [analyticsPayload, pipelinePayload, opportunityPayload] = await Promise.all([
          safeParseJson(analyticsResponse),
          safeParseJson(pipelineResponse),
          safeParseJson(opportunityResponse),
        ]);

        const responsesAreOk =
          analyticsResponse.ok && pipelineResponse.ok && opportunityResponse.ok;

        if (!responsesAreOk) {
          const message =
            analyticsPayload?.error ||
            pipelinePayload?.error ||
            opportunityPayload?.error ||
            "Failed to fetch AI analytics data";
          setError(message);
          throw new Error(message);
        }

        const combinedData = {
          ...analyticsPayload,
          pipeline: Array.isArray(analyticsPayload?.pipeline)
            ? analyticsPayload?.pipeline
            : [],
          aiPipeline: pipelinePayload,
          aiOpportunities: opportunityPayload,
          aiInsights: {
            predictiveAccuracy:
              pipelinePayload?.metrics?.forecastAccuracy ??
              analyticsPayload?.aiInsights?.predictiveAccuracy ??
              0,
            totalAIScores: opportunityPayload?.opportunities?.length ?? 0,
            averageAIScore: opportunityPayload?.portfolioMetrics?.averageScore ?? 0,
            aiRecommendations: [
              ...(pipelinePayload?.recommendations ?? []),
              ...(analyticsPayload?.aiInsights?.aiRecommendations ?? []),
            ],
            statisticalInsights:
              analyticsPayload?.aiInsights?.statisticalInsights ?? [],
            anomalies: analyticsPayload?.aiInsights?.anomalies ?? {
              anomalies: [],
              insights: [],
            },
            churnAnalysis: analyticsPayload?.aiInsights?.churnAnalysis ?? {
              avgChurnRisk: 0,
              highRiskCount: 0,
            },
            revenueAnalysis: analyticsPayload?.aiInsights?.revenueAnalysis ?? {
              trend: "stable",
              confidence: 0.5,
            },
          },
        };

        setAnalyticsData(combinedData);
        setLastUpdated(new Date());
        lastFetchRef.current = Date.now();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load analytics data";
        setError(message);
        if (!analyticsData) {
          setAnalyticsData(null);
        }
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = request;
    return request;
  }, [analyticsData]);

  useEffect(() => {
    if (initialisedRef.current) {
      return;
    }
    initialisedRef.current = true;
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({ analyticsData, loading, error, lastUpdated, fetchAnalytics }),
    [analyticsData, loading, error, lastUpdated, fetchAnalytics],
  );

  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
